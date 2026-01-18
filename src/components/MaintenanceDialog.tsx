import { useState, useEffect } from 'react';
import { Calendar, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAppliances } from '@/hooks/useAppliances';
import { useMaintenanceActions, calculateNextDueDate, formatDueDate } from '@/hooks/useMaintenance';
import { useCompletionsByMaintenance } from '@/hooks/useMaintenanceCompletions';
import { toast } from '@/hooks/useToast';
import { FREQUENCY_UNITS, type MaintenanceSchedule } from '@/lib/types';

interface MaintenanceDialogProps {
  isOpen: boolean;
  onClose: () => void;
  maintenance?: MaintenanceSchedule; // If provided, we're editing
  preselectedApplianceId?: string;
}

export function MaintenanceDialog({ isOpen, onClose, maintenance, preselectedApplianceId }: MaintenanceDialogProps) {
  const { data: appliances = [] } = useAppliances();
  const { createMaintenance, updateMaintenance } = useMaintenanceActions();

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    applianceId: '',
    description: '',
    partNumber: '',
    frequency: '',
    frequencyUnit: 'months' as MaintenanceSchedule['frequencyUnit'],
  });

  const isEditing = !!maintenance;

  // Get the selected appliance for displaying purchase date
  const selectedAppliance = appliances.find(a => a.id === formData.applianceId);

  // Get completions for this maintenance (only relevant when editing)
  const completions = useCompletionsByMaintenance(maintenance?.id);
  const lastCompletionDate = completions.length > 0 ? completions[0].completedDate : undefined;

  // Calculate preview of next due date
  const previewDueDate = selectedAppliance?.purchaseDate && formData.frequency
    ? calculateNextDueDate(
        selectedAppliance.purchaseDate,
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
          applianceId: maintenance.applianceId,
          description: maintenance.description,
          partNumber: maintenance.partNumber || '',
          frequency: maintenance.frequency.toString(),
          frequencyUnit: maintenance.frequencyUnit,
        });
      } else {
        setFormData({
          applianceId: preselectedApplianceId || '',
          description: '',
          partNumber: '',
          frequency: '',
          frequencyUnit: 'months',
        });
      }
    }
  }, [isOpen, maintenance, preselectedApplianceId]);

  const handleSubmit = async () => {
    if (!formData.applianceId) {
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
      const data = {
        applianceId: formData.applianceId,
        description: formData.description.trim(),
        partNumber: formData.partNumber.trim() || undefined,
        frequency,
        frequencyUnit: formData.frequencyUnit,
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
          <DialogTitle>{isEditing ? 'Edit Maintenance' : 'Add Maintenance Schedule'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Appliance Selection */}
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
          <Button onClick={handleSubmit} disabled={isSubmitting || appliances.length === 0}>
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
