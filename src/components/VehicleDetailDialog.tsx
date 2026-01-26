import { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  ExternalLink, 
  FileText, 
  Image, 
  Calendar, 
  Factory, 
  Edit, 
  Trash2,
  Archive,
  ArchiveRestore,
  Car,
  Gauge,
  Fuel,
  Shield,
  CreditCard,
  Hash,
  Plane,
  Ship,
  Tractor,
  StickyNote
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { LoadingAnimation } from '@/components/LoadingAnimation';
import { ArchiveConfirmDialog } from '@/components/ArchiveConfirmDialog';
import { useVehicleActions } from '@/hooks/useVehicles';
import { toast } from '@/hooks/useToast';
import { FUEL_TYPES, type Vehicle } from '@/lib/types';

interface VehicleDetailDialogProps {
  isOpen: boolean;
  onClose: () => void;
  vehicle: Vehicle;
  onEdit: () => void;
  onDelete?: () => void;
}

// Get icon based on vehicle type
function getVehicleIcon(type: string) {
  switch (type) {
    case 'Plane':
      return Plane;
    case 'Boat':
      return Ship;
    case 'Farm Machinery':
      return Tractor;
    default:
      return Car;
  }
}

// Get fuel type label
function getFuelTypeLabel(value: string): string {
  const fuelType = FUEL_TYPES.find(f => f.value === value);
  return fuelType?.label || value;
}

export function VehicleDetailDialog({ isOpen, onClose, vehicle, onEdit, onDelete }: VehicleDetailDialogProps) {
  const { deleteVehicle, archiveVehicle } = useVehicleActions();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);

  const handleDelete = async () => {
    setShowDeleteConfirm(false);
    setIsDeleting(true);
    try {
      await deleteVehicle(vehicle.id);
      toast({
        title: 'Vehicle deleted',
        description: 'The vehicle has been removed.',
      });
      // Close dialog and notify parent of deletion
      onClose();
      onDelete?.();
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to delete vehicle. Please try again.',
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
            message="Deleting Vehicle" 
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
    await archiveVehicle(vehicle.id, !vehicle.isArchived);
  };

  const handleQuickUnarchive = async () => {
    setIsArchiving(true);
    try {
      await archiveVehicle(vehicle.id, false);
      toast({
        title: 'Vehicle restored',
        description: 'The vehicle has been restored from archive.',
      });
      onClose();
      onDelete?.();
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to restore vehicle. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsArchiving(false);
    }
  };

  const VehicleIcon = getVehicleIcon(vehicle.vehicleType);

  // Check for expiring items
  const isExpiringSoon = (dateStr: string | undefined): boolean => {
    if (!dateStr) return false;
    const parts = dateStr.split('/');
    if (parts.length !== 3) return false;
    const date = new Date(parseInt(parts[2]), parseInt(parts[0]) - 1, parseInt(parts[1]));
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    return date <= thirtyDaysFromNow && date >= new Date();
  };

  const isExpired = (dateStr: string | undefined): boolean => {
    if (!dateStr) return false;
    const parts = dateStr.split('/');
    if (parts.length !== 3) return false;
    const date = new Date(parseInt(parts[2]), parseInt(parts[0]) - 1, parseInt(parts[1]));
    return date < new Date();
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-[95vw] sm:max-w-md max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <VehicleIcon className="h-5 w-5 text-sky-600" />
              <span>{vehicle.name}</span>
            </DialogTitle>
            <Badge variant="secondary" className="w-fit">{vehicle.vehicleType}</Badge>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Basic Info */}
            {(vehicle.make || vehicle.model || vehicle.year) && (
              <div className="flex items-start gap-3">
                <Factory className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Make / Model / Year</p>
                  <p>
                    {[vehicle.make, vehicle.model, vehicle.year].filter(Boolean).join(' ')}
                  </p>
                </div>
              </div>
            )}

            {/* Identification Numbers */}
            {vehicle.serialNumber && (
              <div className="flex items-start gap-3">
                <Hash className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Serial Number</p>
                  <p className="font-mono text-sm">{vehicle.serialNumber}</p>
                </div>
              </div>
            )}

            {vehicle.hullId && (
              <div className="flex items-start gap-3">
                <Hash className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Hull ID (HIN)</p>
                  <p className="font-mono text-sm">{vehicle.hullId}</p>
                </div>
              </div>
            )}

            {vehicle.tailNumber && (
              <div className="flex items-start gap-3">
                <Plane className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Tail Number</p>
                  <p className="font-mono text-sm">{vehicle.tailNumber}</p>
                </div>
              </div>
            )}

            {(vehicle.licensePlate || vehicle.registrationNumber) && (
              <div className="flex items-start gap-3">
                <CreditCard className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {vehicle.registrationNumber ? 'Registration Number' : 'License Plate'}
                  </p>
                  <p>{vehicle.registrationNumber || vehicle.licensePlate}</p>
                </div>
              </div>
            )}

            {/* Usage Stats */}
            {(vehicle.mileage || vehicle.engineHours || vehicle.hobbsTime) && (
              <div className="flex items-start gap-3">
                <Gauge className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {vehicle.hobbsTime ? 'Hobbs Time' : vehicle.engineHours ? 'Engine Hours' : 'Mileage'}
                  </p>
                  <p>
                    {vehicle.hobbsTime ? `${vehicle.hobbsTime} hours` :
                     vehicle.engineHours ? `${vehicle.engineHours} hours` :
                     `${vehicle.mileage} miles`}
                  </p>
                </div>
              </div>
            )}

            {vehicle.fuelType && (
              <div className="flex items-start gap-3">
                <Fuel className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Fuel Type</p>
                  <p>{getFuelTypeLabel(vehicle.fuelType)}</p>
                </div>
              </div>
            )}

            {/* Purchase Info */}
            {(vehicle.purchaseDate || vehicle.purchasePrice) && (
              <>
                <Separator />
                {vehicle.purchaseDate && (
                  <div className="flex items-start gap-3">
                    <Calendar className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Purchase Date</p>
                      <p>{vehicle.purchaseDate}</p>
                    </div>
                  </div>
                )}
                {vehicle.purchasePrice && (
                  <div className="flex items-start gap-3">
                    <CreditCard className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Purchase Price</p>
                      <p>{vehicle.purchasePrice}</p>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Registration */}
            {vehicle.registrationExpiry && (
              <>
                <Separator />
                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-muted-foreground">Registration Expiry</p>
                    <div className="flex items-center gap-2">
                      <p>{vehicle.registrationExpiry}</p>
                      {isExpired(vehicle.registrationExpiry) && (
                        <Badge variant="destructive">Expired</Badge>
                      )}
                      {isExpiringSoon(vehicle.registrationExpiry) && (
                        <Badge className="bg-amber-100 text-amber-700">Expiring Soon</Badge>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Warranty */}
            {(vehicle.warrantyUrl || vehicle.warrantyExpiry) && (
              <>
                <Separator />
                <div className="flex items-start gap-3">
                  <Shield className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-muted-foreground">Warranty</p>
                    {vehicle.warrantyExpiry && (
                      <div className="flex items-center gap-2">
                        <span>Expires: {vehicle.warrantyExpiry}</span>
                        {isExpired(vehicle.warrantyExpiry) && (
                          <Badge variant="destructive">Expired</Badge>
                        )}
                        {isExpiringSoon(vehicle.warrantyExpiry) && (
                          <Badge className="bg-amber-100 text-amber-700">Expiring Soon</Badge>
                        )}
                      </div>
                    )}
                    {vehicle.warrantyUrl && (
                      <a 
                        href={vehicle.warrantyUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-primary hover:underline flex items-center gap-1 text-sm mt-1"
                      >
                        <span>View Warranty Document</span>
                        <ExternalLink className="h-3 w-3 shrink-0" />
                      </a>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Documents */}
            {(vehicle.receiptUrl || (vehicle.documentsUrls && vehicle.documentsUrls.length > 0)) && (
              <>
                <Separator />
                {vehicle.receiptUrl && (
                  <div className="flex items-start gap-3">
                    <Image className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-muted-foreground">Receipt</p>
                      <a 
                        href={vehicle.receiptUrl} 
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

                {vehicle.documentsUrls && vehicle.documentsUrls.length > 0 && (
                  <div className="flex items-start gap-3">
                    <FileText className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-muted-foreground">Documents</p>
                      <div className="space-y-1 mt-1">
                        {vehicle.documentsUrls.map((url, index) => (
                          <a 
                            key={index}
                            href={url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-primary hover:underline flex items-center gap-1 text-sm"
                          >
                            <span>Document {index + 1}</span>
                            <ExternalLink className="h-3 w-3 shrink-0" />
                          </a>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Notes */}
            {vehicle.notes && (
              <>
                <Separator />
                <div className="flex items-start gap-3">
                  <StickyNote className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Notes</p>
                    <p className="whitespace-pre-wrap">{vehicle.notes}</p>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="flex flex-col gap-4 pt-4 border-t">
            <Button variant="default" asChild className="w-full">
              <Link to={`/asset/vehicle/${vehicle.id}`}>
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
                {vehicle.isArchived ? (
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
            <AlertDialogTitle>Delete Vehicle?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{vehicle.name}" and all associated maintenance schedules. This action cannot be undone.
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
        assetType="vehicle"
        asset={vehicle}
        onConfirm={handleArchiveConfirm}
      />
    </>
  );
}
