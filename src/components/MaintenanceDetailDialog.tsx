import { useState, useEffect } from 'react';
import { Calendar, Clock, Package, Wrench, Edit, Trash2, AlertTriangle, CheckCircle, Check, Car, Gauge, TreePine, ClipboardList } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { useApplianceById } from '@/hooks/useAppliances';
import { useVehicleById } from '@/hooks/useVehicles';
import { useMaintenanceActions, calculateNextDueDate, formatDueDate, isOverdue, isDueSoon } from '@/hooks/useMaintenance';
import { useMaintenanceCompletionActions, useCompletionsByMaintenance } from '@/hooks/useMaintenanceCompletions';
import { toast } from '@/hooks/useToast';
import type { MaintenanceSchedule } from '@/lib/types';

interface MaintenanceDetailDialogProps {
  isOpen: boolean;
  onClose: () => void;
  maintenance: MaintenanceSchedule;
  onEdit: () => void;
}

// Get today's date in MM/DD/YYYY format
function getTodayFormatted(): string {
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const year = today.getFullYear();
  return `${month}/${day}/${year}`;
}

export function MaintenanceDetailDialog({ isOpen, onClose, maintenance, onEdit }: MaintenanceDetailDialogProps) {
  const { deleteMaintenance } = useMaintenanceActions();
  const { createCompletion } = useMaintenanceCompletionActions();
  const appliance = useApplianceById(maintenance.applianceId);
  const vehicle = useVehicleById(maintenance.vehicleId);
  const completions = useCompletionsByMaintenance(maintenance.id);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Determine if this is vehicle maintenance
  const isVehicleMaintenance = !!maintenance.vehicleId;

  // Completion form state
  const [showCompletionForm, setShowCompletionForm] = useState(false);
  const [completionDate, setCompletionDate] = useState('');
  const [completionMileage, setCompletionMileage] = useState('');
  const [useToday, setUseToday] = useState(false);
  const [isSubmittingCompletion, setIsSubmittingCompletion] = useState(false);

  // Reset completion form when dialog opens/closes
  useEffect(() => {
    if (isOpen) {
      setShowCompletionForm(false);
      setCompletionDate('');
      setCompletionMileage('');
      setUseToday(false);
    }
  }, [isOpen]);

  const purchaseDate = isVehicleMaintenance ? (vehicle?.purchaseDate || '') : (appliance?.purchaseDate || '');

  // Get the most recent completion date (completions are already sorted newest first)
  const lastCompletionDate = completions.length > 0 ? completions[0].completedDate : undefined;

  // Check if this is log-only maintenance
  const isLogOnly = maintenance.isLogOnly;

  // Only calculate due dates for scheduled (non-log-only) maintenance
  const nextDueDate = !isLogOnly && maintenance.frequency && maintenance.frequencyUnit
    ? calculateNextDueDate(purchaseDate, maintenance.frequency, maintenance.frequencyUnit, lastCompletionDate)
    : null;
  const overdue = !isLogOnly && purchaseDate && maintenance.frequency && maintenance.frequencyUnit
    ? isOverdue(purchaseDate, maintenance.frequency, maintenance.frequencyUnit, lastCompletionDate)
    : false;
  const dueSoon = !isLogOnly && purchaseDate && maintenance.frequency && maintenance.frequencyUnit
    ? isDueSoon(purchaseDate, maintenance.frequency, maintenance.frequencyUnit, lastCompletionDate)
    : false;

  const getFrequencyLabel = () => {
    if (!maintenance.frequency || !maintenance.frequencyUnit) return '';
    const unit = maintenance.frequencyUnit;
    const freq = maintenance.frequency;
    const unitLabel = freq === 1 ? unit.slice(0, -1) : unit;
    return `Every ${freq} ${unitLabel}`;
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteMaintenance(maintenance.id);
      toast({
        title: 'Maintenance deleted',
        description: 'The maintenance schedule has been removed.',
      });
      onClose();
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to delete maintenance. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleEdit = () => {
    onClose();
    onEdit();
  };

  const handleSubmitCompletion = async () => {
    // Determine which date to use
    const dateToUse = useToday ? getTodayFormatted() : completionDate;

    if (!dateToUse.trim()) {
      toast({
        title: 'Date required',
        description: 'Please enter a completion date or select "Today".',
        variant: 'destructive',
      });
      return;
    }

    // Validate date format MM/DD/YYYY
    const dateRegex = /^(0[1-9]|1[0-2])\/(0[1-9]|[12]\d|3[01])\/\d{4}$/;
    if (!dateRegex.test(dateToUse)) {
      toast({
        title: 'Invalid date format',
        description: 'Please enter the date in MM/DD/YYYY format.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmittingCompletion(true);
    try {
      // Pass mileage only if it's vehicle maintenance and a value was entered
      const mileageValue = isVehicleMaintenance && completionMileage.trim() ? completionMileage.trim() : undefined;
      await createCompletion(maintenance.id, dateToUse, mileageValue);
      
      const mileageInfo = mileageValue ? ` at ${Number(mileageValue).toLocaleString()} miles` : '';
      toast({
        title: 'Maintenance completed',
        description: `Marked as completed on ${dateToUse}${mileageInfo}.`,
      });
      setShowCompletionForm(false);
      setCompletionDate('');
      setCompletionMileage('');
      setUseToday(false);
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to record completion. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmittingCompletion(false);
    }
  };

  const handleTodayChange = (checked: boolean) => {
    setUseToday(checked);
    if (checked) {
      setCompletionDate(''); // Clear manual input when "Today" is selected
    }
  };

  const handleDateInputChange = (value: string) => {
    setCompletionDate(value);
    if (value) {
      setUseToday(false); // Uncheck "Today" when manually entering a date
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 flex-wrap">
              {isLogOnly ? (
                <ClipboardList className="h-5 w-5 text-blue-600" />
              ) : (
                <Wrench className="h-5 w-5" />
              )}
              <span>{maintenance.description}</span>
              {isLogOnly ? (
                <Badge variant="secondary" className="ml-auto bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                  <ClipboardList className="h-3 w-3 mr-1" />
                  Log Only
                </Badge>
              ) : overdue ? (
                <Badge variant="destructive" className="ml-auto">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Overdue
                </Badge>
              ) : dueSoon ? (
                <Badge variant="secondary" className="ml-auto bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                  <Clock className="h-3 w-3 mr-1" />
                  Due Soon
                </Badge>
              ) : nextDueDate ? (
                <Badge variant="secondary" className="ml-auto bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  On Track
                </Badge>
              ) : null}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Show Vehicle info for vehicle maintenance */}
            {isVehicleMaintenance && vehicle && (
              <div className="flex items-start gap-3">
                <Car className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Vehicle</p>
                  <p>{vehicle.name}</p>
                  <p className="text-sm text-muted-foreground">{vehicle.vehicleType}</p>
                </div>
              </div>
            )}

            {/* Show Appliance info for appliance maintenance */}
            {!isVehicleMaintenance && appliance && (
              <div className="flex items-start gap-3">
                <Package className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Appliance</p>
                  <p>{appliance.model}</p>
                  {appliance.room && (
                    <p className="text-sm text-muted-foreground">{appliance.room}</p>
                  )}
                </div>
              </div>
            )}

            {/* Show Home Feature info */}
            {!isVehicleMaintenance && maintenance.homeFeature && (
              <div className="flex items-start gap-3">
                <TreePine className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Home Feature</p>
                  <p>{maintenance.homeFeature}</p>
                </div>
              </div>
            )}

            {/* Frequency - only for scheduled maintenance */}
            {!isLogOnly && maintenance.frequency && maintenance.frequencyUnit && (
              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Frequency</p>
                  <p>{getFrequencyLabel()}</p>
                </div>
              </div>
            )}

            {/* Log Only indicator */}
            {isLogOnly && (
              <div className="flex items-start gap-3">
                <ClipboardList className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Tracking Type</p>
                  <p className="text-blue-600 dark:text-blue-400">Log Only - No recurring schedule</p>
                </div>
              </div>
            )}

            {maintenance.partNumber && (
              <div className="flex items-start gap-3">
                <Package className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Part Number</p>
                  <p className="font-mono">{maintenance.partNumber}</p>
                </div>
              </div>
            )}

            {purchaseDate && (
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {isVehicleMaintenance ? 'Vehicle Purchase Date' : 'Appliance Install Date'}
                  </p>
                  <p>{purchaseDate}</p>
                </div>
              </div>
            )}

            {/* Show mileage interval for scheduled vehicle maintenance */}
            {isVehicleMaintenance && !isLogOnly && maintenance.mileageInterval && (
              <div className="flex items-start gap-3">
                <Gauge className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Mileage Interval</p>
                  <p>Every {maintenance.mileageInterval.toLocaleString()} miles</p>
                </div>
              </div>
            )}

            {/* Due Date section - only for scheduled maintenance */}
            {!isLogOnly && nextDueDate && (
              <div className={`flex items-start gap-3 p-3 rounded-lg ${
                overdue
                  ? 'bg-red-50 dark:bg-red-950/30'
                  : dueSoon
                    ? 'bg-amber-50 dark:bg-amber-950/30'
                    : 'bg-green-50 dark:bg-green-950/30'
              }`}>
                <Calendar className={`h-5 w-5 shrink-0 mt-0.5 ${
                  overdue
                    ? 'text-red-600 dark:text-red-400'
                    : dueSoon
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-green-600 dark:text-green-400'
                }`} />
                <div>
                  <p className={`text-sm font-medium ${
                    overdue
                      ? 'text-red-700 dark:text-red-300'
                      : dueSoon
                        ? 'text-amber-700 dark:text-amber-300'
                        : 'text-green-700 dark:text-green-300'
                  }`}>
                    Next Due Date
                  </p>
                  <p className={`font-semibold ${
                    overdue
                      ? 'text-red-900 dark:text-red-100'
                      : dueSoon
                        ? 'text-amber-900 dark:text-amber-100'
                        : 'text-green-900 dark:text-green-100'
                  }`}>
                    {formatDueDate(nextDueDate)}
                  </p>
                </div>
              </div>
            )}

            {/* Last Completed section - for log-only maintenance */}
            {isLogOnly && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30">
                <Calendar className="h-5 w-5 shrink-0 mt-0.5 text-blue-600 dark:text-blue-400" />
                <div>
                  <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
                    Last Completed
                  </p>
                  <p className="font-semibold text-blue-900 dark:text-blue-100">
                    {lastCompletionDate || 'No records yet'}
                  </p>
                </div>
              </div>
            )}

            {/* Mark as Completed Section */}
            {!showCompletionForm ? (
              <Button
                onClick={() => setShowCompletionForm(true)}
                className="w-full bg-green-600 hover:bg-green-700 text-white"
              >
                <Check className="h-4 w-4 mr-2" />
                Mark as Completed
              </Button>
            ) : (
              <div className="space-y-3 p-3 rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30">
                <p className="text-sm font-medium text-green-800 dark:text-green-200">
                  Record Completion
                </p>

                <div className="space-y-2">
                  <Label htmlFor="completionDate" className="text-sm">
                    Completion Date (MM/DD/YYYY)
                  </Label>
                  <Input
                    id="completionDate"
                    value={completionDate}
                    onChange={(e) => handleDateInputChange(e.target.value)}
                    placeholder="MM/DD/YYYY"
                    disabled={useToday || isSubmittingCompletion}
                    className={useToday ? 'opacity-50' : ''}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="useToday"
                    checked={useToday}
                    onCheckedChange={handleTodayChange}
                    disabled={isSubmittingCompletion}
                  />
                  <Label
                    htmlFor="useToday"
                    className="text-sm font-normal cursor-pointer"
                  >
                    Today ({getTodayFormatted()})
                  </Label>
                </div>

                {/* Mileage input for vehicle maintenance */}
                {isVehicleMaintenance && (
                  <div className="space-y-2">
                    <Label htmlFor="completionMileage" className="text-sm flex items-center gap-2">
                      <Gauge className="h-4 w-4" />
                      Current Mileage (optional)
                    </Label>
                    <Input
                      id="completionMileage"
                      type="number"
                      min="0"
                      value={completionMileage}
                      onChange={(e) => setCompletionMileage(e.target.value)}
                      placeholder="e.g., 45000"
                      disabled={isSubmittingCompletion}
                    />
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    onClick={handleSubmitCompletion}
                    disabled={isSubmittingCompletion || (!completionDate && !useToday)}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    {isSubmittingCompletion ? 'Saving...' : 'Confirm'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowCompletionForm(false);
                      setCompletionDate('');
                      setUseToday(false);
                    }}
                    disabled={isSubmittingCompletion}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-between pt-4 border-t">
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleEdit}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
              <Button variant="destructive" onClick={() => setShowDeleteConfirm(true)}>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </div>
            <Button variant="ghost" onClick={onClose}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Maintenance Schedule?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this maintenance schedule. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
