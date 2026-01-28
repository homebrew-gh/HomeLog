import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Home, Wrench, Plus, X, Package, Building2, TreePine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DateInput } from '@/components/ui/date-input';
import { useAppliances } from '@/hooks/useAppliances';
import { useCompanies } from '@/hooks/useCompanies';
import { useCustomHomeFeatures } from '@/hooks/useCustomHomeFeatures';
import { useMaintenanceActions } from '@/hooks/useMaintenance';
import { useMaintenanceCompletionActions } from '@/hooks/useMaintenanceCompletions';
import { toast } from '@/hooks/useToast';
import type { MaintenancePart } from '@/lib/types';

interface LogHomeMaintenanceDialogProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedApplianceId?: string;
  preselectedHomeFeature?: string;
}

// Special value for "Add custom feature" option
const ADD_CUSTOM_FEATURE = '__add_custom__';

// Get today's date in MM/DD/YYYY format
function getTodayFormatted(): string {
  return format(new Date(), 'MM/dd/yyyy');
}

export function LogHomeMaintenanceDialog({ 
  isOpen, 
  onClose, 
  preselectedApplianceId,
  preselectedHomeFeature 
}: LogHomeMaintenanceDialogProps) {
  const { data: appliances = [] } = useAppliances();
  const { data: companies = [] } = useCompanies();
  const { allHomeFeatures, addCustomHomeFeature } = useCustomHomeFeatures();
  const { createMaintenance } = useMaintenanceActions();
  const { createCompletion } = useMaintenanceCompletionActions();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCustomFeatureInput, setShowCustomFeatureInput] = useState(false);
  const [customFeatureName, setCustomFeatureName] = useState('');

  const [formData, setFormData] = useState({
    applianceId: '',
    homeFeature: '',
    companyId: '',
    description: '',
    completedDate: getTodayFormatted(),
  });

  // Parts state
  const [parts, setParts] = useState<MaintenancePart[]>([]);
  const [showAddPart, setShowAddPart] = useState(false);
  const [newPart, setNewPart] = useState<MaintenancePart>({ name: '', partNumber: '', cost: '' });

  // Get the selected appliance
  const selectedAppliance = appliances.find(a => a.id === formData.applianceId);

  // Reset form when dialog opens
  useEffect(() => {
    if (isOpen) {
      setFormData({
        applianceId: preselectedApplianceId || '',
        homeFeature: preselectedHomeFeature || '',
        companyId: '',
        description: '',
        completedDate: getTodayFormatted(),
      });
      setParts([]);
      setShowAddPart(false);
      setNewPart({ name: '', partNumber: '', cost: '' });
      setShowCustomFeatureInput(false);
      setCustomFeatureName('');
    }
  }, [isOpen, preselectedApplianceId, preselectedHomeFeature]);

  const handleHomeFeatureChange = (value: string) => {
    if (value === ADD_CUSTOM_FEATURE) {
      setShowCustomFeatureInput(true);
      setFormData(prev => ({ ...prev, homeFeature: '' }));
    } else if (value === '__none__') {
      setShowCustomFeatureInput(false);
      setCustomFeatureName('');
      setFormData(prev => ({ ...prev, homeFeature: '' }));
    } else {
      setShowCustomFeatureInput(false);
      setCustomFeatureName('');
      setFormData(prev => ({ ...prev, homeFeature: value }));
    }
  };

  const handleAddCustomFeature = () => {
    const trimmed = customFeatureName.trim();
    if (!trimmed) {
      toast({
        title: 'Feature name required',
        description: 'Please enter a name for the custom feature.',
        variant: 'destructive',
      });
      return;
    }

    // Check if it already exists
    if (allHomeFeatures.some(f => f.toLowerCase() === trimmed.toLowerCase())) {
      // Just select it
      setFormData(prev => ({ ...prev, homeFeature: allHomeFeatures.find(f => f.toLowerCase() === trimmed.toLowerCase()) || trimmed }));
    } else {
      // Add to custom features and select it
      addCustomHomeFeature(trimmed);
      setFormData(prev => ({ ...prev, homeFeature: trimmed }));
    }
    
    setShowCustomFeatureInput(false);
    setCustomFeatureName('');
    toast({
      title: 'Home feature added',
      description: `"${trimmed}" has been added and selected.`,
    });
  };

  const handleAddPart = () => {
    if (!newPart.name.trim()) {
      toast({
        title: 'Part name required',
        description: 'Please enter a name for the part.',
        variant: 'destructive',
      });
      return;
    }

    setParts(prev => [...prev, { 
      name: newPart.name.trim(), 
      partNumber: newPart.partNumber?.trim() || undefined,
      cost: newPart.cost?.trim() || undefined,
    }]);
    setNewPart({ name: '', partNumber: '', cost: '' });
    setShowAddPart(false);
  };

  const handleRemovePart = (index: number) => {
    setParts(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    // Require either an appliance OR a home feature
    if (!formData.applianceId && !formData.homeFeature) {
      toast({
        title: 'Selection required',
        description: 'Please select either an appliance or a home feature.',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.description.trim()) {
      toast({
        title: 'Description required',
        description: 'Please enter a description of the maintenance performed.',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.completedDate) {
      toast({
        title: 'Date required',
        description: 'Please select the date the maintenance was performed.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Create a log-only maintenance schedule
      const maintenanceId = await createMaintenance({
        applianceId: formData.applianceId || undefined,
        homeFeature: formData.homeFeature || undefined,
        companyId: formData.companyId || undefined,
        description: formData.description.trim(),
        isLogOnly: true,
      });

      // Create the completion record with parts
      await createCompletion(
        maintenanceId,
        formData.completedDate,
        undefined, // no mileage for home maintenance
        undefined, // notes
        parts.length > 0 ? parts : undefined
      );

      const itemName = selectedAppliance?.model || formData.homeFeature || 'home';
      toast({
        title: 'Maintenance logged',
        description: `Maintenance for ${itemName} has been recorded.`,
      });
      onClose();
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to log maintenance. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Check if form can be submitted
  const canSubmit = (formData.applianceId || formData.homeFeature) && formData.description.trim() && formData.completedDate;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] sm:max-w-lg max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5 text-primary" />
            Log Home Maintenance Task
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Home Feature Selection */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <TreePine className="h-4 w-4 text-green-600" />
              Home Feature
            </Label>
            {showCustomFeatureInput ? (
              <div className="flex gap-2">
                <Input
                  value={customFeatureName}
                  onChange={(e) => setCustomFeatureName(e.target.value)}
                  placeholder="Enter custom feature name"
                  className="flex-1"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddCustomFeature();
                    } else if (e.key === 'Escape') {
                      setShowCustomFeatureInput(false);
                      setCustomFeatureName('');
                    }
                  }}
                />
                <Button onClick={handleAddCustomFeature} size="icon">
                  <Plus className="h-4 w-4" />
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowCustomFeatureInput(false);
                    setCustomFeatureName('');
                  }}
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <Select
                value={formData.homeFeature}
                onValueChange={handleHomeFeatureChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a home feature (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__" className="text-muted-foreground">
                    None
                  </SelectItem>
                  {allHomeFeatures.map((feature) => (
                    <SelectItem key={feature} value={feature}>
                      {feature}
                    </SelectItem>
                  ))}
                  <SelectItem value={ADD_CUSTOM_FEATURE} className="text-sky-600">
                    <span className="flex items-center gap-2">
                      <Plus className="h-4 w-4" />
                      Add custom feature...
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Appliance Selection */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Home className="h-4 w-4" />
              Appliance
            </Label>
            <Select
              value={formData.applianceId}
              onValueChange={(value) => setFormData(prev => ({ ...prev, applianceId: value === '__none__' ? '' : value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select an appliance (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__" className="text-muted-foreground">
                  None
                </SelectItem>
                {appliances.length === 0 ? (
                  <div className="p-2 text-sm text-muted-foreground text-center">
                    No appliances found. Add one in the My Stuff tab.
                  </div>
                ) : (
                  appliances.map((appliance) => (
                    <SelectItem key={appliance.id} value={appliance.id}>
                      {appliance.model} {appliance.room && `(${appliance.room})`}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Validation hint */}
          {!formData.applianceId && !formData.homeFeature && (
            <p className="text-sm text-amber-600 dark:text-amber-400">
              Please select at least one: a home feature or an appliance.
            </p>
          )}

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Describe the maintenance performed (e.g., Changed HVAC filter, Cleaned gutters)"
              rows={3}
            />
          </div>

          {/* Service Provider / Company */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Service Provider
            </Label>
            <Select
              value={formData.companyId}
              onValueChange={(value) => setFormData(prev => ({ ...prev, companyId: value === '__none__' ? '' : value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a company (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__" className="text-muted-foreground">
                  None
                </SelectItem>
                {companies.length === 0 ? (
                  <div className="p-2 text-sm text-muted-foreground text-center">
                    No companies found. Add one in the Company/Service tab.
                  </div>
                ) : (
                  companies.map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.name} ({company.serviceType})
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Parts Section */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Parts Used
            </Label>
            
            {/* List of added parts */}
            {parts.length > 0 && (
              <div className="space-y-2">
                {parts.map((part, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{part.name}</p>
                      <div className="flex gap-3 text-xs text-muted-foreground">
                        {part.partNumber && <span>Part #: {part.partNumber}</span>}
                        {part.cost && <span>Cost: {part.cost}</span>}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={() => handleRemovePart(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Add Part Form */}
            {showAddPart ? (
              <div className="space-y-3 p-3 border rounded-lg bg-muted/30">
                <div className="space-y-2">
                  <Label htmlFor="partName" className="text-sm">Part Name *</Label>
                  <Input
                    id="partName"
                    value={newPart.name}
                    onChange={(e) => setNewPart(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., HVAC Filter"
                    autoFocus
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="partNumber" className="text-sm">Part Number</Label>
                    <Input
                      id="partNumber"
                      value={newPart.partNumber || ''}
                      onChange={(e) => setNewPart(prev => ({ ...prev, partNumber: e.target.value }))}
                      placeholder="Optional"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="partCost" className="text-sm">Cost</Label>
                    <Input
                      id="partCost"
                      value={newPart.cost || ''}
                      onChange={(e) => setNewPart(prev => ({ ...prev, cost: e.target.value }))}
                      placeholder="e.g., $12.99"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleAddPart} size="sm">
                    Add Part
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowAddPart(false);
                      setNewPart({ name: '', partNumber: '', cost: '' });
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAddPart(true)}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Part
              </Button>
            )}
          </div>

          {/* Date */}
          <DateInput
            id="completedDate"
            label="Date Performed *"
            value={formData.completedDate}
            onChange={(value) => setFormData(prev => ({ ...prev, completedDate: value }))}
            showTodayCheckbox
          />
        </div>

        {/* Action Buttons */}
        <div className="flex justify-start gap-2 pt-4 border-t">
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting || !canSubmit}
          >
            {isSubmitting ? 'Saving...' : 'Log Maintenance'}
          </Button>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
