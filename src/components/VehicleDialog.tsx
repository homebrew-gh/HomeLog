import { useState, useEffect, useRef } from 'react';
import { Plus, Upload, X, FileText, Image, ChevronDown, ChevronUp, AlertCircle, Trash2, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { useVehicleActions } from '@/hooks/useVehicles';
import { useVehicleTypes } from '@/hooks/useVehicleTypes';
import { useUploadFile, useDeleteFile, NoPrivateServerError, useCanUploadFiles } from '@/hooks/useUploadFile';
import { toast } from '@/hooks/useToast';
import { FUEL_TYPES, type Vehicle } from '@/lib/types';

// Get today's date in MM/DD/YYYY format
function getTodayFormatted(): string {
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const year = today.getFullYear();
  return `${month}/${day}/${year}`;
}

interface VehicleDialogProps {
  isOpen: boolean;
  onClose: () => void;
  vehicle?: Vehicle; // If provided, we're editing
}

// Type-specific field configurations
const TYPE_FIELDS: Record<string, string[]> = {
  'Personal Vehicle': ['make', 'model', 'year', 'vin', 'licensePlate', 'mileage', 'fuelType', 'registration', 'insurance'],
  'Recreational': ['make', 'model', 'year', 'vin', 'licensePlate', 'mileage', 'fuelType', 'registration', 'insurance'],
  'Farm Machinery': ['make', 'model', 'year', 'serialNumber', 'engineHours', 'fuelType'],
  'Business Vehicle': ['make', 'model', 'year', 'vin', 'licensePlate', 'mileage', 'fuelType', 'registration', 'insurance'],
  'Boat': ['make', 'model', 'year', 'hullId', 'registrationNumber', 'engineHours', 'fuelType', 'registration', 'insurance'],
  'Plane': ['make', 'model', 'year', 'tailNumber', 'hobbsTime', 'fuelType', 'registration', 'insurance'],
};

// Default fields for custom types
const DEFAULT_FIELDS = ['make', 'model', 'year', 'serialNumber', 'fuelType'];

export function VehicleDialog({ isOpen, onClose, vehicle }: VehicleDialogProps) {
  const { createVehicle, updateVehicle } = useVehicleActions();
  const { allVehicleTypes, addCustomVehicleType } = useVehicleTypes();
  const { mutateAsync: uploadFile, isPending: isUploading } = useUploadFile();
  const { mutateAsync: deleteFile, isPending: isDeleting } = useDeleteFile();
  const canUploadFiles = useCanUploadFiles();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAddType, setShowAddType] = useState(false);
  const [newType, setNewType] = useState('');
  const [useTodayDate, setUseTodayDate] = useState(false);
  const [showInsurance, setShowInsurance] = useState(false);
  const [showWarranty, setShowWarranty] = useState(false);

  const [formData, setFormData] = useState({
    vehicleType: '',
    name: '',
    make: '',
    model: '',
    year: '',
    purchaseDate: '',
    purchasePrice: '',
    vin: '',
    licensePlate: '',
    mileage: '',
    fuelType: '',
    registrationExpiry: '',
    insuranceProvider: '',
    insurancePolicyNumber: '',
    insuranceExpiry: '',
    hullId: '',
    registrationNumber: '',
    engineHours: '',
    tailNumber: '',
    hobbsTime: '',
    serialNumber: '',
    receiptUrl: '',
    warrantyUrl: '',
    warrantyExpiry: '',
    documentsUrls: [] as string[],
    notes: '',
  });

  const receiptInputRef = useRef<HTMLInputElement>(null);
  const warrantyInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);

  const isEditing = !!vehicle;

  // Get fields to show based on vehicle type
  const getVisibleFields = () => {
    if (!formData.vehicleType) return [];
    return TYPE_FIELDS[formData.vehicleType] || DEFAULT_FIELDS;
  };

  const visibleFields = getVisibleFields();

  // Reset form when dialog opens
  useEffect(() => {
    if (isOpen) {
      if (vehicle) {
        setFormData({
          vehicleType: vehicle.vehicleType,
          name: vehicle.name,
          make: vehicle.make || '',
          model: vehicle.model || '',
          year: vehicle.year || '',
          purchaseDate: vehicle.purchaseDate || '',
          purchasePrice: vehicle.purchasePrice || '',
          vin: vehicle.vin || '',
          licensePlate: vehicle.licensePlate || '',
          mileage: vehicle.mileage || '',
          fuelType: vehicle.fuelType || '',
          registrationExpiry: vehicle.registrationExpiry || '',
          insuranceProvider: vehicle.insuranceProvider || '',
          insurancePolicyNumber: vehicle.insurancePolicyNumber || '',
          insuranceExpiry: vehicle.insuranceExpiry || '',
          hullId: vehicle.hullId || '',
          registrationNumber: vehicle.registrationNumber || '',
          engineHours: vehicle.engineHours || '',
          tailNumber: vehicle.tailNumber || '',
          hobbsTime: vehicle.hobbsTime || '',
          serialNumber: vehicle.serialNumber || '',
          receiptUrl: vehicle.receiptUrl || '',
          warrantyUrl: vehicle.warrantyUrl || '',
          warrantyExpiry: vehicle.warrantyExpiry || '',
          documentsUrls: vehicle.documentsUrls || [],
          notes: vehicle.notes || '',
        });
        setShowInsurance(!!(vehicle.insuranceProvider || vehicle.insurancePolicyNumber || vehicle.insuranceExpiry));
        setShowWarranty(!!(vehicle.warrantyUrl || vehicle.warrantyExpiry));
      } else {
        setFormData({
          vehicleType: '',
          name: '',
          make: '',
          model: '',
          year: '',
          purchaseDate: '',
          purchasePrice: '',
          vin: '',
          licensePlate: '',
          mileage: '',
          fuelType: '',
          registrationExpiry: '',
          insuranceProvider: '',
          insurancePolicyNumber: '',
          insuranceExpiry: '',
          hullId: '',
          registrationNumber: '',
          engineHours: '',
          tailNumber: '',
          hobbsTime: '',
          serialNumber: '',
          receiptUrl: '',
          warrantyUrl: '',
          warrantyExpiry: '',
          documentsUrls: [],
          notes: '',
        });
        setShowInsurance(false);
        setShowWarranty(false);
      }
      setShowAddType(false);
      setNewType('');
      setUseTodayDate(false);
    }
  }, [isOpen, vehicle]);

  const handleFileUpload = async (file: File, type: 'receipt' | 'warranty' | 'document') => {
    try {
      const tags = await uploadFile(file);
      const url = tags[0]?.[1];
      if (url) {
        if (type === 'document') {
          setFormData(prev => ({
            ...prev,
            documentsUrls: [...prev.documentsUrls, url],
          }));
        } else {
          setFormData(prev => ({
            ...prev,
            [type === 'receipt' ? 'receiptUrl' : 'warrantyUrl']: url,
          }));
        }
        toast({
          title: 'File uploaded',
          description: `${type.charAt(0).toUpperCase() + type.slice(1)} uploaded successfully.`,
        });
      }
    } catch (error) {
      console.error('File upload error:', error);
      
      if (error instanceof NoPrivateServerError) {
        toast({
          title: 'No private server configured',
          description: 'Please configure a private media server in Settings > Server Settings > Media before uploading sensitive files.',
          variant: 'destructive',
        });
      } else {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        toast({
          title: 'Upload failed',
          description: errorMessage,
          variant: 'destructive',
        });
      }
    }
  };

  const handleReceiptUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file, 'receipt');
    e.target.value = '';
  };

  const handleWarrantyUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file, 'warranty');
    e.target.value = '';
  };

  const handleDocumentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file, 'document');
    e.target.value = '';
  };

  const handleRemoveDocument = (index: number, deleteFromServer: boolean = false) => {
    const url = formData.documentsUrls[index];
    
    setFormData(prev => ({
      ...prev,
      documentsUrls: prev.documentsUrls.filter((_, i) => i !== index),
    }));

    if (deleteFromServer && url) {
      deleteFile(url)
        .then(() => {
          toast({
            title: 'File deleted',
            description: 'Document has been removed from your media server.',
          });
        })
        .catch((error) => {
          console.error('Failed to delete file from server:', error);
          toast({
            title: 'Could not delete from server',
            description: error instanceof Error ? error.message : 'The file reference was removed but the file may still exist on the server.',
            variant: 'destructive',
          });
        });
    }
  };

  const handleRemoveFile = async (type: 'receipt' | 'warranty', deleteFromServer: boolean = false) => {
    const url = type === 'receipt' ? formData.receiptUrl : formData.warrantyUrl;
    
    // Clear the URL from form data first
    setFormData(prev => ({
      ...prev,
      [type === 'receipt' ? 'receiptUrl' : 'warrantyUrl']: '',
    }));

    // Optionally delete from server
    if (deleteFromServer && url) {
      try {
        await deleteFile(url);
        toast({
          title: 'File deleted',
          description: 'File has been removed from your media server.',
        });
      } catch (error) {
        console.error('Failed to delete file from server:', error);
        toast({
          title: 'Could not delete from server',
          description: error instanceof Error ? error.message : 'The file reference was removed but the file may still exist on the server.',
          variant: 'destructive',
        });
      }
    }
  };

  const handleAddType = () => {
    if (newType.trim()) {
      addCustomVehicleType(newType.trim());
      setFormData(prev => ({ ...prev, vehicleType: newType.trim() }));
      setNewType('');
      setShowAddType(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.vehicleType) {
      toast({
        title: 'Vehicle type required',
        description: 'Please select a vehicle type.',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.name.trim()) {
      toast({
        title: 'Name required',
        description: 'Please enter a vehicle name or description.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEditing && vehicle) {
        await updateVehicle(vehicle.id, formData);
        toast({
          title: 'Vehicle updated',
          description: 'Your vehicle has been updated successfully.',
        });
      } else {
        await createVehicle(formData);
        toast({
          title: 'Vehicle added',
          description: 'Your vehicle has been added successfully.',
        });
      }
      onClose();
    } catch {
      toast({
        title: 'Error',
        description: `Failed to ${isEditing ? 'update' : 'add'} vehicle. Please try again.`,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] sm:max-w-lg max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Vehicle' : 'Add Vehicle'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Vehicle Type Selection */}
          <div className="space-y-2">
            <Label>Vehicle Type *</Label>
            {showAddType ? (
              <div className="flex gap-2">
                <Input
                  value={newType}
                  onChange={(e) => setNewType(e.target.value)}
                  placeholder="Enter custom type name"
                  className="flex-1"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddType();
                    }
                  }}
                />
                <Button type="button" onClick={handleAddType} size="sm">
                  Add
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setShowAddType(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Select
                  value={formData.vehicleType}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, vehicleType: value }))}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select a vehicle type" />
                  </SelectTrigger>
                  <SelectContent>
                    {allVehicleTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button type="button" variant="outline" size="icon" onClick={() => setShowAddType(true)}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          {/* Name/Description */}
          <div className="space-y-2">
            <Label htmlFor="name">Name/Description *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., 2020 Toyota Camry, John Deere Tractor"
            />
          </div>

          {/* Type-specific fields */}
          {formData.vehicleType && (
            <>
              {/* Make/Model/Year row */}
              {(visibleFields.includes('make') || visibleFields.includes('model') || visibleFields.includes('year')) && (
                <div className="grid grid-cols-3 gap-2">
                  {visibleFields.includes('make') && (
                    <div className="space-y-2">
                      <Label htmlFor="make">Make</Label>
                      <Input
                        id="make"
                        value={formData.make}
                        onChange={(e) => setFormData(prev => ({ ...prev, make: e.target.value }))}
                        placeholder="Make"
                      />
                    </div>
                  )}
                  {visibleFields.includes('model') && (
                    <div className="space-y-2">
                      <Label htmlFor="model">Model</Label>
                      <Input
                        id="model"
                        value={formData.model}
                        onChange={(e) => setFormData(prev => ({ ...prev, model: e.target.value }))}
                        placeholder="Model"
                      />
                    </div>
                  )}
                  {visibleFields.includes('year') && (
                    <div className="space-y-2">
                      <Label htmlFor="year">Year</Label>
                      <Input
                        id="year"
                        value={formData.year}
                        onChange={(e) => setFormData(prev => ({ ...prev, year: e.target.value }))}
                        placeholder="Year"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* VIN */}
              {visibleFields.includes('vin') && (
                <div className="space-y-2">
                  <Label htmlFor="vin">VIN</Label>
                  <Input
                    id="vin"
                    value={formData.vin}
                    onChange={(e) => setFormData(prev => ({ ...prev, vin: e.target.value }))}
                    placeholder="Vehicle Identification Number"
                  />
                </div>
              )}

              {/* Serial Number (Farm Machinery) */}
              {visibleFields.includes('serialNumber') && (
                <div className="space-y-2">
                  <Label htmlFor="serialNumber">Serial Number</Label>
                  <Input
                    id="serialNumber"
                    value={formData.serialNumber}
                    onChange={(e) => setFormData(prev => ({ ...prev, serialNumber: e.target.value }))}
                    placeholder="Serial Number"
                  />
                </div>
              )}

              {/* Hull ID (Boats) */}
              {visibleFields.includes('hullId') && (
                <div className="space-y-2">
                  <Label htmlFor="hullId">Hull ID (HIN)</Label>
                  <Input
                    id="hullId"
                    value={formData.hullId}
                    onChange={(e) => setFormData(prev => ({ ...prev, hullId: e.target.value }))}
                    placeholder="Hull Identification Number"
                  />
                </div>
              )}

              {/* Tail Number (Planes) */}
              {visibleFields.includes('tailNumber') && (
                <div className="space-y-2">
                  <Label htmlFor="tailNumber">Tail Number</Label>
                  <Input
                    id="tailNumber"
                    value={formData.tailNumber}
                    onChange={(e) => setFormData(prev => ({ ...prev, tailNumber: e.target.value }))}
                    placeholder="Aircraft Tail Number"
                  />
                </div>
              )}

              {/* License Plate / Registration Number */}
              {(visibleFields.includes('licensePlate') || visibleFields.includes('registrationNumber')) && (
                <div className="space-y-2">
                  <Label htmlFor="licensePlate">
                    {visibleFields.includes('registrationNumber') ? 'Registration Number' : 'License Plate'}
                  </Label>
                  <Input
                    id="licensePlate"
                    value={visibleFields.includes('registrationNumber') ? formData.registrationNumber : formData.licensePlate}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      [visibleFields.includes('registrationNumber') ? 'registrationNumber' : 'licensePlate']: e.target.value
                    }))}
                    placeholder={visibleFields.includes('registrationNumber') ? 'Registration Number' : 'License Plate'}
                  />
                </div>
              )}

              {/* Mileage / Engine Hours / Hobbs Time */}
              {(visibleFields.includes('mileage') || visibleFields.includes('engineHours') || visibleFields.includes('hobbsTime')) && (
                <div className="space-y-2">
                  <Label htmlFor="usage">
                    {visibleFields.includes('hobbsTime') ? 'Hobbs Time' :
                     visibleFields.includes('engineHours') ? 'Engine Hours' : 'Mileage'}
                  </Label>
                  <Input
                    id="usage"
                    value={
                      visibleFields.includes('hobbsTime') ? formData.hobbsTime :
                      visibleFields.includes('engineHours') ? formData.engineHours : formData.mileage
                    }
                    onChange={(e) => {
                      const field = visibleFields.includes('hobbsTime') ? 'hobbsTime' :
                                    visibleFields.includes('engineHours') ? 'engineHours' : 'mileage';
                      setFormData(prev => ({ ...prev, [field]: e.target.value }));
                    }}
                    placeholder={
                      visibleFields.includes('hobbsTime') ? 'Hours' :
                      visibleFields.includes('engineHours') ? 'Hours' : 'Miles'
                    }
                  />
                </div>
              )}

              {/* Fuel Type */}
              {visibleFields.includes('fuelType') && (
                <div className="space-y-2">
                  <Label>Fuel Type</Label>
                  <Select
                    value={formData.fuelType}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, fuelType: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select fuel type" />
                    </SelectTrigger>
                    <SelectContent>
                      {FUEL_TYPES.map(({ value, label }) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Registration Expiry */}
              {visibleFields.includes('registration') && (
                <div className="space-y-2">
                  <Label htmlFor="registrationExpiry">Registration Expiry (MM/DD/YYYY)</Label>
                  <Input
                    id="registrationExpiry"
                    value={formData.registrationExpiry}
                    onChange={(e) => setFormData(prev => ({ ...prev, registrationExpiry: e.target.value }))}
                    placeholder="MM/DD/YYYY"
                  />
                </div>
              )}
            </>
          )}

          {/* Purchase Date */}
          <div className="space-y-2">
            <Label htmlFor="purchaseDate">Purchase Date (MM/DD/YYYY)</Label>
            <Input
              id="purchaseDate"
              value={formData.purchaseDate}
              onChange={(e) => {
                setFormData(prev => ({ ...prev, purchaseDate: e.target.value }));
                if (e.target.value) {
                  setUseTodayDate(false);
                }
              }}
              placeholder="MM/DD/YYYY"
              disabled={useTodayDate}
              className={useTodayDate ? 'opacity-50' : ''}
            />
            <div className="flex items-center space-x-2">
              <Checkbox
                id="useTodayDate"
                checked={useTodayDate}
                onCheckedChange={(checked) => {
                  const isChecked = checked === true;
                  setUseTodayDate(isChecked);
                  if (isChecked) {
                    setFormData(prev => ({ ...prev, purchaseDate: getTodayFormatted() }));
                  }
                }}
              />
              <Label
                htmlFor="useTodayDate"
                className="text-sm font-normal cursor-pointer"
              >
                Today ({getTodayFormatted()})
              </Label>
            </div>
          </div>

          {/* Purchase Price */}
          <div className="space-y-2">
            <Label htmlFor="purchasePrice">Purchase Price</Label>
            <Input
              id="purchasePrice"
              value={formData.purchasePrice}
              onChange={(e) => setFormData(prev => ({ ...prev, purchasePrice: e.target.value }))}
              placeholder="$0.00"
            />
          </div>

          {/* Insurance Section (collapsible) */}
          {visibleFields.includes('insurance') && (
            <Collapsible open={showInsurance} onOpenChange={setShowInsurance}>
              <CollapsibleTrigger className="flex items-center gap-2 w-full p-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors">
                {showInsurance ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                <span className="font-medium">Insurance Information</span>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-4 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="insuranceProvider">Insurance Provider</Label>
                  <Input
                    id="insuranceProvider"
                    value={formData.insuranceProvider}
                    onChange={(e) => setFormData(prev => ({ ...prev, insuranceProvider: e.target.value }))}
                    placeholder="Insurance company name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="insurancePolicyNumber">Policy Number</Label>
                  <Input
                    id="insurancePolicyNumber"
                    value={formData.insurancePolicyNumber}
                    onChange={(e) => setFormData(prev => ({ ...prev, insurancePolicyNumber: e.target.value }))}
                    placeholder="Policy number"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="insuranceExpiry">Insurance Expiry (MM/DD/YYYY)</Label>
                  <Input
                    id="insuranceExpiry"
                    value={formData.insuranceExpiry}
                    onChange={(e) => setFormData(prev => ({ ...prev, insuranceExpiry: e.target.value }))}
                    placeholder="MM/DD/YYYY"
                  />
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Warranty Section (collapsible) */}
          <Collapsible open={showWarranty} onOpenChange={setShowWarranty}>
            <CollapsibleTrigger className="flex items-center gap-2 w-full p-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors">
              {showWarranty ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              <span className="font-medium">Warranty Information</span>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="warrantyExpiry">Warranty Expiry (MM/DD/YYYY)</Label>
                <Input
                  id="warrantyExpiry"
                  value={formData.warrantyExpiry}
                  onChange={(e) => setFormData(prev => ({ ...prev, warrantyExpiry: e.target.value }))}
                  placeholder="MM/DD/YYYY"
                />
              </div>
              <div className="space-y-2">
                <Label>Warranty Document</Label>
                <div className="flex gap-2 items-center">
                  <Input
                    value={formData.warrantyUrl}
                    onChange={(e) => setFormData(prev => ({ ...prev, warrantyUrl: e.target.value }))}
                    placeholder="URL or upload file"
                    className="flex-1"
                  />
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    className="hidden"
                    ref={warrantyInputRef}
                    onChange={handleWarrantyUpload}
                  />
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => warrantyInputRef.current?.click()}
                          disabled={isUploading || !canUploadFiles}
                        >
                          {isUploading ? (
                            <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          ) : !canUploadFiles ? (
                            <AlertCircle className="h-4 w-4 text-amber-500" />
                          ) : (
                            <Upload className="h-4 w-4" />
                          )}
                        </Button>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      {!canUploadFiles 
                        ? 'Configure a private media server in Settings to enable uploads'
                        : 'Upload warranty document'
                      }
                    </TooltipContent>
                  </Tooltip>
                </div>
                {formData.warrantyUrl && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <FileText className="h-4 w-4" />
                    <span className="truncate flex-1">{formData.warrantyUrl}</span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2"
                          disabled={isDeleting}
                        >
                          {isDeleting ? (
                            <div className="h-3 w-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <MoreVertical className="h-3 w-3" />
                          )}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleRemoveFile('warranty', false)}>
                          <X className="h-4 w-4 mr-2" />
                          Remove from vehicle
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => handleRemoveFile('warranty', true)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete from server
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Receipt Upload */}
          <div className="space-y-2">
            <Label>Purchase Receipt</Label>
            <div className="flex gap-2 items-center">
              <Input
                value={formData.receiptUrl}
                onChange={(e) => setFormData(prev => ({ ...prev, receiptUrl: e.target.value }))}
                placeholder="URL or upload file"
                className="flex-1"
              />
              <input
                type="file"
                accept="image/*,.pdf"
                className="hidden"
                ref={receiptInputRef}
                onChange={handleReceiptUpload}
              />
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => receiptInputRef.current?.click()}
                      disabled={isUploading || !canUploadFiles}
                    >
                      {isUploading ? (
                        <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      ) : !canUploadFiles ? (
                        <AlertCircle className="h-4 w-4 text-amber-500" />
                      ) : (
                        <Upload className="h-4 w-4" />
                      )}
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  {!canUploadFiles 
                    ? 'Configure a private media server in Settings to enable uploads'
                    : 'Upload receipt image or PDF'
                  }
                </TooltipContent>
              </Tooltip>
            </div>
            {formData.receiptUrl && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Image className="h-4 w-4" />
                <span className="truncate flex-1">{formData.receiptUrl}</span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2"
                      disabled={isDeleting}
                    >
                      {isDeleting ? (
                        <div className="h-3 w-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <MoreVertical className="h-3 w-3" />
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleRemoveFile('receipt', false)}>
                      <X className="h-4 w-4 mr-2" />
                      Remove from vehicle
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => handleRemoveFile('receipt', true)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete from server
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>

          {/* Documents Upload */}
          <div className="space-y-2">
            <Label>Additional Documents (PDFs)</Label>
            <div className="flex gap-2 items-center">
              <input
                type="file"
                accept=".pdf"
                className="hidden"
                ref={documentInputRef}
                onChange={handleDocumentUpload}
              />
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="w-full">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => documentInputRef.current?.click()}
                      disabled={isUploading || !canUploadFiles}
                      className="w-full"
                    >
                      {isUploading ? (
                        <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                      ) : !canUploadFiles ? (
                        <AlertCircle className="h-4 w-4 text-amber-500 mr-2" />
                      ) : (
                        <Upload className="h-4 w-4 mr-2" />
                      )}
                      Upload Document
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  {!canUploadFiles 
                    ? 'Configure a private media server in Settings to enable uploads'
                    : 'Upload additional PDF documents'
                  }
                </TooltipContent>
              </Tooltip>
            </div>
            {formData.documentsUrls.length > 0 && (
              <div className="space-y-1">
                {formData.documentsUrls.map((url, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 p-2 rounded">
                    <FileText className="h-4 w-4" />
                    <span className="truncate flex-1">Document {index + 1}</span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2"
                          disabled={isDeleting}
                        >
                          {isDeleting ? (
                            <div className="h-3 w-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <MoreVertical className="h-3 w-3" />
                          )}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleRemoveDocument(index, false)}>
                          <X className="h-4 w-4 mr-2" />
                          Remove from vehicle
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => handleRemoveDocument(index, true)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete from server
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Additional notes..."
              rows={3}
            />
          </div>
        </div>

        {/* Action Buttons - Bottom Left */}
        <div className="flex justify-start gap-2 pt-4 border-t">
          <Button onClick={handleSubmit} disabled={isSubmitting || isUploading}>
            {isSubmitting ? 'Saving...' : 'Save'}
          </Button>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Discard
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
