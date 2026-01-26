import { useState } from 'react';
import { Plus, Trash2, Wrench, Check, Car } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useMaintenanceActions } from '@/hooks/useMaintenance';
import { toast } from '@/hooks/useToast';
import { FREQUENCY_UNITS, type MaintenanceSchedule } from '@/lib/types';

interface MaintenanceTask {
  id: string;
  description: string;
  frequency: string;
  frequencyUnit: MaintenanceSchedule['frequencyUnit'];
  mileageInterval: string;
  partNumber: string;
}

interface VehicleMaintenanceWizardProps {
  isOpen: boolean;
  onClose: () => void;
  vehicleId: string;
  vehicleName: string;
}

// Common maintenance tasks for quick selection
const COMMON_VEHICLE_MAINTENANCE = [
  { description: 'Oil Change', frequency: '3', frequencyUnit: 'months' as const, mileageInterval: '5000' },
  { description: 'Tire Rotation', frequency: '6', frequencyUnit: 'months' as const, mileageInterval: '7500' },
  { description: 'Air Filter Replacement', frequency: '12', frequencyUnit: 'months' as const, mileageInterval: '15000' },
  { description: 'Brake Inspection', frequency: '12', frequencyUnit: 'months' as const, mileageInterval: '12000' },
  { description: 'Coolant Flush', frequency: '2', frequencyUnit: 'years' as const, mileageInterval: '30000' },
  { description: 'Transmission Fluid', frequency: '2', frequencyUnit: 'years' as const, mileageInterval: '30000' },
  { description: 'Spark Plugs', frequency: '3', frequencyUnit: 'years' as const, mileageInterval: '30000' },
  { description: 'Battery Check', frequency: '6', frequencyUnit: 'months' as const, mileageInterval: '' },
  { description: 'Wiper Blades', frequency: '12', frequencyUnit: 'months' as const, mileageInterval: '' },
  { description: 'Cabin Air Filter', frequency: '12', frequencyUnit: 'months' as const, mileageInterval: '15000' },
];

export function VehicleMaintenanceWizard({ isOpen, onClose, vehicleId, vehicleName }: VehicleMaintenanceWizardProps) {
  const { createMaintenance } = useMaintenanceActions();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tasks, setTasks] = useState<MaintenanceTask[]>([]);
  
  // Form for adding a new custom task
  const [newTask, setNewTask] = useState<MaintenanceTask>({
    id: '',
    description: '',
    frequency: '3',
    frequencyUnit: 'months',
    mileageInterval: '',
    partNumber: '',
  });

  const addCommonTask = (task: typeof COMMON_VEHICLE_MAINTENANCE[0]) => {
    // Check if already added
    if (tasks.some(t => t.description.toLowerCase() === task.description.toLowerCase())) {
      toast({
        title: 'Task already added',
        description: `"${task.description}" is already in your list.`,
      });
      return;
    }

    setTasks(prev => [...prev, {
      id: crypto.randomUUID(),
      description: task.description,
      frequency: task.frequency,
      frequencyUnit: task.frequencyUnit,
      mileageInterval: task.mileageInterval,
      partNumber: '',
    }]);
  };

  const addCustomTask = () => {
    if (!newTask.description.trim()) {
      toast({
        title: 'Description required',
        description: 'Please enter a task description.',
        variant: 'destructive',
      });
      return;
    }

    if (!newTask.frequency || parseInt(newTask.frequency, 10) < 1) {
      toast({
        title: 'Valid frequency required',
        description: 'Please enter a valid frequency number.',
        variant: 'destructive',
      });
      return;
    }

    setTasks(prev => [...prev, {
      ...newTask,
      id: crypto.randomUUID(),
    }]);

    // Reset form
    setNewTask({
      id: '',
      description: '',
      frequency: '3',
      frequencyUnit: 'months',
      mileageInterval: '',
      partNumber: '',
    });
  };

  const removeTask = (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  const updateTask = (id: string, updates: Partial<MaintenanceTask>) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  };

  const handleSubmit = async () => {
    if (tasks.length === 0) {
      toast({
        title: 'No tasks added',
        description: 'Add at least one maintenance task or click "Skip" to close.',
      });
      return;
    }

    setIsSubmitting(true);
    let successCount = 0;
    let errorCount = 0;

    for (const task of tasks) {
      try {
        await createMaintenance({
          vehicleId,
          description: task.description,
          frequency: parseInt(task.frequency, 10),
          frequencyUnit: task.frequencyUnit,
          mileageInterval: task.mileageInterval ? parseInt(task.mileageInterval, 10) : undefined,
          partNumber: task.partNumber || undefined,
        });
        successCount++;
      } catch (error) {
        console.error('Failed to create maintenance task:', error);
        errorCount++;
      }
    }

    setIsSubmitting(false);

    if (successCount > 0) {
      toast({
        title: 'Maintenance tasks created',
        description: `${successCount} maintenance task${successCount !== 1 ? 's' : ''} added for ${vehicleName}.`,
      });
    }

    if (errorCount > 0) {
      toast({
        title: 'Some tasks failed',
        description: `${errorCount} task${errorCount !== 1 ? 's' : ''} could not be created.`,
        variant: 'destructive',
      });
    }

    onClose();
  };

  const handleClose = () => {
    setTasks([]);
    setNewTask({
      id: '',
      description: '',
      frequency: '3',
      frequencyUnit: 'months',
      mileageInterval: '',
      partNumber: '',
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Add Maintenance Tasks
          </DialogTitle>
          <DialogDescription className="flex items-center gap-2">
            <Car className="h-4 w-4" />
            <span>{vehicleName}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Quick Add Common Tasks */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Quick Add Common Tasks</Label>
            <p className="text-sm text-muted-foreground">
              Click to add common maintenance tasks. You can customize the frequency after adding.
            </p>
            <div className="flex flex-wrap gap-2">
              {COMMON_VEHICLE_MAINTENANCE.map((task) => {
                const isAdded = tasks.some(t => t.description.toLowerCase() === task.description.toLowerCase());
                return (
                  <Button
                    key={task.description}
                    variant={isAdded ? "secondary" : "outline"}
                    size="sm"
                    onClick={() => addCommonTask(task)}
                    disabled={isAdded}
                    className="h-auto py-1.5"
                  >
                    {isAdded && <Check className="h-3 w-3 mr-1" />}
                    {task.description}
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Added Tasks */}
          {tasks.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-medium">Tasks to Create ({tasks.length})</Label>
              </div>
              <div className="space-y-2">
                {tasks.map((task) => (
                  <Card key={task.id}>
                    <CardContent className="p-3">
                      <div className="flex items-start gap-3">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{task.description}</span>
                            <Badge variant="outline" className="text-xs">
                              Every {task.frequency} {task.frequencyUnit}
                            </Badge>
                            {task.mileageInterval && (
                              <Badge variant="secondary" className="text-xs">
                                {parseInt(task.mileageInterval).toLocaleString()} mi
                              </Badge>
                            )}
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            <div>
                              <Label className="text-xs text-muted-foreground">Frequency</Label>
                              <Input
                                type="number"
                                min="1"
                                value={task.frequency}
                                onChange={(e) => updateTask(task.id, { frequency: e.target.value })}
                                className="h-8"
                              />
                            </div>
                            <div>
                              <Label className="text-xs text-muted-foreground">Unit</Label>
                              <Select
                                value={task.frequencyUnit}
                                onValueChange={(value) => updateTask(task.id, { frequencyUnit: value as MaintenanceSchedule['frequencyUnit'] })}
                              >
                                <SelectTrigger className="h-8">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {FREQUENCY_UNITS.map(({ value, label }) => (
                                    <SelectItem key={value} value={value}>{label}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label className="text-xs text-muted-foreground">Miles (optional)</Label>
                              <Input
                                type="number"
                                min="0"
                                value={task.mileageInterval}
                                onChange={(e) => updateTask(task.id, { mileageInterval: e.target.value })}
                                placeholder="e.g., 5000"
                                className="h-8"
                              />
                            </div>
                            <div>
                              <Label className="text-xs text-muted-foreground">Part # (optional)</Label>
                              <Input
                                value={task.partNumber}
                                onChange={(e) => updateTask(task.id, { partNumber: e.target.value })}
                                placeholder="Part number"
                                className="h-8"
                              />
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => removeTask(task.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Add Custom Task */}
          <div className="space-y-3 border-t pt-4">
            <Label className="text-base font-medium">Add Custom Task</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <Label className="text-xs text-muted-foreground">Task Description</Label>
                <Input
                  value={newTask.description}
                  onChange={(e) => setNewTask(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="e.g., Timing Belt Replacement"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs text-muted-foreground">Frequency</Label>
                  <Input
                    type="number"
                    min="1"
                    value={newTask.frequency}
                    onChange={(e) => setNewTask(prev => ({ ...prev, frequency: e.target.value }))}
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Unit</Label>
                  <Select
                    value={newTask.frequencyUnit}
                    onValueChange={(value) => setNewTask(prev => ({ ...prev, frequencyUnit: value as MaintenanceSchedule['frequencyUnit'] }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FREQUENCY_UNITS.map(({ value, label }) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs text-muted-foreground">Mileage Interval</Label>
                  <Input
                    type="number"
                    min="0"
                    value={newTask.mileageInterval}
                    onChange={(e) => setNewTask(prev => ({ ...prev, mileageInterval: e.target.value }))}
                    placeholder="Optional"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Part Number</Label>
                  <Input
                    value={newTask.partNumber}
                    onChange={(e) => setNewTask(prev => ({ ...prev, partNumber: e.target.value }))}
                    placeholder="Optional"
                  />
                </div>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={addCustomTask}
              className="w-full sm:w-auto"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Custom Task
            </Button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between gap-2 pt-4 border-t">
          <Button variant="ghost" onClick={handleClose} disabled={isSubmitting}>
            Skip
          </Button>
          <div className="flex gap-2">
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || tasks.length === 0}
            >
              {isSubmitting ? 'Creating...' : `Create ${tasks.length} Task${tasks.length !== 1 ? 's' : ''}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
