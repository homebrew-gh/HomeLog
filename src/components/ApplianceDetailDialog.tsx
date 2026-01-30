import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Image, Calendar, Factory, Home, Edit, Trash2, DollarSign, Archive, ArchiveRestore } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { LoadingAnimation } from '@/components/LoadingAnimation';
import { ArchiveConfirmDialog } from '@/components/ArchiveConfirmDialog';
import { BlossomDocumentLink } from '@/components/BlossomMedia';
import { useApplianceActions } from '@/hooks/useAppliances';
import { toast } from '@/hooks/useToast';
import type { Appliance } from '@/lib/types';

interface ApplianceDetailDialogProps {
  isOpen: boolean;
  onClose: () => void;
  appliance: Appliance;
  onEdit: () => void;
  onDelete?: () => void;
}

export function ApplianceDetailDialog({ isOpen, onClose, appliance, onEdit, onDelete }: ApplianceDetailDialogProps) {
  const { deleteAppliance, archiveAppliance } = useApplianceActions();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);

  const handleDelete = async () => {
    setShowDeleteConfirm(false);
    setIsDeleting(true);
    try {
      await deleteAppliance(appliance.id);
      toast({
        title: 'Appliance deleted',
        description: 'The appliance has been removed.',
      });
      // Close dialog and notify parent of deletion
      onClose();
      onDelete?.();
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to delete appliance. Please try again.',
        variant: 'destructive',
      });
      setIsDeleting(false);
    }
  };

  // Show full-screen loading overlay during deletion
  if (isDeleting) {
    return (
      <Dialog open={true}>
        <DialogContent className="max-w-[95vw] sm:max-w-md" hideCloseButton>
          <LoadingAnimation 
            size="md" 
            message="Deleting Appliance" 
            subMessage="Please wait..."
          />
        </DialogContent>
      </Dialog>
    );
  }

  const handleEdit = () => {
    onClose();
    onEdit();
  };

  const handleArchiveConfirm = async () => {
    await archiveAppliance(appliance.id, !appliance.isArchived);
  };

  const handleQuickUnarchive = async () => {
    setIsArchiving(true);
    try {
      await archiveAppliance(appliance.id, false);
      toast({
        title: 'Appliance restored',
        description: 'The appliance has been restored from archive.',
      });
      onClose();
      onDelete?.();
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to restore appliance. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsArchiving(false);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span>{appliance.model}</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {appliance.manufacturer && (
              <div className="flex items-start gap-3">
                <Factory className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Manufacturer</p>
                  <p>{appliance.manufacturer}</p>
                </div>
              </div>
            )}

            {appliance.purchaseDate && (
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Purchase Date</p>
                  <p>{appliance.purchaseDate}</p>
                </div>
              </div>
            )}

            {appliance.price && (
              <div className="flex items-start gap-3">
                <DollarSign className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Price</p>
                  <p>{appliance.price}</p>
                </div>
              </div>
            )}

            {appliance.room && (
              <div className="flex items-start gap-3">
                <Home className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Room</p>
                  <p>{appliance.room}</p>
                </div>
              </div>
            )}

            {appliance.receiptUrl && (
              <div className="flex items-start gap-3">
                <Image className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-muted-foreground">Receipt</p>
                  <BlossomDocumentLink 
                    href={appliance.receiptUrl} 
                    name="View Receipt"
                    icon={null}
                  />
                </div>
              </div>
            )}

            {appliance.manualUrl && (
              <div className="flex items-start gap-3">
                <FileText className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-muted-foreground">Manual</p>
                  <BlossomDocumentLink 
                    href={appliance.manualUrl} 
                    name="View Manual"
                    icon={null}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-4 pt-4 border-t">
            <Button variant="default" asChild className="w-full">
              <Link to={`/asset/appliance/${appliance.id}`}>
                <FileText className="h-4 w-4 mr-2" />
                View Full Details
              </Link>
            </Button>
            <div className="flex justify-between flex-wrap gap-2">
              <div className="flex gap-2 flex-wrap">
                <Button variant="outline" onClick={handleEdit}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
                {appliance.isArchived ? (
                  <Button 
                    variant="outline" 
                    onClick={handleQuickUnarchive}
                    disabled={isArchiving}
                  >
                    <ArchiveRestore className="h-4 w-4 mr-2" />
                    {isArchiving ? 'Restoring...' : 'Restore'}
                  </Button>
                ) : (
                  <Button 
                    variant="outline" 
                    onClick={() => setShowArchiveConfirm(true)}
                  >
                    <Archive className="h-4 w-4 mr-2" />
                    Archive
                  </Button>
                )}
                <Button variant="destructive" onClick={() => setShowDeleteConfirm(true)}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </div>
              <Button variant="ghost" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Appliance?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{appliance.model}" and all associated maintenance schedules. This action cannot be undone.
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

      <ArchiveConfirmDialog
        isOpen={showArchiveConfirm}
        onClose={() => setShowArchiveConfirm(false)}
        assetType="appliance"
        asset={appliance}
        onConfirm={handleArchiveConfirm}
      />
    </>
  );
}
