import { useState } from 'react';
import { 
  FileText, 
  Calendar, 
  Building, 
  Edit, 
  Trash2, 
  DollarSign,
  Shield,
  Package,
  Car,
  Home,
  Tag,
  Clock,
  CheckCircle2,
  AlertTriangle,
  BadgeCheck,
  ShieldPlus,
  Image,
  Infinity
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Separator } from '@/components/ui/separator';
import { LoadingAnimation } from '@/components/LoadingAnimation';
import { BlossomDocumentLink } from '@/components/BlossomMedia';
import { useWarrantyActions, formatWarrantyTimeRemaining, isWarrantyExpired, isWarrantyExpiringSoon } from '@/hooks/useWarranties';
import { useApplianceById } from '@/hooks/useAppliances';
import { useVehicleById } from '@/hooks/useVehicles';
import { useCompanyById } from '@/hooks/useCompanies';
import { toast } from '@/hooks/useToast';
import type { Warranty } from '@/lib/types';

interface WarrantyDetailDialogProps {
  isOpen: boolean;
  onClose: () => void;
  warranty: Warranty;
  onEdit: () => void;
  onDelete?: () => void;
}

export function WarrantyDetailDialog({ isOpen, onClose, warranty, onEdit, onDelete }: WarrantyDetailDialogProps) {
  const { deleteWarranty } = useWarrantyActions();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Get linked item details
  const linkedAppliance = useApplianceById(warranty.linkedType === 'appliance' ? warranty.linkedItemId : undefined);
  const linkedVehicle = useVehicleById(warranty.linkedType === 'vehicle' ? warranty.linkedItemId : undefined);
  const linkedCompany = useCompanyById(warranty.companyId);

  const handleDelete = async () => {
    setShowDeleteConfirm(false);
    setIsDeleting(true);
    try {
      await deleteWarranty(warranty.id);
      toast({
        title: 'Warranty deleted',
        description: 'The warranty has been removed.',
      });
      onClose();
      onDelete?.();
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to delete warranty. Please try again.',
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
            message="Deleting Warranty" 
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

  const expired = isWarrantyExpired(warranty);
  const expiringSoon = isWarrantyExpiringSoon(warranty);
  const timeRemaining = formatWarrantyTimeRemaining(warranty);

  // Get linked item display name
  const getLinkedItemName = () => {
    if (warranty.linkedType === 'appliance' && linkedAppliance) {
      return linkedAppliance.model;
    }
    if (warranty.linkedType === 'vehicle' && linkedVehicle) {
      return linkedVehicle.name;
    }
    if (warranty.linkedType === 'home_feature' && warranty.linkedItemName) {
      return warranty.linkedItemName;
    }
    if (warranty.linkedType === 'custom' && warranty.linkedItemName) {
      return warranty.linkedItemName;
    }
    return warranty.linkedItemName || null;
  };

  const getLinkedTypeIcon = () => {
    switch (warranty.linkedType) {
      case 'appliance': return <Package className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />;
      case 'vehicle': return <Car className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />;
      case 'home_feature': return <Home className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />;
      case 'custom': return <Tag className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />;
      default: return null;
    }
  };

  const linkedItemName = getLinkedItemName();

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-[95vw] sm:max-w-md max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <span>{warranty.name}</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Status Badge */}
            <div className="flex items-center gap-2">
              {expired ? (
                <Badge variant="destructive" className="flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Expired
                </Badge>
              ) : expiringSoon ? (
                <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Expiring Soon
                </Badge>
              ) : (
                <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Active
                </Badge>
              )}
              <Badge variant="outline">{warranty.warrantyType}</Badge>
            </div>

            {/* Time Remaining */}
            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Warranty Status</p>
                <p className={expired ? 'text-destructive' : expiringSoon ? 'text-amber-600 dark:text-amber-400' : ''}>
                  {timeRemaining}
                </p>
              </div>
            </div>

            {warranty.description && (
              <div className="flex items-start gap-3">
                <FileText className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Description</p>
                  <p>{warranty.description}</p>
                </div>
              </div>
            )}

            {/* Linked Item */}
            {linkedItemName && (
              <div className="flex items-start gap-3">
                {getLinkedTypeIcon()}
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Linked {warranty.linkedType === 'appliance' ? 'Appliance' : 
                            warranty.linkedType === 'vehicle' ? 'Vehicle' : 
                            warranty.linkedType === 'home_feature' ? 'Home Feature' : 'Item'}
                  </p>
                  <p>{linkedItemName}</p>
                </div>
              </div>
            )}

            {warranty.purchaseDate && (
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Purchase Date</p>
                  <p>{warranty.purchaseDate}</p>
                </div>
              </div>
            )}

            {warranty.purchasePrice && (
              <div className="flex items-start gap-3">
                <DollarSign className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Purchase Price</p>
                  <p>{warranty.purchasePrice}</p>
                </div>
              </div>
            )}

            {/* Warranty Duration */}
            {warranty.isLifetime ? (
              <div className="flex items-start gap-3">
                <Infinity className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Warranty Duration</p>
                  <p className="text-blue-600 dark:text-blue-400 font-medium">Lifetime Warranty</p>
                </div>
              </div>
            ) : (
              <>
                {warranty.warrantyLengthValue && warranty.warrantyLengthUnit && (
                  <div className="flex items-start gap-3">
                    <Shield className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Warranty Length</p>
                      <p>{warranty.warrantyLengthValue} {warranty.warrantyLengthUnit}</p>
                    </div>
                  </div>
                )}
                {/* Legacy support for old warrantyLength string field */}
                {!warranty.warrantyLengthValue && warranty.warrantyLength && (
                  <div className="flex items-start gap-3">
                    <Shield className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Warranty Length</p>
                      <p>{warranty.warrantyLength}</p>
                    </div>
                  </div>
                )}
                {warranty.warrantyEndDate && (
                  <div className="flex items-start gap-3">
                    <Calendar className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Warranty End Date</p>
                      <p>{warranty.warrantyEndDate}</p>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Company/Manufacturer */}
            {(linkedCompany || warranty.companyName) && (
              <div className="flex items-start gap-3">
                <Building className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Company/Manufacturer</p>
                  <p>{linkedCompany?.name || warranty.companyName}</p>
                  {linkedCompany?.phone && (
                    <p className="text-sm text-muted-foreground">{linkedCompany.phone}</p>
                  )}
                </div>
              </div>
            )}

            {/* Product Registration */}
            {warranty.isRegistered && (
              <>
                <Separator />
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <BadgeCheck className="h-5 w-5 text-green-600" />
                    <span className="font-medium">Product Registered</span>
                  </div>
                  
                  {warranty.registrationDate && (
                    <div className="flex items-start gap-3 pl-7">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Registration Date</p>
                        <p>{warranty.registrationDate}</p>
                      </div>
                    </div>
                  )}

                  {warranty.registrationNumber && (
                    <div className="flex items-start gap-3 pl-7">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Registration Number</p>
                        <p className="font-mono text-sm">{warranty.registrationNumber}</p>
                      </div>
                    </div>
                  )}

                  {warranty.registrationNotes && (
                    <div className="flex items-start gap-3 pl-7">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Registration Notes</p>
                        <p className="text-sm">{warranty.registrationNotes}</p>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Extended Warranty */}
            {warranty.hasExtendedWarranty && (
              <>
                <Separator />
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <ShieldPlus className="h-5 w-5 text-blue-600" />
                    <span className="font-medium">Extended Warranty</span>
                  </div>
                  
                  {warranty.extendedWarrantyProvider && (
                    <div className="flex items-start gap-3 pl-7">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Provider</p>
                        <p>{warranty.extendedWarrantyProvider}</p>
                      </div>
                    </div>
                  )}

                  {warranty.extendedWarrantyEndDate && (
                    <div className="flex items-start gap-3 pl-7">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">End Date</p>
                        <p>{warranty.extendedWarrantyEndDate}</p>
                      </div>
                    </div>
                  )}

                  {warranty.extendedWarrantyCost && (
                    <div className="flex items-start gap-3 pl-7">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Cost</p>
                        <p>{warranty.extendedWarrantyCost}</p>
                      </div>
                    </div>
                  )}

                  {warranty.extendedWarrantyNotes && (
                    <div className="flex items-start gap-3 pl-7">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Notes</p>
                        <p className="text-sm">{warranty.extendedWarrantyNotes}</p>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Documents */}
            {(warranty.receiptUrl || (warranty.documents && warranty.documents.length > 0)) && (
              <>
                <Separator />
                <div className="space-y-3">
                  <p className="font-medium">Documents</p>
                  
                  {warranty.receiptUrl && (
                    <div className="flex items-start gap-3">
                      <Image className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-muted-foreground">Receipt</p>
                        <a 
                          href={warranty.receiptUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-primary hover:underline flex items-center gap-1 text-sm"
                        >
                          <span className="truncate">View Receipt</span>
                          <ExternalLink className="h-3 w-3 shrink-0" />
                        </a>
                      </div>
                    </div>
                  )}

                  {warranty.documents && warranty.documents.length > 0 && (
                    <div className="space-y-2">
                      {warranty.documents.map((doc, index) => (
                        <div key={index} className="flex items-start gap-3">
                          <FileText className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-muted-foreground">
                              {doc.name || 'Document'}
                            </p>
                            <BlossomDocumentLink href={doc.url} name="View Document" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Notes */}
            {warranty.notes && (
              <>
                <Separator />
                <div className="flex items-start gap-3">
                  <FileText className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Notes</p>
                    <p className="whitespace-pre-wrap">{warranty.notes}</p>
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
            <AlertDialogTitle>Delete Warranty?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the warranty for "{warranty.name}". This action cannot be undone.
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
