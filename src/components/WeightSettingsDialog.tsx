import { Scale } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useWeight } from '@/hooks/useWeight';

interface WeightSettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const WEIGHT_OPTIONS: { value: 'kg' | 'lb'; label: string }[] = [
  { value: 'kg', label: 'Kilograms (kg)' },
  { value: 'lb', label: 'Pounds (lb)' },
];

export function WeightSettingsDialog({ isOpen, onClose }: WeightSettingsDialogProps) {
  const {
    entryWeightUnit,
    displayWeightUnit,
    setEntryWeightUnit,
    setDisplayWeightUnit,
    getWeightUnitLabel,
  } = useWeight();

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scale className="h-5 w-5 text-primary" />
            Weight Units
          </DialogTitle>
          <DialogDescription>
            Configure how weights are displayed and entered for pets and vet visits.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-3">
            <Label className="text-base font-medium">Data Entry Weight Unit</Label>
            <p className="text-sm text-muted-foreground">
              The default unit used when entering weights in forms (e.g. pet weight, vet visit weight).
            </p>
            <Select
              value={entryWeightUnit}
              onValueChange={(v) => setEntryWeightUnit(v as 'kg' | 'lb')}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select unit" />
              </SelectTrigger>
              <SelectContent>
                {WEIGHT_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <Label className="text-base font-medium">Display Weight Unit</Label>
            <p className="text-sm text-muted-foreground">
              Convert and show all weights in this unit across the app.
            </p>
            <Select
              value={displayWeightUnit}
              onValueChange={(v) => setDisplayWeightUnit(v as 'kg' | 'lb')}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select unit" />
              </SelectTrigger>
              <SelectContent>
                {WEIGHT_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {entryWeightUnit !== displayWeightUnit && (
            <p className="text-sm text-muted-foreground">
              Weights entered in <strong>{getWeightUnitLabel(entryWeightUnit)}</strong> will be
              converted and displayed in <strong>{getWeightUnitLabel(displayWeightUnit)}</strong>.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
