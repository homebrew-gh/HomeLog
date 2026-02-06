import { useState, useMemo } from 'react';
import { Archive, Trash2, AlertTriangle, Wrench, CreditCard, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useMaintenance, useMaintenanceActions } from '@/hooks/useMaintenance';
import { useSubscriptions, useSubscriptionActions } from '@/hooks/useSubscriptions';
import { useWarranties, useWarrantyActions } from '@/hooks/useWarranties';
import { useMaintenanceCompletionActions } from '@/hooks/useMaintenanceCompletions';
import { toast } from '@/hooks/useToast';
import type { Vehicle, Appliance, Pet } from '@/lib/types';
import { logger } from '@/lib/logger';

type AssetType = 'vehicle' | 'appliance' | 'pet';

interface LinkedItem {
  tabName: string;
  icon: React.ReactNode;
  items: { id: string; name: string }[];
  action: 'archive' | 'delete' | 'none';
}

interface ArchiveConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  assetType: AssetType;
  asset: Vehicle | Appliance | Pet;
  onConfirm: () => Promise<void>;
}

export function ArchiveConfirmDialog({
  isOpen,
  onClose,
  assetType,
  asset,
  onConfirm,
}: ArchiveConfirmDialogProps) {
  const { data: maintenance = [] } = useMaintenance();
  const { data: subscriptions = [] } = useSubscriptions();
  const { data: warranties = [] } = useWarranties();

  const { archiveMaintenance, deleteMaintenance } = useMaintenanceActions();
  const { archiveSubscription, deleteSubscription } = useSubscriptionActions();
  const { archiveWarranty, deleteWarranty } = useWarrantyActions();
  const { deleteCompletionsByMaintenanceId } = useMaintenanceCompletionActions();

  const [isProcessing, setIsProcessing] = useState(false);
  const [linkedActions, setLinkedActions] = useState<Record<string, 'archive' | 'delete' | 'none'>>({});

  // Find linked items for the asset
  const linkedItems = useMemo(() => {
    const items: LinkedItem[] = [];
    const assetId = asset.id;

    // Find linked maintenance
    const linkedMaintenance = maintenance.filter(m => {
      if (assetType === 'vehicle') return m.vehicleId === assetId;
      return m.applianceId === assetId;
    });

    if (linkedMaintenance.length > 0) {
      items.push({
        tabName: 'Maintenance',
        icon: <Wrench className="h-4 w-4" />,
        items: linkedMaintenance.map(m => ({ id: m.id, name: m.description })),
        action: linkedActions['maintenance'] || 'archive',
      });
    }

    // Find linked subscriptions
    const linkedSubscriptions = subscriptions.filter(s => 
      s.linkedAssetType === assetType && s.linkedAssetId === assetId
    );

    if (linkedSubscriptions.length > 0) {
      items.push({
        tabName: 'Subscriptions',
        icon: <CreditCard className="h-4 w-4" />,
        items: linkedSubscriptions.map(s => ({ id: s.id, name: s.name })),
        action: linkedActions['subscriptions'] || 'archive',
      });
    }

    // Find linked warranties
    const linkedWarranties = warranties.filter(w => 
      w.linkedType === assetType && w.linkedItemId === assetId
    );

    if (linkedWarranties.length > 0) {
      items.push({
        tabName: 'Warranties',
        icon: <Shield className="h-4 w-4" />,
        items: linkedWarranties.map(w => ({ id: w.id, name: w.name })),
        action: linkedActions['warranties'] || 'archive',
      });
    }

    // Companies are not linked directly, but maintenance/subscriptions are
    // We'll handle companies separately if needed

    return items;
  }, [maintenance, subscriptions, warranties, asset.id, assetType, linkedActions]);

  // Initialize default actions when dialog opens
  useState(() => {
    const defaults: Record<string, 'archive' | 'delete' | 'none'> = {};
    linkedItems.forEach(item => {
      defaults[item.tabName.toLowerCase()] = 'archive';
    });
    setLinkedActions(defaults);
  });

  const handleActionChange = (tabKey: string, action: 'archive' | 'delete' | 'none') => {
    setLinkedActions(prev => ({
      ...prev,
      [tabKey]: action,
    }));
  };

  const hasLinkedItems = linkedItems.length > 0;
  const assetName = assetType === 'vehicle' 
    ? (asset as Vehicle).name 
    : assetType === 'pet' 
      ? (asset as Pet).name 
      : (asset as Appliance).model;

  const handleConfirm = async () => {
    setIsProcessing(true);
    try {
      // Process linked items based on selected actions
      for (const linked of linkedItems) {
        const tabKey = linked.tabName.toLowerCase();
        const action = linkedActions[tabKey] || 'archive';

        if (action === 'none') continue;

        for (const item of linked.items) {
          try {
            if (tabKey === 'maintenance') {
              if (action === 'archive') {
                await archiveMaintenance(item.id, true);
              } else if (action === 'delete') {
                // Delete completions first, then maintenance
                await deleteCompletionsByMaintenanceId(item.id);
                await deleteMaintenance(item.id);
              }
            } else if (tabKey === 'subscriptions') {
              if (action === 'archive') {
                await archiveSubscription(item.id, true);
              } else if (action === 'delete') {
                await deleteSubscription(item.id);
              }
            } else if (tabKey === 'warranties') {
              if (action === 'archive') {
                await archiveWarranty(item.id, true);
              } else if (action === 'delete') {
                await deleteWarranty(item.id);
              }
            }
          } catch (error) {
            logger.error(`Failed to ${action} ${tabKey} item:`, error);
          }
        }
      }

      // Archive the main asset
      await onConfirm();

      const assetLabel = assetType === 'vehicle' ? 'Vehicle' : assetType === 'pet' ? 'Pet' : 'Appliance';
      toast({
        title: `${assetLabel} archived`,
        description: hasLinkedItems 
          ? 'The item and linked records have been processed.'
          : 'The item has been archived.',
      });

      onClose();
    } catch (error) {
      logger.error('Failed to archive:', error);
      toast({
        title: 'Error',
        description: 'Failed to archive the item. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Archive className="h-5 w-5 text-amber-500" />
            Archive {assetType === 'vehicle' ? 'Vehicle' : assetType === 'pet' ? 'Pet' : 'Appliance'}
          </DialogTitle>
          <DialogDescription>
            Archive "{assetName}" and manage linked records.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {!hasLinkedItems ? (
            <p className="text-sm text-muted-foreground">
              This {assetType} has no linked records. It will be moved to the archived section and hidden from the main view.
            </p>
          ) : (
            <>
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  This {assetType} has linked records in other tabs. Choose how to handle each:
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                {linkedItems.map((linked) => {
                  const tabKey = linked.tabName.toLowerCase();
                  const currentAction = linkedActions[tabKey] || 'archive';

                  return (
                    <div key={tabKey} className="border rounded-lg p-3 space-y-3">
                      <div className="flex items-center gap-2 font-medium">
                        {linked.icon}
                        <span>{linked.tabName}</span>
                        <span className="ml-auto text-sm text-muted-foreground">
                          {linked.items.length} item{linked.items.length !== 1 ? 's' : ''}
                        </span>
                      </div>

                      <div className="pl-6 space-y-1 text-sm text-muted-foreground max-h-20 overflow-y-auto">
                        {linked.items.map(item => (
                          <div key={item.id} className="truncate">
                            • {item.name}
                          </div>
                        ))}
                      </div>

                      <div className="flex gap-4 pt-2 border-t">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={`${tabKey}-archive`}
                            checked={currentAction === 'archive'}
                            onCheckedChange={(checked) => {
                              if (checked) handleActionChange(tabKey, 'archive');
                            }}
                          />
                          <Label 
                            htmlFor={`${tabKey}-archive`}
                            className="text-sm cursor-pointer flex items-center gap-1"
                          >
                            <Archive className="h-3 w-3" />
                            Archive
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={`${tabKey}-delete`}
                            checked={currentAction === 'delete'}
                            onCheckedChange={(checked) => {
                              if (checked) handleActionChange(tabKey, 'delete');
                            }}
                          />
                          <Label 
                            htmlFor={`${tabKey}-delete`}
                            className="text-sm cursor-pointer flex items-center gap-1 text-destructive"
                          >
                            <Trash2 className="h-3 w-3" />
                            Delete
                          </Label>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} disabled={isProcessing}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={isProcessing}>
            {isProcessing ? 'Processing...' : 'Archive'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
