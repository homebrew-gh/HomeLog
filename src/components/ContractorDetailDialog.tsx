import { useState } from 'react';
import { 
  ExternalLink, 
  FileText,
  Edit, 
  Trash2,
  Users,
  Phone,
  Mail,
  Globe,
  MapPin,
  Star,
  Shield,
  StickyNote,
  Calendar,
  DollarSign,
  User
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { LoadingAnimation } from '@/components/LoadingAnimation';
import { useContractorActions } from '@/hooks/useContractors';
import { toast } from '@/hooks/useToast';
import type { Contractor } from '@/lib/types';

interface ContractorDetailDialogProps {
  isOpen: boolean;
  onClose: () => void;
  contractor: Contractor;
  onEdit: () => void;
  onDelete?: () => void;
}

export function ContractorDetailDialog({ isOpen, onClose, contractor, onEdit, onDelete }: ContractorDetailDialogProps) {
  const { deleteContractor } = useContractorActions();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setShowDeleteConfirm(false);
    setIsDeleting(true);
    try {
      await deleteContractor(contractor.id);
      toast({
        title: 'Contractor deleted',
        description: 'The contractor has been removed.',
      });
      // Close dialog and notify parent of deletion
      onClose();
      onDelete?.();
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to delete contractor. Please try again.',
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
            message="Deleting Contractor" 
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

  // Format full address
  const formatAddress = () => {
    const parts = [];
    if (contractor.address) parts.push(contractor.address);
    const cityStateZip = [
      contractor.city,
      contractor.state,
      contractor.zipCode
    ].filter(Boolean).join(', ');
    if (cityStateZip) parts.push(cityStateZip);
    return parts.join('\n');
  };

  const fullAddress = formatAddress();

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-[95vw] sm:max-w-md max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-sky-600" />
              <span>{contractor.name}</span>
            </DialogTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="secondary">{contractor.serviceType}</Badge>
              {contractor.rating && (
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`h-4 w-4 ${
                        star <= contractor.rating!
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-slate-300 dark:text-slate-600'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Contact Person */}
            {contractor.contactName && (
              <div className="flex items-start gap-3">
                <User className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Contact Person</p>
                  <p>{contractor.contactName}</p>
                </div>
              </div>
            )}

            {/* Phone */}
            {contractor.phone && (
              <div className="flex items-start gap-3">
                <Phone className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-muted-foreground">Phone</p>
                  <a 
                    href={`tel:${contractor.phone}`}
                    className="text-primary hover:underline"
                  >
                    {contractor.phone}
                  </a>
                </div>
              </div>
            )}

            {/* Email */}
            {contractor.email && (
              <div className="flex items-start gap-3">
                <Mail className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-muted-foreground">Email</p>
                  <a 
                    href={`mailto:${contractor.email}`}
                    className="text-primary hover:underline truncate block"
                  >
                    {contractor.email}
                  </a>
                </div>
              </div>
            )}

            {/* Website */}
            {contractor.website && (
              <div className="flex items-start gap-3">
                <Globe className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-muted-foreground">Website</p>
                  <a 
                    href={contractor.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline flex items-center gap-1"
                  >
                    <span className="truncate">{contractor.website.replace(/^https?:\/\//, '')}</span>
                    <ExternalLink className="h-3 w-3 shrink-0" />
                  </a>
                </div>
              </div>
            )}

            {/* Address */}
            {fullAddress && (
              <>
                <Separator />
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Address</p>
                    <p className="whitespace-pre-line">{fullAddress}</p>
                  </div>
                </div>
              </>
            )}

            {/* Business Details */}
            {(contractor.licenseNumber || contractor.insuranceInfo) && (
              <>
                <Separator />
                {contractor.licenseNumber && (
                  <div className="flex items-start gap-3">
                    <Shield className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">License Number</p>
                      <p className="font-mono text-sm">{contractor.licenseNumber}</p>
                    </div>
                  </div>
                )}

                {contractor.insuranceInfo && (
                  <div className="flex items-start gap-3">
                    <Shield className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Insurance</p>
                      <p>{contractor.insuranceInfo}</p>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Invoices */}
            {contractor.invoices && contractor.invoices.length > 0 && (
              <>
                <Separator />
                <div className="flex items-start gap-3">
                  <FileText className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-muted-foreground mb-2">
                      Invoices ({contractor.invoices.length})
                    </p>
                    <div className="space-y-2">
                      {contractor.invoices.map((invoice, index) => (
                        <a 
                          key={index}
                          href={invoice.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors group"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 text-sm">
                              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="font-medium">{invoice.date}</span>
                              {invoice.amount && (
                                <>
                                  <DollarSign className="h-3.5 w-3.5 text-muted-foreground ml-1" />
                                  <span>{invoice.amount}</span>
                                </>
                              )}
                            </div>
                            {invoice.description && (
                              <p className="text-xs text-muted-foreground truncate mt-0.5">
                                {invoice.description}
                              </p>
                            )}
                          </div>
                          <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary shrink-0" />
                        </a>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Notes */}
            {contractor.notes && (
              <>
                <Separator />
                <div className="flex items-start gap-3">
                  <StickyNote className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Notes</p>
                    <p className="whitespace-pre-wrap">{contractor.notes}</p>
                  </div>
                </div>
              </>
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
            <AlertDialogTitle>Delete Contractor?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{contractor.name}" and all associated invoices. This action cannot be undone.
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
