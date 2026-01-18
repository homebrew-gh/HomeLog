import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { RelayListManager } from '@/components/RelayListManager';

interface RelayManagementDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function RelayManagementDialog({ isOpen, onClose }: RelayManagementDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] sm:max-w-lg max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Relays</DialogTitle>
        </DialogHeader>

        <div className="py-4">
          <p className="text-sm text-muted-foreground mb-4">
            Nostr relays are servers that store and distribute your data. Add or remove relays to control where your appliance and maintenance data is saved.
          </p>
          
          <RelayListManager />
        </div>
      </DialogContent>
    </Dialog>
  );
}
