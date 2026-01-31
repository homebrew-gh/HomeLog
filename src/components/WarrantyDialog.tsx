import { useState, useEffect, useMemo, useRef } from 'react';
import { format, parse, addWeeks, addMonths, addYears, isValid } from 'date-fns';
import { Plus, X, AlertTriangle, Building, Package, Car, Home, Tag, Upload, FileText, Image, AlertCircle, Trash2, MoreVertical, Infinity as InfinityIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { DateInput } from '@/components/ui/date-input';
import { useWarrantyActions } from '@/hooks/useWarranties';
import { useWarrantyTypes } from '@/hooks/useWarrantyTypes';
import { useAppliances } from '@/hooks/useAppliances';
import { useVehicles } from '@/hooks/useVehicles';
import { useCompanies } from '@/hooks/useCompanies';
import { useCustomHomeFeatures } from '@/hooks/useCustomHomeFeatures';
import { useUploadFile, useDeleteFile, NoPrivateServerError, useCanUploadFiles } from '@/hooks/useUploadFile';
import { toast } from '@/hooks/useToast';
import { WARRANTY_LENGTH_UNITS, type Warranty, type WarrantyLinkedType, type WarrantyDocument, type WarrantyLengthUnit } from '@/lib/types';

// Get today's date in MM/DD/YYYY format
function getTodayFormatted(): string {
  return format(new Date(), 'MM/dd/yyyy');
}

// Parse MM/DD/YYYY to Date object
function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  const parsed = parse(dateStr, 'MM/dd/yyyy', new Date());
  if (!isValid(parsed)) {
    // Try flexible format
    const parsedFlex = parse(dateStr, 'M/d/yyyy', new Date());
    if (isValid(parsedFlex)) return parsedFlex;
    return null;
  }
  return parsed;
}

// Calculate warranty end date from purchase date and warranty length
function calculateWarrantyEndDate(
  purchaseDate: string,
  lengthValue: number | undefined,
  lengthUnit: WarrantyLengthUnit | undefined
): string | undefined {
  if (!purchaseDate || !lengthValue || !lengthUnit) return undefined;
  
  const startDate = parseDate(purchaseDate);
  if (!startDate) return undefined;
  
  let endDate: Date;
  switch (lengthUnit) {
    case 'weeks':
      endDate = addWeeks(startDate, lengthValue);
      break;
    case 'months':
      endDate = addMonths(startDate, lengthValue);
      break;
    case 'years':
      endDate = addYears(startDate, lengthValue);
      break;
    default:
      return undefined;
  }
  
  return format(endDate, 'MM/dd/yyyy');
}

interface WarrantyDialogProps {
  isOpen: boolean;
  onClose: () => void;
  warranty?: Warranty; // If provided, we're editing
}

export function WarrantyDialog({ isOpen, onClose, warranty }: WarrantyDialogProps) {
  const { createWarranty, updateWarranty } = useWarrantyActions();
  const { allWarrantyTypes, addCustomWarrantyType } = useWarrantyTypes();
  const { data: appliances = [] } = useAppliances();
  const { data: vehicles = [] } = useVehicles();
  const { data: companies = [] } = useCompanies();
  const { allHomeFeatures, addCustomHomeFeature } = useCustomHomeFeatures();
  const { mutateAsync: uploadFile, isPending: isUploading } = useUploadFile();
  const { mutateAsync: deleteFile, isPending: isDeleting } = useDeleteFile();
  const canUploadFiles = useCanUploadFiles();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAddType, setShowAddType] = useState(false);
  const [newType, setNewType] = useState('');
  const [companySearchOpen, setCompanySearchOpen] = useState(false);
  const [companySearch, setCompanySearch] = useState('');
  const [linkedItemSearchOpen, setLinkedItemSearchOpen] = useState(false);
  const [linkedItemSearch, setLinkedItemSearch] = useState('');
  const [showAddHomeFeature, setShowAddHomeFeature] = useState(false);
  const [newHomeFeature, setNewHomeFeature] = useState('');
  
  // Collapsible sections state
  const [registrationOpen, setRegistrationOpen] = useState(false);
  const [extendedWarrantyOpen, setExtendedWarrantyOpen] = useState(false);
  const [documentsOpen, setDocumentsOpen] = useState(false);

  // File input refs
  const receiptInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name: '',
    warrantyType: '',
    description: '',
    purchaseDate: '',
    purchasePrice: '',
    warrantyStartDate: '',
    warrantyLengthValue: '' as string,
    warrantyLengthUnit: 'years' as WarrantyLengthUnit,
    isLifetime: false,
    linkedType: '' as WarrantyLinkedType | '',
    linkedItemId: '',
    linkedItemName: '',
    companyId: '',
    companyName: '',
    isRegistered: false,
    registrationDate: '',
    registrationNumber: '',
    registrationNotes: '',
    hasExtendedWarranty: false,
    extendedWarrantyProvider: '',
    extendedWarrantyEndDate: '',
    extendedWarrantyCost: '',
    extendedWarrantyNotes: '',
    documents: [] as WarrantyDocument[],
    receiptUrl: '',
    notes: '',
  });

  const isEditing = !!warranty;

  // Reset form when dialog opens
  useEffect(() => {
    if (isOpen) {
      if (warranty) {
        setFormData({
          name: warranty.name,
          warrantyType: warranty.warrantyType,
          description: warranty.description || '',
          purchaseDate: warranty.purchaseDate || '',
          purchasePrice: warranty.purchasePrice || '',
          warrantyStartDate: warranty.warrantyStartDate || '',
          warrantyLengthValue: warranty.warrantyLengthValue?.toString() || '',
          warrantyLengthUnit: warranty.warrantyLengthUnit || 'years',
          isLifetime: warranty.isLifetime || false,
          linkedType: warranty.linkedType || '',
          linkedItemId: warranty.linkedItemId || '',
          linkedItemName: warranty.linkedItemName || '',
          companyId: warranty.companyId || '',
          companyName: warranty.companyName || '',
          isRegistered: warranty.isRegistered || false,
          registrationDate: warranty.registrationDate || '',
          registrationNumber: warranty.registrationNumber || '',
          registrationNotes: warranty.registrationNotes || '',
          hasExtendedWarranty: warranty.hasExtendedWarranty || false,
          extendedWarrantyProvider: warranty.extendedWarrantyProvider || '',
          extendedWarrantyEndDate: warranty.extendedWarrantyEndDate || '',
          extendedWarrantyCost: warranty.extendedWarrantyCost || '',
          extendedWarrantyNotes: warranty.extendedWarrantyNotes || '',
          documents: warranty.documents || [],
          receiptUrl: warranty.receiptUrl || '',
          notes: warranty.notes || '',
        });
        // Open sections that have data
        setRegistrationOpen(!!warranty.isRegistered);
        setExtendedWarrantyOpen(!!warranty.hasExtendedWarranty);
        setDocumentsOpen((warranty.documents?.length || 0) > 0 || !!warranty.receiptUrl);
      } else {
        setFormData({
          name: '',
          warrantyType: '',
          description: '',
          purchaseDate: '',
          purchasePrice: '',
          warrantyStartDate: '',
          warrantyLengthValue: '',
          warrantyLengthUnit: 'years',
          isLifetime: false,
          linkedType: '',
          linkedItemId: '',
          linkedItemName: '',
          companyId: '',
          companyName: '',
          isRegistered: false,
          registrationDate: '',
          registrationNumber: '',
          registrationNotes: '',
          hasExtendedWarranty: false,
          extendedWarrantyProvider: '',
          extendedWarrantyEndDate: '',
          extendedWarrantyCost: '',
          extendedWarrantyNotes: '',
          documents: [],
          receiptUrl: '',
          notes: '',
        });
        setRegistrationOpen(false);
        setExtendedWarrantyOpen(false);
        setDocumentsOpen(false);
      }
      setShowAddType(false);
      setNewType('');
      setCompanySearch('');
      setLinkedItemSearch('');
      setShowAddHomeFeature(false);
      setNewHomeFeature('');
    }
  }, [isOpen, warranty]);

  // Filter companies for search
  const filteredCompanies = useMemo(() => {
    if (!companySearch) return companies;
    const search = companySearch.toLowerCase();
    return companies.filter(c => 
      c.name.toLowerCase().includes(search) ||
      c.serviceType.toLowerCase().includes(search)
    );
  }, [companies, companySearch]);

  // Get selected company name for display
  const selectedCompanyName = useMemo(() => {
    if (formData.companyId) {
      const company = companies.find(c => c.id === formData.companyId);
      return company?.name || '';
    }
    return formData.companyName;
  }, [formData.companyId, formData.companyName, companies]);

  // Filter linked items based on linked type
  const filteredLinkedItems = useMemo(() => {
    const search = linkedItemSearch.toLowerCase();
    
    if (formData.linkedType === 'appliance') {
      return appliances.filter(a => 
        a.model.toLowerCase().includes(search) ||
        (a.manufacturer && a.manufacturer.toLowerCase().includes(search))
      );
    }
    
    if (formData.linkedType === 'vehicle') {
      return vehicles.filter(v => 
        v.name.toLowerCase().includes(search) ||
        (v.make && v.make.toLowerCase().includes(search)) ||
        (v.model && v.model.toLowerCase().includes(search))
      );
    }
    
    if (formData.linkedType === 'home_feature') {
      return allHomeFeatures.filter(f => f.toLowerCase().includes(search));
    }
    
    return [];
  }, [linkedItemSearch, formData.linkedType, appliances, vehicles, allHomeFeatures]);

  // Get selected linked item name for display
  const selectedLinkedItemName = useMemo(() => {
    if (formData.linkedType === 'appliance' && formData.linkedItemId) {
      const appliance = appliances.find(a => a.id === formData.linkedItemId);
      return appliance?.model || '';
    }
    if (formData.linkedType === 'vehicle' && formData.linkedItemId) {
      const vehicle = vehicles.find(v => v.id === formData.linkedItemId);
      return vehicle?.name || '';
    }
    if (formData.linkedType === 'home_feature') {
      return formData.linkedItemName || '';
    }
    if (formData.linkedType === 'custom') {
      return formData.linkedItemName || '';
    }
    return '';
  }, [formData.linkedType, formData.linkedItemId, formData.linkedItemName, appliances, vehicles]);

  const handleAddType = () => {
    if (newType.trim()) {
      addCustomWarrantyType(newType.trim());
      setFormData(prev => ({ ...prev, warrantyType: newType.trim() }));
      setNewType('');
      setShowAddType(false);
    }
  };

  const handleSelectCompany = (companyId: string) => {
    const company = companies.find(c => c.id === companyId);
    if (company) {
      setFormData(prev => ({
        ...prev,
        companyId: company.id,
        companyName: '',
      }));
    }
    setCompanySearchOpen(false);
    setCompanySearch('');
  };

  const handleManualCompanyName = (name: string) => {
    setFormData(prev => ({
      ...prev,
      companyId: '',
      companyName: name,
    }));
    setCompanySearchOpen(false);
    setCompanySearch('');
  };

  const handleClearCompany = () => {
    setFormData(prev => ({
      ...prev,
      companyId: '',
      companyName: '',
    }));
  };

  const handleSelectLinkedItem = (id: string, name: string) => {
    setFormData(prev => ({
      ...prev,
      linkedItemId: id,
      linkedItemName: name,
    }));
    setLinkedItemSearchOpen(false);
    setLinkedItemSearch('');
  };

  const handleSelectHomeFeature = (feature: string) => {
    setFormData(prev => ({
      ...prev,
      linkedItemId: '',
      linkedItemName: feature,
    }));
    setLinkedItemSearchOpen(false);
    setLinkedItemSearch('');
  };

  const handleAddHomeFeature = () => {
    if (newHomeFeature.trim()) {
      addCustomHomeFeature(newHomeFeature.trim());
      setFormData(prev => ({
        ...prev,
        linkedItemId: '',
        linkedItemName: newHomeFeature.trim(),
      }));
      setNewHomeFeature('');
      setShowAddHomeFeature(false);
      setLinkedItemSearchOpen(false);
    }
  };

  const _handleManualLinkedItemName = (name: string) => {
    setFormData(prev => ({
      ...prev,
      linkedItemId: '',
      linkedItemName: name,
    }));
    setLinkedItemSearchOpen(false);
    setLinkedItemSearch('');
  };

  const handleClearLinkedItem = () => {
    setFormData(prev => ({
      ...prev,
      linkedItemId: '',
      linkedItemName: '',
    }));
  };

  const handleLinkedTypeChange = (type: string) => {
    setFormData(prev => ({
      ...prev,
      linkedType: type as WarrantyLinkedType | '',
      linkedItemId: '',
      linkedItemName: '',
    }));
    setLinkedItemSearch('');
  };

  const handleFileUpload = async (file: File, type: 'receipt' | 'document') => {
    try {
      const tags = await uploadFile(file);
      const url = tags[0]?.[1];
      if (url) {
        if (type === 'receipt') {
          setFormData(prev => ({ ...prev, receiptUrl: url }));
        } else {
          const newDoc: WarrantyDocument = {
            url,
            name: file.name,
            uploadedAt: getTodayFormatted(),
          };
          setFormData(prev => ({
            ...prev,
            documents: [...prev.documents, newDoc],
          }));
        }
        toast({
          title: 'File uploaded',
          description: `${type === 'receipt' ? 'Receipt' : 'Document'} uploaded successfully.`,
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

  const handleDocumentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file, 'document');
    e.target.value = '';
  };

  const handleRemoveReceipt = async (deleteFromServer: boolean = false) => {
    const url = formData.receiptUrl;
    setFormData(prev => ({ ...prev, receiptUrl: '' }));

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

  const handleRemoveDocument = async (index: number, deleteFromServer: boolean = false) => {
    const doc = formData.documents[index];
    setFormData(prev => ({
      ...prev,
      documents: prev.documents.filter((_, i) => i !== index),
    }));

    if (deleteFromServer && doc?.url) {
      try {
        await deleteFile(doc.url);
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

  // Check if an item is linked (either via selection or custom name in linked item)
  const hasLinkedItem = useMemo(() => {
    if (formData.linkedType === 'appliance' && formData.linkedItemId) return true;
    if (formData.linkedType === 'vehicle' && formData.linkedItemId) return true;
    if (formData.linkedType === 'home_feature' && formData.linkedItemName) return true;
    return false;
  }, [formData.linkedType, formData.linkedItemId, formData.linkedItemName]);

  const handleSubmit = async () => {
    if (!formData.warrantyType) {
      toast({
        title: 'Type required',
        description: 'Please select a warranty type.',
        variant: 'destructive',
      });
      return;
    }

    // Must have either a linked item OR a custom product name
    if (!hasLinkedItem && !formData.name.trim()) {
      toast({
        title: 'Item required',
        description: 'Please select an existing item (appliance, vehicle, or home feature) OR enter a custom product/item name.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Use the linked item name as warranty name if no custom name provided
      const warrantyName = formData.name.trim() || selectedLinkedItemName || '';
      
      // Parse warranty length
      const lengthValue = formData.warrantyLengthValue ? parseInt(formData.warrantyLengthValue, 10) : undefined;
      const lengthUnit = formData.warrantyLengthUnit;
      
      // Calculate end date from purchase date + warranty length (unless lifetime)
      const calculatedEndDate = formData.isLifetime
        ? undefined
        : calculateWarrantyEndDate(formData.purchaseDate, lengthValue, lengthUnit);
      
      const submitData = {
        name: warrantyName,
        warrantyType: formData.warrantyType,
        description: formData.description.trim() || undefined,
        purchaseDate: formData.purchaseDate.trim() || undefined,
        purchasePrice: formData.purchasePrice.trim() || undefined,
        warrantyStartDate: formData.warrantyStartDate.trim() || formData.purchaseDate.trim() || undefined,
        warrantyEndDate: calculatedEndDate,
        warrantyLengthValue: lengthValue,
        warrantyLengthUnit: lengthValue ? lengthUnit : undefined,
        isLifetime: formData.isLifetime || undefined,
        linkedType: formData.linkedType || undefined,
        linkedItemId: formData.linkedItemId || undefined,
        linkedItemName: formData.linkedItemName.trim() || undefined,
        companyId: formData.companyId || undefined,
        companyName: formData.companyName.trim() || undefined,
        isRegistered: formData.isRegistered || undefined,
        registrationDate: formData.registrationDate.trim() || undefined,
        registrationNumber: formData.registrationNumber.trim() || undefined,
        registrationNotes: formData.registrationNotes.trim() || undefined,
        hasExtendedWarranty: formData.hasExtendedWarranty || undefined,
        extendedWarrantyProvider: formData.extendedWarrantyProvider.trim() || undefined,
        extendedWarrantyEndDate: formData.extendedWarrantyEndDate.trim() || undefined,
        extendedWarrantyCost: formData.extendedWarrantyCost.trim() || undefined,
        extendedWarrantyNotes: formData.extendedWarrantyNotes.trim() || undefined,
        documents: formData.documents.length > 0 ? formData.documents : undefined,
        receiptUrl: formData.receiptUrl.trim() || undefined,
        notes: formData.notes.trim() || undefined,
      };

      if (isEditing && warranty) {
        await updateWarranty(warranty.id, submitData);
        toast({
          title: 'Warranty updated',
          description: 'Your warranty has been updated successfully.',
        });
      } else {
        await createWarranty(submitData);
        toast({
          title: 'Warranty added',
          description: 'Your warranty has been added successfully.',
        });
      }
      onClose();
    } catch {
      toast({
        title: 'Error',
        description: `Failed to ${isEditing ? 'update' : 'add'} warranty. Please try again.`,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getLinkedTypeIcon = () => {
    switch (formData.linkedType) {
      case 'appliance': return <Package className="h-4 w-4 text-muted-foreground" />;
      case 'vehicle': return <Car className="h-4 w-4 text-muted-foreground" />;
      case 'home_feature': return <Home className="h-4 w-4 text-muted-foreground" />;
      case 'custom': return <Tag className="h-4 w-4 text-muted-foreground" />;
      default: return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] sm:max-w-lg max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Warranty' : 'Add Warranty'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Warranty Type */}
          <div className="space-y-2">
            <Label>Warranty Type *</Label>
            {showAddType ? (
              <div className="flex gap-2">
                <Input
                  value={newType}
                  onChange={(e) => setNewType(e.target.value)}
                  placeholder="Enter custom type"
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
                  value={formData.warrantyType}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, warrantyType: value }))}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select a type" />
                  </SelectTrigger>
                  <SelectContent>
                    {allWarrantyTypes.map((type) => (
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

          {/* Link to Existing Item - PRIMARY OPTION */}
          <div className="space-y-2">
            <Label>Link to Existing Item *</Label>
            <p className="text-xs text-muted-foreground mb-2">
              Select an appliance, vehicle, or home feature to link this warranty to.
            </p>
            <div className="flex gap-2">
              <Select
                value={formData.linkedType}
                onValueChange={handleLinkedTypeChange}
              >
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="appliance">
                    <span className="flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      Appliance
                    </span>
                  </SelectItem>
                  <SelectItem value="vehicle">
                    <span className="flex items-center gap-2">
                      <Car className="h-4 w-4" />
                      Vehicle
                    </span>
                  </SelectItem>
                  <SelectItem value="home_feature">
                    <span className="flex items-center gap-2">
                      <Home className="h-4 w-4" />
                      Home Feature
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>

              {formData.linkedType && (
                <Popover open={linkedItemSearchOpen} onOpenChange={setLinkedItemSearchOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={linkedItemSearchOpen}
                      className="flex-1 justify-between font-normal"
                    >
                      {selectedLinkedItemName ? (
                        <span className="flex items-center gap-2">
                          {getLinkedTypeIcon()}
                          {selectedLinkedItemName}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">
                          Select {formData.linkedType === 'appliance' ? 'an appliance' : formData.linkedType === 'vehicle' ? 'a vehicle' : 'a home feature'}
                        </span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0" align="start">
                    <Command>
                      <CommandInput 
                        placeholder={`Search ${formData.linkedType === 'home_feature' ? 'home features' : formData.linkedType + 's'}...`}
                        value={linkedItemSearch}
                        onValueChange={setLinkedItemSearch}
                      />
                      <CommandList>
                        <CommandEmpty>
                          {linkedItemSearch ? (
                            formData.linkedType === 'home_feature' ? (
                              showAddHomeFeature ? (
                                <div className="p-2 space-y-2">
                                  <Input
                                    value={newHomeFeature}
                                    onChange={(e) => setNewHomeFeature(e.target.value)}
                                    placeholder="Enter home feature name"
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleAddHomeFeature();
                                      }
                                    }}
                                  />
                                  <div className="flex gap-2">
                                    <Button size="sm" onClick={handleAddHomeFeature}>Add</Button>
                                    <Button size="sm" variant="ghost" onClick={() => setShowAddHomeFeature(false)}>Cancel</Button>
                                  </div>
                                </div>
                              ) : (
                                <div className="p-2 space-y-2">
                                  <button
                                    onClick={() => handleSelectHomeFeature(linkedItemSearch)}
                                    className="w-full p-2 text-left hover:bg-accent rounded-sm"
                                  >
                                    Use "{linkedItemSearch}"
                                  </button>
                                  <button
                                    onClick={() => {
                                      setNewHomeFeature(linkedItemSearch);
                                      setShowAddHomeFeature(true);
                                    }}
                                    className="w-full p-2 text-left hover:bg-accent rounded-sm text-sm text-muted-foreground"
                                  >
                                    <Plus className="h-3 w-3 inline mr-1" />
                                    Add "{linkedItemSearch}" as new home feature
                                  </button>
                                </div>
                              )
                            ) : (
                              `No ${formData.linkedType}s found`
                            )
                          ) : (
                            `No ${formData.linkedType}s available`
                          )}
                        </CommandEmpty>
                        {formData.linkedType === 'appliance' && filteredLinkedItems.length > 0 && (
                          <CommandGroup heading="Appliances">
                            {(filteredLinkedItems as typeof appliances).map((item) => (
                              <CommandItem
                                key={item.id}
                                value={item.model}
                                onSelect={() => handleSelectLinkedItem(item.id, item.model)}
                              >
                                <Package className="h-4 w-4 mr-2 text-muted-foreground" />
                                <div className="flex flex-col">
                                  <span>{item.model}</span>
                                  {item.manufacturer && (
                                    <span className="text-xs text-muted-foreground">{item.manufacturer}</span>
                                  )}
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        )}
                        {formData.linkedType === 'vehicle' && filteredLinkedItems.length > 0 && (
                          <CommandGroup heading="Vehicles">
                            {(filteredLinkedItems as typeof vehicles).map((item) => (
                              <CommandItem
                                key={item.id}
                                value={item.name}
                                onSelect={() => handleSelectLinkedItem(item.id, item.name)}
                              >
                                <Car className="h-4 w-4 mr-2 text-muted-foreground" />
                                <div className="flex flex-col">
                                  <span>{item.name}</span>
                                  {(item.make || item.model) && (
                                    <span className="text-xs text-muted-foreground">
                                      {[item.make, item.model].filter(Boolean).join(' ')}
                                    </span>
                                  )}
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        )}
                        {formData.linkedType === 'home_feature' && (filteredLinkedItems as string[]).length > 0 && (
                          <CommandGroup heading="Home Features">
                            {(filteredLinkedItems as string[]).map((feature) => (
                              <CommandItem
                                key={feature}
                                value={feature}
                                onSelect={() => handleSelectHomeFeature(feature)}
                              >
                                <Home className="h-4 w-4 mr-2 text-muted-foreground" />
                                <span>{feature}</span>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        )}
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              )}
            </div>
            {selectedLinkedItemName && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground"
                onClick={handleClearLinkedItem}
              >
                <X className="h-3 w-3 mr-1" />
                Clear linked item
              </Button>
            )}
          </div>

          {/* OR Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or enter custom item
              </span>
            </div>
          </div>

          {/* Custom Product/Item Name - SECONDARY OPTION */}
          <div className="space-y-2">
            <Label htmlFor="name">
              Custom Product/Item Name {hasLinkedItem ? '(optional)' : '*'}
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder={hasLinkedItem ? 'Override name (optional)' : 'e.g., Samsung Refrigerator, DeWalt Drill'}
              disabled={false}
            />
            {!hasLinkedItem && (
              <p className="text-xs text-muted-foreground">
                Required if no existing item is selected above.
              </p>
            )}
            {hasLinkedItem && formData.name.trim() && (
              <p className="text-xs text-muted-foreground">
                This will be used instead of the linked item's name.
              </p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Optional details about the product"
            />
          </div>

          {/* Purchase Date */}
          <DateInput
            id="purchaseDate"
            label="Purchase Date"
            value={formData.purchaseDate}
            onChange={(value) => setFormData(prev => ({ ...prev, purchaseDate: value }))}
            showTodayCheckbox
          />

          {/* Purchase Price */}
          <div className="space-y-2">
            <Label htmlFor="purchasePrice">Purchase Price</Label>
            <Input
              id="purchasePrice"
              value={formData.purchasePrice}
              onChange={(e) => setFormData(prev => ({ ...prev, purchasePrice: e.target.value }))}
              placeholder="e.g., $299.99"
            />
          </div>

          {/* Warranty Length */}
          <div className="space-y-3">
            <Label>Warranty Length</Label>
            <div className="flex gap-2">
              <Input
                id="warrantyLengthValue"
                type="number"
                min="1"
                value={formData.warrantyLengthValue}
                onChange={(e) => setFormData(prev => ({ ...prev, warrantyLengthValue: e.target.value }))}
                placeholder="e.g., 2"
                disabled={formData.isLifetime}
                className={`w-24 ${formData.isLifetime ? 'opacity-50' : ''}`}
              />
              <Select
                value={formData.warrantyLengthUnit}
                onValueChange={(value) => setFormData(prev => ({ ...prev, warrantyLengthUnit: value as WarrantyLengthUnit }))}
                disabled={formData.isLifetime}
              >
                <SelectTrigger className={`flex-1 ${formData.isLifetime ? 'opacity-50' : ''}`}>
                  <SelectValue placeholder="Select unit" />
                </SelectTrigger>
                <SelectContent>
                  {WARRANTY_LENGTH_UNITS.map(({ value, label }) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isLifetime"
                checked={formData.isLifetime}
                onCheckedChange={(checked) => {
                  setFormData(prev => ({
                    ...prev,
                    isLifetime: checked === true,
                    warrantyLengthValue: checked ? '' : prev.warrantyLengthValue,
                  }));
                }}
              />
              <Label
                htmlFor="isLifetime"
                className="text-sm font-normal cursor-pointer flex items-center gap-1.5"
              >
                <InfinityIcon className="h-4 w-4" />
                Lifetime Warranty
              </Label>
            </div>
            {/* Calculated End Date Preview */}
            {!formData.isLifetime && formData.purchaseDate && formData.warrantyLengthValue && (
              <div className="text-sm text-muted-foreground bg-muted/50 p-2 rounded-md">
                <span className="font-medium">Warranty expires: </span>
                {calculateWarrantyEndDate(
                  formData.purchaseDate,
                  parseInt(formData.warrantyLengthValue, 10),
                  formData.warrantyLengthUnit
                ) || 'Unable to calculate'}
              </div>
            )}
            {formData.isLifetime && (
              <div className="text-sm text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30 p-2 rounded-md flex items-center gap-1.5">
                <InfinityIcon className="h-4 w-4" />
                This warranty never expires
              </div>
            )}
          </div>

          {/* Company/Manufacturer */}
          <div className="space-y-2">
            <Label>Company/Manufacturer</Label>
            <Popover open={companySearchOpen} onOpenChange={setCompanySearchOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={companySearchOpen}
                  className="w-full justify-between font-normal"
                >
                  {selectedCompanyName ? (
                    <span className="flex items-center gap-2">
                      <Building className="h-4 w-4 text-muted-foreground" />
                      {selectedCompanyName}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Select or type a company name</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0" align="start">
                <Command>
                  <CommandInput 
                    placeholder="Search companies or type a name..." 
                    value={companySearch}
                    onValueChange={setCompanySearch}
                  />
                  <CommandList>
                    <CommandEmpty>
                      {companySearch ? (
                        <button
                          onClick={() => handleManualCompanyName(companySearch)}
                          className="w-full p-2 text-left hover:bg-accent rounded-sm"
                        >
                          Use "{companySearch}" as company name
                        </button>
                      ) : (
                        'No companies found'
                      )}
                    </CommandEmpty>
                    {companySearch && (
                      <CommandGroup heading="Manual Entry">
                        <CommandItem onSelect={() => handleManualCompanyName(companySearch)}>
                          <Plus className="h-4 w-4 mr-2" />
                          Use "{companySearch}"
                        </CommandItem>
                      </CommandGroup>
                    )}
                    {filteredCompanies.length > 0 && (
                      <CommandGroup heading="Your Companies">
                        {filteredCompanies.map((company) => (
                          <CommandItem
                            key={company.id}
                            value={company.name}
                            onSelect={() => handleSelectCompany(company.id)}
                          >
                            <Building className="h-4 w-4 mr-2 text-muted-foreground" />
                            <div className="flex flex-col">
                              <span>{company.name}</span>
                              <span className="text-xs text-muted-foreground">{company.serviceType}</span>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    )}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            {selectedCompanyName && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground"
                onClick={handleClearCompany}
              >
                <X className="h-3 w-3 mr-1" />
                Clear company
              </Button>
            )}
          </div>

          {/* Product Registration Section */}
          <Collapsible open={registrationOpen} onOpenChange={setRegistrationOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between p-2 h-auto">
                <span className="font-medium">Product Registration</span>
                <span className="text-muted-foreground text-xs">
                  {registrationOpen ? 'Hide' : 'Show'}
                </span>
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 pt-2 pl-2 border-l-2 border-muted ml-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isRegistered"
                  checked={formData.isRegistered}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isRegistered: checked === true }))}
                />
                <Label htmlFor="isRegistered" className="font-normal cursor-pointer">
                  Product has been registered with manufacturer
                </Label>
              </div>

              {formData.isRegistered && (
                <>
                  <DateInput
                    id="registrationDate"
                    label="Registration Date"
                    value={formData.registrationDate}
                    onChange={(value) => setFormData(prev => ({ ...prev, registrationDate: value }))}
                    showTodayCheckbox
                  />

                  <div className="space-y-2">
                    <Label htmlFor="registrationNumber">Registration/Confirmation Number</Label>
                    <Input
                      id="registrationNumber"
                      value={formData.registrationNumber}
                      onChange={(e) => setFormData(prev => ({ ...prev, registrationNumber: e.target.value }))}
                      placeholder="Enter registration number"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="registrationNotes">Registration Notes</Label>
                    <Textarea
                      id="registrationNotes"
                      value={formData.registrationNotes}
                      onChange={(e) => setFormData(prev => ({ ...prev, registrationNotes: e.target.value }))}
                      placeholder="Any notes about registration..."
                      rows={2}
                    />
                  </div>
                </>
              )}
            </CollapsibleContent>
          </Collapsible>

          {/* Extended Warranty Section */}
          <Collapsible open={extendedWarrantyOpen} onOpenChange={setExtendedWarrantyOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between p-2 h-auto">
                <span className="font-medium">Extended Warranty</span>
                <span className="text-muted-foreground text-xs">
                  {extendedWarrantyOpen ? 'Hide' : 'Show'}
                </span>
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 pt-2 pl-2 border-l-2 border-muted ml-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="hasExtendedWarranty"
                  checked={formData.hasExtendedWarranty}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, hasExtendedWarranty: checked === true }))}
                />
                <Label htmlFor="hasExtendedWarranty" className="font-normal cursor-pointer">
                  Extended warranty purchased
                </Label>
              </div>

              {formData.hasExtendedWarranty && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="extendedWarrantyProvider">Extended Warranty Provider</Label>
                    <Input
                      id="extendedWarrantyProvider"
                      value={formData.extendedWarrantyProvider}
                      onChange={(e) => setFormData(prev => ({ ...prev, extendedWarrantyProvider: e.target.value }))}
                      placeholder="e.g., SquareTrade, Asurion"
                    />
                  </div>

                  <DateInput
                    id="extendedWarrantyEndDate"
                    label="Extended Warranty End Date"
                    value={formData.extendedWarrantyEndDate}
                    onChange={(value) => setFormData(prev => ({ ...prev, extendedWarrantyEndDate: value }))}
                  />

                  <div className="space-y-2">
                    <Label htmlFor="extendedWarrantyCost">Extended Warranty Cost</Label>
                    <Input
                      id="extendedWarrantyCost"
                      value={formData.extendedWarrantyCost}
                      onChange={(e) => setFormData(prev => ({ ...prev, extendedWarrantyCost: e.target.value }))}
                      placeholder="e.g., $49.99"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="extendedWarrantyNotes">Extended Warranty Notes</Label>
                    <Textarea
                      id="extendedWarrantyNotes"
                      value={formData.extendedWarrantyNotes}
                      onChange={(e) => setFormData(prev => ({ ...prev, extendedWarrantyNotes: e.target.value }))}
                      placeholder="Coverage details, claim process, etc..."
                      rows={2}
                    />
                  </div>
                </>
              )}
            </CollapsibleContent>
          </Collapsible>

          {/* Documents Section */}
          <Collapsible open={documentsOpen} onOpenChange={setDocumentsOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between p-2 h-auto">
                <span className="font-medium">Documents</span>
                <span className="text-muted-foreground text-xs">
                  {documentsOpen ? 'Hide' : 'Show'}
                </span>
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 pt-2 pl-2 border-l-2 border-muted ml-2">
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
                        <DropdownMenuItem onClick={() => handleRemoveReceipt(false)}>
                          <X className="h-4 w-4 mr-2" />
                          Remove from warranty
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => handleRemoveReceipt(true)}
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

              {/* Warranty Documents Upload */}
              <div className="space-y-2">
                <Label>Warranty Documents</Label>
                <div className="flex gap-2 items-center">
                  <input
                    type="file"
                    accept="image/*,.pdf,.doc,.docx"
                    className="hidden"
                    ref={documentInputRef}
                    onChange={handleDocumentUpload}
                  />
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span>
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
                        : 'Upload warranty document'
                      }
                    </TooltipContent>
                  </Tooltip>
                </div>
                {formData.documents.length > 0 && (
                  <div className="space-y-2">
                    {formData.documents.map((doc, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 p-2 rounded">
                        <FileText className="h-4 w-4 shrink-0" />
                        <span className="truncate flex-1">{doc.name || doc.url}</span>
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
                              Remove from warranty
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
            </CollapsibleContent>
          </Collapsible>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Additional notes about this warranty..."
              rows={3}
            />
            <Alert className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/50">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-xs text-amber-800 dark:text-amber-200">
                <strong>Security Warning:</strong> Do not store login credentials, passwords, or payment information here. Use a dedicated password manager to securely store sensitive account details.
              </AlertDescription>
            </Alert>
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
