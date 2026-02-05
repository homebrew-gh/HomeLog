import { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { Plus, Upload, X, FileText, ChevronDown, ChevronUp, AlertCircle, Trash2, MoreVertical, Star, Bitcoin, ExternalLink, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { DateInput } from '@/components/ui/date-input';
import { Switch } from '@/components/ui/switch';
import { useCompanyActions } from '@/hooks/useCompanies';
import { useCompanyTypes } from '@/hooks/useCompanyTypes';
import { useUploadFile, useDeleteFile, NoPrivateServerError, useCanUploadFiles } from '@/hooks/useUploadFile';
import { toast } from '@/hooks/useToast';
import type { Company, Invoice } from '@/lib/types';

// VCF Parser - extracts contact information from vCard format
interface VcfData {
  name?: string;
  contactName?: string;
  phone?: string;
  email?: string;
  website?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  notes?: string;
}

function parseVcf(vcfContent: string): VcfData {
  const data: VcfData = {};
  const lines = vcfContent.split(/\r?\n/);
  
  // Handle folded lines (lines starting with space/tab are continuations)
  const unfoldedLines: string[] = [];
  for (const line of lines) {
    if (line.startsWith(' ') || line.startsWith('\t')) {
      // Continuation of previous line
      if (unfoldedLines.length > 0) {
        unfoldedLines[unfoldedLines.length - 1] += line.substring(1);
      }
    } else {
      unfoldedLines.push(line);
    }
  }
  
  for (const line of unfoldedLines) {
    // Skip empty lines
    if (!line.trim()) continue;
    
    // Parse property name and value
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) continue;
    
    const propertyPart = line.substring(0, colonIndex);
    const valuePart = line.substring(colonIndex + 1);
    
    // Extract base property name (before any parameters like ;TYPE=)
    const propertyName = propertyPart.split(';')[0].toUpperCase();
    
    // Decode quoted-printable if needed
    const isQuotedPrintable = propertyPart.toUpperCase().includes('ENCODING=QUOTED-PRINTABLE');
    const value = isQuotedPrintable ? decodeQuotedPrintable(valuePart) : valuePart;
    
    switch (propertyName) {
      case 'FN': // Formatted Name - use as business name
        data.name = value.trim();
        break;
        
      case 'N': { // Structured Name - use as contact name if different
        const nameParts = value.split(';').map(p => p.trim()).filter(Boolean);
        if (nameParts.length >= 2) {
          // Format: Last;First;Middle;Prefix;Suffix
          const contactName = [nameParts[1], nameParts[0]].filter(Boolean).join(' ');
          if (contactName && contactName !== data.name) {
            data.contactName = contactName;
          }
        }
        break;
      }
      case 'ORG': // Organization
        if (!data.name) {
          data.name = value.split(';')[0].trim();
        }
        break;
        
      case 'TEL': // Telephone
        if (!data.phone) {
          // Clean up phone number
          data.phone = value.replace(/[^\d+\-() ]/g, '').trim();
        }
        break;
        
      case 'EMAIL': // Email
        if (!data.email) {
          data.email = value.trim();
        }
        break;
        
      case 'URL': // Website
        if (!data.website) {
          data.website = value.trim();
        }
        break;
        
      case 'ADR': { // Address
        // Format: PO Box;Extended;Street;City;State;Postal;Country
        const addrParts = value.split(';').map(p => p.trim());
        if (addrParts.length >= 3) {
          const street = [addrParts[0], addrParts[1], addrParts[2]].filter(Boolean).join(' ');
          if (street) data.address = street;
          if (addrParts[3]) data.city = addrParts[3];
          if (addrParts[4]) data.state = addrParts[4];
          if (addrParts[5]) data.zipCode = addrParts[5];
        }
        break;
      }
        
      case 'NOTE': // Notes
        data.notes = value.trim();
        break;
    }
  }
  
  return data;
}

// Decode quoted-printable encoding
function decodeQuotedPrintable(str: string): string {
  return str
    .replace(/=\r?\n/g, '') // Remove soft line breaks
    .replace(/=([0-9A-Fa-f]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

// Get today's date in MM/DD/YYYY format
function getTodayFormatted(): string {
  return format(new Date(), 'MM/dd/yyyy');
}

interface CompanyDialogProps {
  isOpen: boolean;
  onClose: () => void;
  company?: Company; // If provided, we're editing
  initialData?: Partial<VcfData>; // Initial data from VCF import
  /** When creating, preselect this service type (e.g. "Vet" when adding from Pet form) */
  defaultServiceType?: string;
  /** Called with the new company id after a company is created (e.g. to link it as vet) */
  onCreated?: (companyId: string) => void;
}

export function CompanyDialog({ isOpen, onClose, company, initialData, defaultServiceType, onCreated }: CompanyDialogProps) {
  const { createCompany, updateCompany } = useCompanyActions();
  const { allCompanyTypes, addCustomCompanyType } = useCompanyTypes();
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
    acceptsBitcoin: false,
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

  const isEditing = !!company;

  // Reset form when dialog opens
  useEffect(() => {
    if (isOpen) {
      if (company) {
        setFormData({
          serviceType: company.serviceType,
          name: company.name,
          contactName: company.contactName || '',
          phone: company.phone || '',
          email: company.email || '',
          website: company.website || '',
          address: company.address || '',
          city: company.city || '',
          state: company.state || '',
          zipCode: company.zipCode || '',
          licenseNumber: company.licenseNumber || '',
          insuranceInfo: company.insuranceInfo || '',
          acceptsBitcoin: company.acceptsBitcoin || false,
          invoices: company.invoices || [],
          rating: company.rating,
          notes: company.notes || '',
        });
        setShowAddress(!!(company.address || company.city || company.state || company.zipCode));
        setShowBusiness(!!(company.licenseNumber || company.insuranceInfo));
      } else if (initialData) {
        // Pre-populate from VCF import
        setFormData({
          serviceType: '',
          name: initialData.name || '',
          contactName: initialData.contactName || '',
          phone: initialData.phone || '',
          email: initialData.email || '',
          website: initialData.website || '',
          address: initialData.address || '',
          city: initialData.city || '',
          state: initialData.state || '',
          zipCode: initialData.zipCode || '',
          licenseNumber: '',
          insuranceInfo: '',
          acceptsBitcoin: false,
          invoices: [],
          rating: undefined,
          notes: initialData.notes || '',
        });
        // Show address section if any address data was imported
        setShowAddress(!!(initialData.address || initialData.city || initialData.state || initialData.zipCode));
        setShowBusiness(false);
      } else {
        setFormData({
          serviceType: defaultServiceType || '',
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
          acceptsBitcoin: false,
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
  }, [isOpen, company, initialData, defaultServiceType]);

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
      addCustomCompanyType(newType.trim());
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
        description: 'Please enter a company or business name.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEditing && company) {
        await updateCompany(company.id, formData);
        toast({
          title: 'Company updated',
          description: 'Company information has been updated successfully.',
        });
      } else {
        const id = await createCompany(formData);
        toast({
          title: 'Company added',
          description: 'Company has been added successfully.',
        });
        onCreated?.(id);
      }
      onClose();
    } catch {
      toast({
        title: 'Error',
        description: `Failed to ${isEditing ? 'update' : 'add'} company. Please try again.`,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isImport = !isEditing && !!initialData;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] sm:max-w-lg max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Service' : isImport ? 'Import Service from Contact' : 'Add Service'}
          </DialogTitle>
          {isImport && (
            <DialogDescription>
              Contact information has been imported. Please select a service type and review the details.
            </DialogDescription>
          )}
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
                    {allCompanyTypes.map((type) => (
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

          {/* Business/Company Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Business/Company Name *</Label>
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

          {/* Bitcoin Payment */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-orange-500/10 to-orange-500/5 border border-orange-500/20">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/20">
                <Bitcoin className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <Label htmlFor="acceptsBitcoin" className="text-sm font-medium cursor-pointer">
                  Accepts Bitcoin
                </Label>
                <p className="text-xs text-muted-foreground">
                  Mark if this business accepts Bitcoin payments
                </p>
              </div>
            </div>
            <Switch
              id="acceptsBitcoin"
              checked={formData.acceptsBitcoin}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, acceptsBitcoin: checked }))}
            />
          </div>
          
          {/* BTCMap Link - shown when Bitcoin is accepted */}
          {formData.acceptsBitcoin && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 text-sm">
              <Bitcoin className="h-4 w-4 text-orange-500 shrink-0" />
              <span className="text-muted-foreground">Help the community!</span>
              <a
                href="https://btcmap.org/add-location"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline inline-flex items-center gap-1"
              >
                Add to BTCMap
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}

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
                <DateInput
                  id="invoiceDate"
                  label="Date"
                  value={newInvoice.date}
                  onChange={(value) => setNewInvoice(prev => ({ ...prev, date: value }))}
                  inputClassName="h-8 text-sm"
                  className="space-y-1"
                />
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
                          Remove from company
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
              placeholder="Additional notes about this company..."
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

// Export VCF parser for use in CompaniesTab
export { parseVcf };
export type { VcfData };
