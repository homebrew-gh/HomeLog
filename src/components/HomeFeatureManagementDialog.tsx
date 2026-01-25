import { useState } from 'react';
import { Plus, Trash2, AlertTriangle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useCustomHomeFeatures } from '@/hooks/useCustomHomeFeatures';
import { useMaintenance } from '@/hooks/useMaintenance';
import { toast } from '@/hooks/useToast';

interface HomeFeatureManagementDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HomeFeatureManagementDialog({ isOpen, onClose }: HomeFeatureManagementDialogProps) {
  const { 
    customHomeFeatures, 
    visibleDefaultHomeFeatures,
    hiddenDefaultHomeFeatures,
    allHomeFeatures,
    addCustomHomeFeature, 
    removeHomeFeature,
    restoreDefaultHomeFeature,
    isDefaultHomeFeature,
  } = useCustomHomeFeatures();
  const { data: maintenance = [] } = useMaintenance();
  const [newFeature, setNewFeature] = useState('');
  const [featureWithMaintenance, setFeatureWithMaintenance] = useState<{ name: string; count: number } | null>(null);

  const handleAddFeature = () => {
    const trimmed = newFeature.trim();
    if (!trimmed) {
      toast({
        title: 'Feature name required',
        description: 'Please enter a home feature name.',
        variant: 'destructive',
      });
      return;
    }

    // Check if already exists in visible features
    if (allHomeFeatures.some(f => f.toLowerCase() === trimmed.toLowerCase())) {
      toast({
        title: 'Feature already exists',
        description: 'This home feature is already in your list.',
        variant: 'destructive',
      });
      return;
    }

    // Check if it's a hidden default feature - if so, restore it instead
    if (hiddenDefaultHomeFeatures.some(f => f.toLowerCase() === trimmed.toLowerCase())) {
      const matchingFeature = hiddenDefaultHomeFeatures.find(f => f.toLowerCase() === trimmed.toLowerCase());
      if (matchingFeature) {
        restoreDefaultHomeFeature(matchingFeature);
        setNewFeature('');
        toast({
          title: 'Feature restored',
          description: `"${matchingFeature}" has been restored to your home features.`,
        });
        return;
      }
    }

    addCustomHomeFeature(trimmed);
    setNewFeature('');
    toast({
      title: 'Feature added',
      description: `"${trimmed}" has been added to your home features.`,
    });
  };

  const handleRemoveFeature = (feature: string) => {
    // Check if any maintenance tasks are assigned to this feature
    const maintenanceWithFeature = maintenance.filter(m => m.homeFeature === feature);

    if (maintenanceWithFeature.length > 0) {
      // Show warning dialog
      setFeatureWithMaintenance({ name: feature, count: maintenanceWithFeature.length });
      return;
    }

    // Safe to delete/hide
    removeHomeFeature(feature);
    toast({
      title: 'Feature removed',
      description: `"${feature}" has been removed from your home features.`,
    });
  };

  const handleRestoreFeature = (feature: string) => {
    restoreDefaultHomeFeature(feature);
    toast({
      title: 'Feature restored',
      description: `"${feature}" has been restored to your home features.`,
    });
  };

  const handleClose = () => {
    setNewFeature('');
    onClose();
  };

  // Sort features alphabetically for display
  const sortedVisibleDefaultFeatures = [...visibleDefaultHomeFeatures].sort((a, b) =>
    a.toLowerCase().localeCompare(b.toLowerCase())
  );
  const sortedCustomFeatures = [...customHomeFeatures].sort((a, b) =>
    a.toLowerCase().localeCompare(b.toLowerCase())
  );
  const sortedHiddenFeatures = [...hiddenDefaultHomeFeatures].sort((a, b) =>
    a.toLowerCase().localeCompare(b.toLowerCase())
  );

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-[95vw] sm:max-w-md max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Home Features</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Add new feature */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Add Custom Home Feature</label>
            <div className="flex gap-2">
              <Input
                value={newFeature}
                onChange={(e) => setNewFeature(e.target.value)}
                placeholder="Enter feature name"
                className="flex-1"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddFeature();
                  }
                }}
              />
              <Button onClick={handleAddFeature} size="icon">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Custom Features */}
          {sortedCustomFeatures.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Custom Home Features</label>
              <div className="space-y-1">
                {sortedCustomFeatures.map((feature) => (
                  <div
                    key={feature}
                    className="flex items-center justify-between p-2 rounded-lg bg-sky-50 dark:bg-slate-800 border border-sky-200 dark:border-slate-700"
                  >
                    <span className="text-sm">{feature}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleRemoveFeature(feature)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Default Features (visible) */}
          {sortedVisibleDefaultFeatures.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Default Home Features</label>
              <div className="space-y-1">
                {sortedVisibleDefaultFeatures.map((feature) => (
                  <div
                    key={feature}
                    className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                  >
                    <span className="text-sm">{feature}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleRemoveFeature(feature)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Hidden/Deleted Default Features */}
          {sortedHiddenFeatures.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Deleted Features</label>
              <p className="text-xs text-muted-foreground">
                These default features have been removed. Click to restore them.
              </p>
              <div className="space-y-1">
                {sortedHiddenFeatures.map((feature) => (
                  <div
                    key={feature}
                    className="flex items-center justify-between p-2 rounded-lg bg-muted/30 border border-dashed border-muted"
                  >
                    <span className="text-sm text-muted-foreground line-through">{feature}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-900/30"
                      onClick={() => handleRestoreFeature(feature)}
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Close button */}
        <div className="flex justify-end pt-4 border-t">
          <Button variant="outline" onClick={handleClose}>
            Close
          </Button>
        </div>
      </DialogContent>

      {/* Warning dialog for features with maintenance */}
      <AlertDialog open={!!featureWithMaintenance} onOpenChange={() => setFeatureWithMaintenance(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Cannot Delete Feature
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                The home feature "{featureWithMaintenance?.name}" has {featureWithMaintenance?.count} maintenance task{featureWithMaintenance?.count !== 1 ? 's' : ''} assigned to it.
              </p>
              <p>
                To delete this feature, please first delete or reassign all maintenance tasks using this feature.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setFeatureWithMaintenance(null)}>
              Understood
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
