import { useState, useEffect } from 'react';
import { Calendar, Info, Home, Car } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAppliances } from '@/hooks/useAppliances';
import { useVehicles } from '@/hooks/useVehicles';
import { useMaintenanceActions, calculateNextDueDate, formatDueDate } from '@/hooks/useMaintenance';
import { useCompletionsByMaintenance } from '@/hooks/useMaintenanceCompletions';
import { toast } from '@/hooks/useToast';
import { FREQUENCY_UNITS, type MaintenanceSchedule } from '@/lib/types';

interface MaintenanceDialogProps {
  isOpen: boolean;
  onClose: () => void;
  maintenance?: MaintenanceSchedule; // If provided, we're editing
  preselectedApplianceId?: string;
  preselectedVehicleId?: string;
  mode?: 'appliance' | 'vehicle'; // Which type of maintenance
}

export function MaintenanceDialog({ isOpen, onClose, maintenance, preselectedApplianceId, preselectedVehicleId, mode = 'appliance' }: MaintenanceDialogProps) {
  const { data: appliances = [] } = useAppliances();
  const { data: vehicles = [] } = useVehicles();
  const { createMaintenance, updateMaintenance } = useMaintenanceActions();

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    applianceId: '',
    vehicleId: '',
    description: '',
    partNumber: '',
    frequency: '',
    frequencyUnit: 'months' as MaintenanceSchedule['frequencyUnit'],
    mileageInterval: '',
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
  const previewDueDate = purchaseDate && formData.frequency
    ? calculateNextDueDate(
        purchaseDate,
        parseInt(formData.frequency, 10),
        formData.frequencyUnit,
        isEditing ? lastCompletionDate : undefined
      )
    : null;

  // Reset form when dialog opens
  useEffect(() => {
    if (isOpen) {
      if (maintenance) {
        setFormData({
          applianceId: maintenance.applianceId || '',
          vehicleId: maintenance.vehicleId || '',
          description: maintenance.description,
          partNumber: maintenance.partNumber || '',
          frequency: maintenance.frequency.toString(),
          frequencyUnit: maintenance.frequencyUnit,
          mileageInterval: maintenance.mileageInterval?.toString() || '',
        });
      } else {
        setFormData({
          applianceId: preselectedApplianceId || '',
          vehicleId: preselectedVehicleId || '',
          description: '',
          partNumber: '',
          frequency: '',
          frequencyUnit: 'months',
          mileageInterval: '',
        });
      }
    }
  }, [isOpen, maintenance, preselectedApplianceId, preselectedVehicleId]);

  const handleSubmit = async () => {
    if (isVehicleMode && !formData.vehicleId) {
      toast({
        title: 'Vehicle required',
        description: 'Please select a vehicle.',
        variant: 'destructive',
      });
      return;
    }

    if (!isVehicleMode && !formData.applianceId) {
      toast({
        title: 'Appliance required',
        description: 'Please select an appliance.',
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

    const frequency = parseInt(formData.frequency, 10);
    if (!frequency || frequency < 1) {
      toast({
        title: 'Valid frequency required',
        description: 'Please enter a valid frequency number.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const mileageInterval = formData.mileageInterval ? parseInt(formData.mileageInterval, 10) : undefined;
      
      const data = {
        applianceId: isVehicleMode ? undefined : formData.applianceId,
        vehicleId: isVehicleMode ? formData.vehicleId : undefined,
        description: formData.description.trim(),
        partNumber: formData.partNumber.trim() || undefined,
        frequency,
        frequencyUnit: formData.frequencyUnit,
        mileageInterval: mileageInterval && mileageInterval > 0 ? mileageInterval : undefined,
      };

      if (isEditing && maintenance) {
        await updateMaintenance(maintenance.id, data);
        toast({
          title: 'Maintenance updated',
          description: 'Your maintenance schedule has been updated.',
        });
      } else {
        await createMaintenance(data);
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
            <div className="space-y-2">
              <Label>Appliance *</Label>
              <Select
                value={formData.applianceId}
                onValueChange={(value) => setFormData(prev => ({ ...prev, applianceId: value }))}
                disabled={isEditing}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an appliance" />
                </SelectTrigger>
                <SelectContent>
                  {appliances.length === 0 ? (
                    <div className="p-2 text-sm text-muted-foreground text-center">
                      No appliances found. Add an appliance first.
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

              {/* Show appliance purchase date if selected */}
              {selectedAppliance?.purchaseDate && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 p-2 rounded">
                  <Calendar className="h-4 w-4" />
                  <span>Installed/Purchased: {selectedAppliance.purchaseDate}</span>
                </div>
              )}
            </div>
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

          {/* Part Number */}
          <div className="space-y-2">
            <Label htmlFor="partNumber">Part Number</Label>
            <Input
              id="partNumber"
              value={formData.partNumber}
              onChange={(e) => setFormData(prev => ({ ...prev, partNumber: e.target.value }))}
              placeholder="Optional part number"
            />
          </div>

          {/* Frequency */}
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
                  frequencyUnit: value as MaintenanceSchedule['frequencyUnit']
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

          {/* Mileage Interval (for vehicles only) */}
          {isVehicleMode && (
            <div className="space-y-2">
              <Label htmlFor="mileageInterval">Mileage Interval (optional)</Label>
              <Input
                id="mileageInterval"
                type="number"
                min="1"
                value={formData.mileageInterval}
                onChange={(e) => setFormData(prev => ({ ...prev, mileageInterval: e.target.value }))}
                placeholder="e.g., 5000 (miles between service)"
              />
              <p className="text-xs text-muted-foreground">
                Optional: Track maintenance by mileage in addition to time
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
            disabled={isSubmitting || (isVehicleMode ? vehicles.length === 0 : appliances.length === 0)}
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
