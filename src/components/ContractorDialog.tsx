import { useState, useEffect, useRef } from 'react';
import { Plus, Upload, X, FileText, ChevronDown, ChevronUp, AlertCircle, Trash2, MoreVertical, Star, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { useContractorActions } from '@/hooks/useContractors';
import { useContractorTypes } from '@/hooks/useContractorTypes';
import { useUploadFile, useDeleteFile, NoPrivateServerError, useCanUploadFiles } from '@/hooks/useUploadFile';
import { toast } from '@/hooks/useToast';
import type { Contractor, Invoice } from '@/lib/types';

// Get today's date in MM/DD/YYYY format
function getTodayFormatted(): string {
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const year = today.getFullYear();
  return `${month}/${day}/${year}`;
}

interface ContractorDialogProps {
  isOpen: boolean;
  onClose: () => void;
  contractor?: Contractor; // If provided, we're editing
}

export function ContractorDialog({ isOpen, onClose, contractor }: ContractorDialogProps) {
  const { createContractor, updateContractor } = useContractorActions();
  const { allContractorTypes, addCustomContractorType } = useContractorTypes();
  const { mutateAsync: uploadFile, isPending: isUploading } = useUploadFile();
  const { mutateAsync: deleteFile, isPending: isDeleting } = useDeleteFile();
  const canUploadFiles = useCanUploadFiles();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAddType, setShowAddType] = useState(false);
  const [newType, setNewType] = useState('');
  const [showAddress, setShowAddress] = useState(false);
  const [showBusiness, setShowBusiness] = useState(false);

  const [formData, setFormData] = useState({
    serviceType: '',
    name: '',
    contactName: '',
    phone: '',
    email: '',
    website: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    licenseNumber: '',
    insuranceInfo: '',
    invoices: [] as Invoice[],
    rating: undefined as number | undefined,
    notes: '',
  });

  // New invoice form state
  const [newInvoice, setNewInvoice] = useState({
    date: getTodayFormatted(),
    amount: '',
    description: '',
  });

  const invoiceInputRef = useRef<HTMLInputElement>(null);

  const isEditing = !!contractor;

  // Reset form when dialog opens
  useEffect(() => {
    if (isOpen) {
      if (contractor) {
        setFormData({
          serviceType: contractor.serviceType,
          name: contractor.name,
          contactName: contractor.contactName || '',
          phone: contractor.phone || '',
          email: contractor.email || '',
          website: contractor.website || '',
          address: contractor.address || '',
          city: contractor.city || '',
          state: contractor.state || '',
          zipCode: contractor.zipCode || '',
          licenseNumber: contractor.licenseNumber || '',
          insuranceInfo: contractor.insuranceInfo || '',
          invoices: contractor.invoices || [],
          rating: contractor.rating,
          notes: contractor.notes || '',
        });
        setShowAddress(!!(contractor.address || contractor.city || contractor.state || contractor.zipCode));
        setShowBusiness(!!(contractor.licenseNumber || contractor.insuranceInfo));
      } else {
        setFormData({
          serviceType: '',
          name: '',
          contactName: '',
          phone: '',
          email: '',
          website: '',
          address: '',
          city: '',
          state: '',
          zipCode: '',
          licenseNumber: '',
          insuranceInfo: '',
          invoices: [],
          rating: undefined,
          notes: '',
        });
        setShowAddress(false);
        setShowBusiness(false);
      }
      setShowAddType(false);
      setNewType('');
      setNewInvoice({
        date: getTodayFormatted(),
        amount: '',
        description: '',
      });
    }
  }, [isOpen, contractor]);

  const handleInvoiceUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const tags = await uploadFile(file);
      const url = tags[0]?.[1];
      if (url) {
        // Add invoice with the uploaded URL and current form data
        const invoice: Invoice = {
          url,
          date: newInvoice.date || getTodayFormatted(),
          amount: newInvoice.amount || undefined,
          description: newInvoice.description || undefined,
        };
        
        setFormData(prev => ({
          ...prev,
          invoices: [...prev.invoices, invoice],
        }));

        // Reset new invoice form
        setNewInvoice({
          date: getTodayFormatted(),
          amount: '',
          description: '',
        });

        toast({
          title: 'Invoice uploaded',
          description: 'Invoice document uploaded successfully.',
        });
      }
    } catch (error) {
      console.error('Invoice upload error:', error);
      
      if (error instanceof NoPrivateServerError) {
        toast({
          title: 'No private server configured',
          description: 'Please configure a private media server in Settings > Server Settings > Media before uploading invoices.',
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

    e.target.value = '';
  };

  const handleRemoveInvoice = (index: number, deleteFromServer: boolean = false) => {
    const invoice = formData.invoices[index];
    
    setFormData(prev => ({
      ...prev,
      invoices: prev.invoices.filter((_, i) => i !== index),
    }));

    if (deleteFromServer && invoice?.url) {
      deleteFile(invoice.url)
        .then(() => {
          toast({
            title: 'Invoice deleted',
            description: 'Invoice has been removed from your media server.',
          });
        })
        .catch((error) => {
          console.error('Failed to delete invoice from server:', error);
          toast({
            title: 'Could not delete from server',
            description: error instanceof Error ? error.message : 'The invoice reference was removed but the file may still exist on the server.',
            variant: 'destructive',
          });
        });
    }
  };

  const handleAddType = () => {
    if (newType.trim()) {
      addCustomContractorType(newType.trim());
      setFormData(prev => ({ ...prev, serviceType: newType.trim() }));
      setNewType('');
      setShowAddType(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.serviceType) {
      toast({
        title: 'Service type required',
        description: 'Please select a service type.',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.name.trim()) {
      toast({
        title: 'Name required',
        description: 'Please enter a contractor or business name.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEditing && contractor) {
        await updateContractor(contractor.id, formData);
        toast({
          title: 'Contractor updated',
          description: 'Contractor information has been updated successfully.',
        });
      } else {
        await createContractor(formData);
        toast({
          title: 'Contractor added',
          description: 'Contractor has been added successfully.',
        });
      }
      onClose();
    } catch {
      toast({
        title: 'Error',
        description: `Failed to ${isEditing ? 'update' : 'add'} contractor. Please try again.`,
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
          <DialogTitle>{isEditing ? 'Edit Contractor' : 'Add Contractor'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Service Type Selection */}
          <div className="space-y-2">
            <Label>Service Type *</Label>
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
                  value={formData.serviceType}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, serviceType: value }))}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select a service type" />
                  </SelectTrigger>
                  <SelectContent>
                    {allContractorTypes.map((type) => (
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

          {/* Business/Contractor Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Business/Contractor Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., Joe's Plumbing, ABC Electric"
            />
          </div>

          {/* Contact Name */}
          <div className="space-y-2">
            <Label htmlFor="contactName">Contact Person</Label>
            <Input
              id="contactName"
              value={formData.contactName}
              onChange={(e) => setFormData(prev => ({ ...prev, contactName: e.target.value }))}
              placeholder="Primary contact name"
            />
          </div>

          {/* Contact Methods */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="(555) 123-4567"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="contact@example.com"
              />
            </div>
          </div>

          {/* Website */}
          <div className="space-y-2">
            <Label htmlFor="website">Website</Label>
            <Input
              id="website"
              type="url"
              value={formData.website}
              onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
              placeholder="https://example.com"
            />
          </div>

          {/* Address Section (collapsible) */}
          <Collapsible open={showAddress} onOpenChange={setShowAddress}>
            <CollapsibleTrigger className="flex items-center gap-2 w-full p-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors">
              {showAddress ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              <span className="font-medium">Address</span>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="address">Street Address</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="123 Main St"
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                    placeholder="City"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    value={formData.state}
                    onChange={(e) => setFormData(prev => ({ ...prev, state: e.target.value }))}
                    placeholder="State"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="zipCode">Zip Code</Label>
                  <Input
                    id="zipCode"
                    value={formData.zipCode}
                    onChange={(e) => setFormData(prev => ({ ...prev, zipCode: e.target.value }))}
                    placeholder="12345"
                  />
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Business Details Section (collapsible) */}
          <Collapsible open={showBusiness} onOpenChange={setShowBusiness}>
            <CollapsibleTrigger className="flex items-center gap-2 w-full p-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors">
              {showBusiness ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              <span className="font-medium">Business Details</span>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="licenseNumber">License Number</Label>
                <Input
                  id="licenseNumber"
                  value={formData.licenseNumber}
                  onChange={(e) => setFormData(prev => ({ ...prev, licenseNumber: e.target.value }))}
                  placeholder="Contractor license number"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="insuranceInfo">Insurance Information</Label>
                <Input
                  id="insuranceInfo"
                  value={formData.insuranceInfo}
                  onChange={(e) => setFormData(prev => ({ ...prev, insuranceInfo: e.target.value }))}
                  placeholder="Insurance provider and policy details"
                />
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Rating */}
          <div className="space-y-2">
            <Label>Rating</Label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setFormData(prev => ({
                    ...prev,
                    rating: prev.rating === star ? undefined : star
                  }))}
                  className="p-1 hover:scale-110 transition-transform"
                >
                  <Star
                    className={`h-6 w-6 ${
                      formData.rating !== undefined && star <= formData.rating
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-slate-300 dark:text-slate-600'
                    }`}
                  />
                </button>
              ))}
              {formData.rating && (
                <span className="text-sm text-muted-foreground ml-2 self-center">
                  {formData.rating} star{formData.rating > 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>

          {/* Invoices Section */}
          <div className="space-y-3">
            <Label>Invoices & Receipts</Label>
            
            {/* New Invoice Input */}
            <div className="space-y-2 p-3 rounded-lg bg-muted/50 border border-dashed">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="invoiceDate" className="text-xs">Date</Label>
                  <Input
                    id="invoiceDate"
                    value={newInvoice.date}
                    onChange={(e) => setNewInvoice(prev => ({ ...prev, date: e.target.value }))}
                    placeholder="MM/DD/YYYY"
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="invoiceAmount" className="text-xs">Amount (optional)</Label>
                  <Input
                    id="invoiceAmount"
                    value={newInvoice.amount}
                    onChange={(e) => setNewInvoice(prev => ({ ...prev, amount: e.target.value }))}
                    placeholder="$0.00"
                    className="h-8 text-sm"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="invoiceDescription" className="text-xs">Description (optional)</Label>
                <Input
                  id="invoiceDescription"
                  value={newInvoice.description}
                  onChange={(e) => setNewInvoice(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Service description"
                  className="h-8 text-sm"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <input
                  type="file"
                  accept="image/*,.pdf"
                  className="hidden"
                  ref={invoiceInputRef}
                  onChange={handleInvoiceUpload}
                />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="w-full">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => invoiceInputRef.current?.click()}
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
                        Upload Invoice
                      </Button>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    {!canUploadFiles 
                      ? 'Configure a private media server in Settings to enable uploads'
                      : 'Upload invoice PDF or image (stored on private server only)'
                    }
                  </TooltipContent>
                </Tooltip>
              </div>
              {!canUploadFiles && (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  Invoices are sensitive documents. Configure a private media server to upload.
                </p>
              )}
            </div>

            {/* Existing Invoices List */}
            {formData.invoices.length > 0 && (
              <div className="space-y-2">
                {formData.invoices.map((invoice, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm bg-muted/50 p-2 rounded">
                    <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        <span className="font-medium">{invoice.date}</span>
                        {invoice.amount && (
                          <span className="text-muted-foreground">- {invoice.amount}</span>
                        )}
                      </div>
                      {invoice.description && (
                        <p className="text-xs text-muted-foreground truncate">{invoice.description}</p>
                      )}
                    </div>
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
                        <DropdownMenuItem asChild>
                          <a href={invoice.url} target="_blank" rel="noopener noreferrer">
                            View Invoice
                          </a>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleRemoveInvoice(index, false)}>
                          <X className="h-4 w-4 mr-2" />
                          Remove from contractor
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleRemoveInvoice(index, true)}
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
              placeholder="Additional notes about this contractor..."
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
