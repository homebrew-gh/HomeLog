import { useState } from 'react';
import { Plus, Trash2, AlertTriangle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { usePetTypes } from '@/hooks/usePetTypes';
import { usePets } from '@/hooks/usePets';
import { toast } from '@/hooks/useToast';

interface PetTypeManagementDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PetTypeManagementDialog({ isOpen, onClose }: PetTypeManagementDialogProps) {
  const { 
    customPetTypes, 
    visibleDefaultTypes,
    hiddenDefaultPetTypes,
    allPetTypes,
    addCustomPetType, 
    removeType,
    restoreDefaultPetType,
    isDefaultType: _isDefaultType,
  } = usePetTypes();
  const { data: pets = [] } = usePets();
  const [newType, setNewType] = useState('');
  const [typeWithPets, setTypeWithPets] = useState<{ name: string; count: number } | null>(null);

  const handleAddType = () => {
    const trimmed = newType.trim();
    if (!trimmed) {
      toast({
        title: 'Type name required',
        description: 'Please enter a pet type name.',
        variant: 'destructive',
      });
      return;
    }

    // Check if already exists in visible types
    if (allPetTypes.some(t => t.toLowerCase() === trimmed.toLowerCase())) {
      toast({
        title: 'Type already exists',
        description: 'This pet type is already in your list.',
        variant: 'destructive',
      });
      return;
    }

    // Check if it's a hidden default type - if so, restore it instead
    if (hiddenDefaultPetTypes.some(t => t.toLowerCase() === trimmed.toLowerCase())) {
      const matchingType = hiddenDefaultPetTypes.find(t => t.toLowerCase() === trimmed.toLowerCase());
      if (matchingType) {
        restoreDefaultPetType(matchingType);
        setNewType('');
        toast({
          title: 'Type restored',
          description: `"${matchingType}" has been restored to your pet types.`,
        });
        return;
      }
    }

    addCustomPetType(trimmed);
    setNewType('');
    toast({
      title: 'Type added',
      description: `"${trimmed}" has been added to your pet types.`,
    });
  };

  const handleRemoveType = (type: string) => {
    // Check if any pets are assigned to this type
    const petsWithType = pets.filter(p => p.petType === type);

    if (petsWithType.length > 0) {
      // Show warning dialog
      setTypeWithPets({ name: type, count: petsWithType.length });
      return;
    }

    // Safe to delete/hide
    removeType(type);
    toast({
      title: 'Type removed',
      description: `"${type}" has been removed from your pet types.`,
    });
  };

  const handleRestoreType = (type: string) => {
    restoreDefaultPetType(type);
    toast({
      title: 'Type restored',
      description: `"${type}" has been restored to your pet types.`,
    });
  };

  const handleClose = () => {
    setNewType('');
    onClose();
  };

  // Sort types alphabetically for display
  const sortedVisibleDefaultTypes = [...visibleDefaultTypes].sort((a, b) =>
    a.toLowerCase().localeCompare(b.toLowerCase())
  );
  const sortedCustomTypes = [...customPetTypes].sort((a, b) =>
    a.toLowerCase().localeCompare(b.toLowerCase())
  );
  const sortedHiddenTypes = [...hiddenDefaultPetTypes].sort((a, b) =>
    a.toLowerCase().localeCompare(b.toLowerCase())
  );

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-[95vw] sm:max-w-md max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Pet Types</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Add new type */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Add Custom Type</label>
            <div className="flex gap-2">
              <Input
                value={newType}
                onChange={(e) => setNewType(e.target.value)}
                placeholder="Enter type name"
                className="flex-1"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddType();
                  }
                }}
              />
              <Button onClick={handleAddType} size="icon">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Custom Types */}
          {sortedCustomTypes.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Custom Types</label>
              <div className="space-y-1">
                {sortedCustomTypes.map((type) => (
                  <div
                    key={type}
                    className="flex items-center justify-between p-2 rounded-lg bg-sky-50 dark:bg-slate-800 border border-sky-200 dark:border-slate-700"
                  >
                    <span className="text-sm">{type}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleRemoveType(type)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Default Types (visible) */}
          {sortedVisibleDefaultTypes.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Default Types</label>
              <div className="space-y-1">
                {sortedVisibleDefaultTypes.map((type) => (
                  <div
                    key={type}
                    className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                  >
                    <span className="text-sm">{type}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleRemoveType(type)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Hidden/Deleted Default Types */}
          {sortedHiddenTypes.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Deleted Types</label>
              <p className="text-xs text-muted-foreground">
                These default types have been removed. Click to restore them.
              </p>
              <div className="space-y-1">
                {sortedHiddenTypes.map((type) => (
                  <div
                    key={type}
                    className="flex items-center justify-between p-2 rounded-lg bg-muted/30 border border-dashed border-muted"
                  >
                    <span className="text-sm text-muted-foreground line-through">{type}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-900/30"
                      onClick={() => handleRestoreType(type)}
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

      {/* Warning dialog for types with pets */}
      <AlertDialog open={!!typeWithPets} onOpenChange={() => setTypeWithPets(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Cannot Delete Type
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                The type "{typeWithPets?.name}" has {typeWithPets?.count} pet{typeWithPets?.count !== 1 ? 's' : ''} assigned to it.
              </p>
              <p>
                To delete this type, please first delete or change the type of all pets with this type.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setTypeWithPets(null)}>
              Understood
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
