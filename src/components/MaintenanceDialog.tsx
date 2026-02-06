import { useState, useEffect } from 'react';
import { Info, Home, Car, Plus, TreePine, CheckCircle2, Wrench, X, Package, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DateInput } from '@/components/ui/date-input';
import { useAppliances } from '@/hooks/useAppliances';
import { useVehicles } from '@/hooks/useVehicles';
import { useCompanies } from '@/hooks/useCompanies';
import { useCustomHomeFeatures } from '@/hooks/useCustomHomeFeatures';
import { useMaintenanceActions, calculateNextDueDate, formatDueDate } from '@/hooks/useMaintenance';
import { useCompletionsByMaintenance, useMaintenanceCompletionActions } from '@/hooks/useMaintenanceCompletions';
import { useCurrency } from '@/hooks/useCurrency';
import { toast } from '@/hooks/useToast';
import { FREQUENCY_UNITS, INTERVAL_TYPES, type MaintenanceSchedule, type MaintenancePart, type IntervalType } from '@/lib/types';
import { logger } from '@/lib/logger';

interface MaintenanceDialogProps {
  isOpen: boolean;
  onClose: () => void;
  maintenance?: MaintenanceSchedule; // If provided, we're editing
  preselectedApplianceId?: string;
  preselectedVehicleId?: string;
  mode?: 'appliance' | 'vehicle'; // Which type of maintenance
}

// Special value for "Add custom feature" option
const ADD_CUSTOM_FEATURE = '__add_custom__';

export function MaintenanceDialog({ isOpen, onClose, maintenance, preselectedApplianceId, preselectedVehicleId, mode = 'appliance' }: MaintenanceDialogProps) {
  const { data: appliances = [] } = useAppliances();
  const { data: vehicles = [] } = useVehicles();
  const { data: companies = [] } = useCompanies();
  const { allHomeFeatures, addCustomHomeFeature } = useCustomHomeFeatures();
  const { createMaintenance, updateMaintenance } = useMaintenanceActions();
  const { createCompletion } = useMaintenanceCompletionActions();
  const { formatForDisplay } = useCurrency();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCustomFeatureInput, setShowCustomFeatureInput] = useState(false);
  const [customFeatureName, setCustomFeatureName] = useState('');

  // Parts state
  const [parts, setParts] = useState<MaintenancePart[]>([]);
  const [showAddPart, setShowAddPart] = useState(false);
  const [newPart, setNewPart] = useState<MaintenancePart>({ name: '', partNumber: '', cost: '' });

  const [formData, setFormData] = useState({
    applianceId: '',
    vehicleId: '',
    homeFeature: '',
    companyId: '',
    description: '',
    partNumber: '',
    frequency: '',
    frequencyUnit: 'months' as NonNullable<MaintenanceSchedule['frequencyUnit']>,
    mileageInterval: '',
    intervalType: 'miles' as IntervalType,
    lastCompletedDate: '', // Optional initial completion date
  });

  const isEditing = !!maintenance;
  const isVehicleMode = mode === 'vehicle' || (isEditing && maintenance.vehicleId);

  // Get the selected appliance or vehicle for displaying purchase date
  const selectedAppliance = appliances.find(a => a.id === formData.applianceId);
  const selectedVehicle = vehicles.find(v => v.id === formData.vehicleId);
  const purchaseDate = isVehicleMode ? selectedVehicle?.purchaseDate : selectedAppliance?.purchaseDate;

  // Get completions for this maintenance (only relevant when editing)
  const completions = useCompletionsByMaintenance(maintenance?.id);
  const lastCompletionDate = completions.length > 0 ? completions[0].completedDate : undefined;

  // Calculate preview of next due date
  // For new maintenance, use the lastCompletedDate from the form if provided
  // For editing, use the actual last completion date from records
  const effectiveLastCompletion = isEditing ? lastCompletionDate : (formData.lastCompletedDate || undefined);
  
  // For preview, use lastCompletedDate if available, otherwise use purchaseDate or today
  const previewBaseDateStr = formData.lastCompletedDate || purchaseDate || new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
  
  // Calculate preview for scheduled maintenance
  const previewDueDate = formData.frequency
    ? calculateNextDueDate(
        previewBaseDateStr,
        parseInt(formData.frequency, 10),
        formData.frequencyUnit,
        effectiveLastCompletion
      )
    : null;

  // Reset form when dialog opens
  useEffect(() => {
    if (isOpen) {
      setShowCustomFeatureInput(false);
      setCustomFeatureName('');
      setParts([]);
      setShowAddPart(false);
      setNewPart({ name: '', partNumber: '', cost: '' });
      if (maintenance) {
        setFormData({
          applianceId: maintenance.applianceId || '',
          vehicleId: maintenance.vehicleId || '',
          homeFeature: maintenance.homeFeature || '',
          companyId: maintenance.companyId || '',
          description: maintenance.description,
          partNumber: maintenance.partNumber || '',
          frequency: maintenance.frequency?.toString() || '',
          frequencyUnit: maintenance.frequencyUnit || 'months',
          mileageInterval: maintenance.mileageInterval?.toString() || '',
          intervalType: maintenance.intervalType || 'miles',
          lastCompletedDate: '', // Not editable when editing - use the completion records
        });
      } else {
        setFormData({
          applianceId: preselectedApplianceId || '',
          vehicleId: preselectedVehicleId || '',
          homeFeature: '',
          companyId: '',
          description: '',
          partNumber: '',
          frequency: '',
          frequencyUnit: 'months',
          mileageInterval: '',
          intervalType: 'miles',
          lastCompletedDate: '',
        });
      }
    }
  }, [isOpen, maintenance, preselectedApplianceId, preselectedVehicleId]);

  const handleHomeFeatureChange = (value: string) => {
    if (value === ADD_CUSTOM_FEATURE) {
      setShowCustomFeatureInput(true);
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
    if (isVehicleMode && !formData.vehicleId) {
      toast({
        title: 'Vehicle required',
        description: 'Please select a vehicle.',
        variant: 'destructive',
      });
      return;
    }

    // For home maintenance, require either an appliance OR a home feature
    if (!isVehicleMode && !formData.applianceId && !formData.homeFeature) {
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
        description: 'Please enter a maintenance description.',
        variant: 'destructive',
      });
      return;
    }

    // Frequency is required for recurring maintenance
    const frequency = parseInt(formData.frequency, 10);
    if (!frequency || frequency < 1) {
      toast({
        title: 'Valid frequency required',
        description: 'Please enter a valid frequency number for scheduled maintenance.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const mileageInterval = formData.mileageInterval ? parseInt(formData.mileageInterval, 10) : undefined;
      
      const data = {
        applianceId: isVehicleMode ? undefined : (formData.applianceId || undefined),
        vehicleId: isVehicleMode ? formData.vehicleId : undefined,
        homeFeature: isVehicleMode ? undefined : (formData.homeFeature || undefined),
        companyId: formData.companyId || undefined,
        description: formData.description.trim(),
        parts: parts.length > 0 ? parts : undefined,
        frequency: frequency,
        frequencyUnit: formData.frequencyUnit,
        mileageInterval: mileageInterval && mileageInterval > 0 ? mileageInterval : undefined,
        intervalType: mileageInterval && mileageInterval > 0 ? formData.intervalType : undefined,
      };

      if (isEditing && maintenance) {
        await updateMaintenance(maintenance.id, data);
        toast({
          title: 'Maintenance updated',
          description: 'Your maintenance schedule has been updated.',
        });
      } else {
        const maintenanceId = await createMaintenance(data);
        
        // If a last completed date was provided, create an initial completion record
        if (formData.lastCompletedDate) {
          try {
            await createCompletion(maintenanceId, formData.lastCompletedDate);
          } catch (completionError) {
            logger.error('Failed to create initial completion record:', completionError);
            // Don't fail the whole operation if completion creation fails
          }
        }
        
        toast({
          title: 'Maintenance added',
          description: 'Your maintenance schedule has been added.',
        });
      }
      onClose();
    } catch {
      toast({
        title: 'Error',
        description: `Failed to ${isEditing ? 'update' : 'add'} maintenance. Please try again.`,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Check if home maintenance can be submitted (either appliance or home feature selected)
  const canSubmitHomeMaintenance = formData.applianceId || formData.homeFeature;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] sm:max-w-lg max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isVehicleMode ? (
              <Car className="h-5 w-5 text-sky-600" />
            ) : (
              <Home className="h-5 w-5 text-sky-600" />
            )}
            {isEditing ? 'Edit Maintenance' : `Add ${isVehicleMode ? 'Vehicle' : 'Home'} Maintenance`}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Appliance or Vehicle Selection */}
          {isVehicleMode ? (
            <div className="space-y-2">
              <Label>Vehicle *</Label>
              <Select
                value={formData.vehicleId}
                onValueChange={(value) => setFormData(prev => ({ ...prev, vehicleId: value }))}
                disabled={isEditing}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a vehicle" />
                </SelectTrigger>
                <SelectContent>
                  {vehicles.length === 0 ? (
                    <div className="p-2 text-sm text-muted-foreground text-center">
                      No vehicles found. Add a vehicle first.
                    </div>
                  ) : (
                    vehicles.map((vehicle) => (
                      <SelectItem key={vehicle.id} value={vehicle.id}>
                        {vehicle.name} ({vehicle.vehicleType})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>

              {/* Show vehicle purchase date if selected */}
              {selectedVehicle?.purchaseDate && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 p-2 rounded">
                  <Calendar className="h-4 w-4" />
                  <span>Purchased: {selectedVehicle.purchaseDate}</span>
                </div>
              )}
            </div>
          ) : (
            <>
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
                    disabled={isEditing && !!maintenance?.homeFeature}
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
                <Label>Appliance</Label>
                <Select
                  value={formData.applianceId}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, applianceId: value === '__none__' ? '' : value }))}
                  disabled={isEditing && !!maintenance?.applianceId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select an appliance (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__" className="text-muted-foreground">
                      None
                    </SelectItem>
                    {appliances.map((appliance) => (
                      <SelectItem key={appliance.id} value={appliance.id}>
                        {appliance.model} {appliance.room && `(${appliance.room})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Show appliance purchase date if selected */}
                {selectedAppliance?.purchaseDate && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 p-2 rounded">
                    <Calendar className="h-4 w-4" />
                    <span>Installed/Purchased: {selectedAppliance.purchaseDate}</span>
                  </div>
                )}
              </div>

              {/* Validation hint */}
              {!canSubmitHomeMaintenance && (
                <p className="text-sm text-amber-600 dark:text-amber-400">
                  Please select at least one: a home feature or an appliance.
                </p>
              )}
            </>
          )}

          {/* Maintenance Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Maintenance Description *</Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="e.g., Change filter, Clean coils, etc."
            />
          </div>

          {/* Parts Section */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Parts
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
                        {part.cost && <span>Cost: {formatForDisplay(part.cost)}</span>}
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
                    placeholder="e.g., Oil Filter"
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

          {/* Company/Service Provider */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Wrench className="h-4 w-4 text-orange-600" />
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
            <p className="text-xs text-muted-foreground">
              Link this task to a company from your Company/Service list
            </p>
          </div>

          {/* Frequency */}
          {(
            <div className="space-y-2">
              <Label>Frequency *</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  min="1"
                  value={formData.frequency}
                  onChange={(e) => setFormData(prev => ({ ...prev, frequency: e.target.value }))}
                  placeholder="Enter number"
                  className="flex-1"
                />
                <Select
                  value={formData.frequencyUnit}
                  onValueChange={(value) => setFormData(prev => ({
                    ...prev,
                    frequencyUnit: value as NonNullable<MaintenanceSchedule['frequencyUnit']>
                  }))}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FREQUENCY_UNITS.map(({ value, label }) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Mileage/Hours Interval (for vehicles only) */}
          {isVehicleMode && (
            <div className="space-y-2">
              <Label htmlFor="mileageInterval">
                {formData.intervalType === 'hours' ? 'Hours' : 'Mileage'} Interval (optional)
              </Label>
              <div className="flex gap-2">
                <Input
                  id="mileageInterval"
                  type="number"
                  min="1"
                  value={formData.mileageInterval}
                  onChange={(e) => setFormData(prev => ({ ...prev, mileageInterval: e.target.value }))}
                  placeholder={formData.intervalType === 'hours' ? 'e.g., 100' : 'e.g., 5000'}
                  className="flex-1"
                />
                <Select
                  value={formData.intervalType}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, intervalType: value as IntervalType }))}
                >
                  <SelectTrigger className="w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INTERVAL_TYPES.map(({ value, label }) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <p className="text-xs text-muted-foreground">
                Optional: Track maintenance by {formData.intervalType === 'hours' ? 'engine hours' : 'mileage'} in addition to time
              </p>
            </div>
          )}

          {/* Last Completed Date (only for new maintenance) */}
          {!isEditing && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium">Last Completed Date (optional)</span>
              </div>
              <DateInput
                id="lastCompletedDate"
                value={formData.lastCompletedDate}
                onChange={(value) => setFormData(prev => ({ ...prev, lastCompletedDate: value }))}
              />
              <p className="text-xs text-muted-foreground">
                When was this task last completed? This will be used to calculate the next due date.
              </p>
            </div>
          )}

          {/* Preview Next Due Date */}
          {previewDueDate && (
            <div className="flex items-center gap-2 text-sm bg-primary/10 text-primary p-3 rounded-lg">
              <Info className="h-4 w-4 shrink-0" />
              <span>Next due date will be: <strong>{formatDueDate(previewDueDate)}</strong></span>
            </div>
          )}
        </div>

        {/* Action Buttons - Bottom Left */}
        <div className="flex justify-start gap-2 pt-4 border-t">
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting || (isVehicleMode ? vehicles.length === 0 : !canSubmitHomeMaintenance)}
          >
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
