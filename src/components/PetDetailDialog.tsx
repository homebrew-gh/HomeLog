import { useState } from 'react';
import { 
  FileText, 
  Calendar, 
  Edit, 
  Trash2,
  Archive,
  ArchiveRestore,
  PawPrint,
  Heart,
  Phone,
  Stethoscope,
  Pill,
  AlertTriangle,
  Tag,
  StickyNote,
  Palette,
  Scale,
  User
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { LoadingAnimation } from '@/components/LoadingAnimation';
import { ArchiveConfirmDialog } from '@/components/ArchiveConfirmDialog';
import { BlossomImage, BlossomDocumentLink } from '@/components/BlossomMedia';
import { usePetActions } from '@/hooks/usePets';
import { toast } from '@/hooks/useToast';
import type { Pet } from '@/lib/types';

interface PetDetailDialogProps {
  isOpen: boolean;
  onClose: () => void;
  pet: Pet;
  onEdit: () => void;
  onDelete?: () => void;
}

// Get sex label
function getSexLabel(sex: string | undefined): string {
  if (!sex) return '';
  switch (sex) {
    case 'male': return 'Male';
    case 'female': return 'Female';
    case 'unknown': return 'Unknown';
    default: return sex;
  }
}

export function PetDetailDialog({ isOpen, onClose, pet, onEdit, onDelete }: PetDetailDialogProps) {
  const { deletePet, archivePet } = usePetActions();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);

  const handleDelete = async () => {
    setShowDeleteConfirm(false);
    setIsDeleting(true);
    try {
      await deletePet(pet.id);
      toast({
        title: 'Pet removed',
        description: 'The pet has been removed.',
      });
      // Close dialog and notify parent of deletion
      onClose();
      onDelete?.();
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to delete pet. Please try again.',
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
            message="Removing Pet" 
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
    await archivePet(pet.id, !pet.isArchived);
  };

  const handleQuickUnarchive = async () => {
    setIsArchiving(true);
    try {
      await archivePet(pet.id, false);
      toast({
        title: 'Pet restored',
        description: 'The pet has been restored from archive.',
      });
      onClose();
      onDelete?.();
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to restore pet. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsArchiving(false);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-[95vw] sm:max-w-md max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PawPrint className="h-5 w-5 text-primary" />
              <span>{pet.name}</span>
            </DialogTitle>
            <Badge variant="secondary" className="w-fit">{pet.petType}</Badge>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Photo */}
            {pet.photoUrl && (
              <div className="flex justify-center">
                <BlossomImage 
                  src={pet.photoUrl} 
                  alt={pet.name} 
                  className="max-h-48 rounded-lg object-cover shadow-md"
                />
              </div>
            )}

            {/* Species & Breed */}
            {(pet.species || pet.breed) && (
              <div className="flex items-start gap-3">
                <PawPrint className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Species / Breed</p>
                  <p>{[pet.species, pet.breed].filter(Boolean).join(' - ')}</p>
                </div>
              </div>
            )}

            {/* Physical Characteristics */}
            {(pet.color || pet.weight || pet.sex) && (
              <div className="grid grid-cols-3 gap-3">
                {pet.color && (
                  <div className="flex items-start gap-2">
                    <Palette className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Color</p>
                      <p className="text-sm">{pet.color}</p>
                    </div>
                  </div>
                )}
                {pet.weight && (
                  <div className="flex items-start gap-2">
                    <Scale className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Weight</p>
                      <p className="text-sm">{pet.weight}</p>
                    </div>
                  </div>
                )}
                {pet.sex && (
                  <div className="flex items-start gap-2">
                    <User className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Sex</p>
                      <p className="text-sm">{getSexLabel(pet.sex)}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Spayed/Neutered Status */}
            {pet.isNeutered && (
              <div className="flex items-center gap-2">
                <Heart className="h-4 w-4 text-green-600" />
                <span className="text-sm text-green-600 font-medium">Spayed/Neutered</span>
              </div>
            )}

            {/* Dates */}
            {(pet.birthDate || pet.adoptionDate) && (
              <>
                <Separator />
                <div className="grid grid-cols-2 gap-3">
                  {pet.birthDate && (
                    <div className="flex items-start gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">Birth Date</p>
                        <p className="text-sm">{pet.birthDate}</p>
                      </div>
                    </div>
                  )}
                  {pet.adoptionDate && (
                    <div className="flex items-start gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">Adoption Date</p>
                        <p className="text-sm">{pet.adoptionDate}</p>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* IDs */}
            {(pet.microchipId || pet.licenseNumber) && (
              <>
                <Separator />
                <div className="grid grid-cols-2 gap-3">
                  {pet.microchipId && (
                    <div className="flex items-start gap-2">
                      <Tag className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">Microchip ID</p>
                        <p className="text-sm font-mono">{pet.microchipId}</p>
                      </div>
                    </div>
                  )}
                  {pet.licenseNumber && (
                    <div className="flex items-start gap-2">
                      <Tag className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">License #</p>
                        <p className="text-sm font-mono">{pet.licenseNumber}</p>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Veterinary Info */}
            {(pet.vetClinic || pet.vetPhone || pet.lastVetVisit) && (
              <>
                <Separator />
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Stethoscope className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">Veterinary Info</span>
                  </div>
                  {pet.vetClinic && (
                    <div className="flex items-start gap-3 pl-6">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">Vet Clinic</p>
                        <p className="text-sm">{pet.vetClinic}</p>
                      </div>
                    </div>
                  )}
                  {pet.vetPhone && (
                    <div className="flex items-start gap-3 pl-6">
                      <Phone className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">Phone</p>
                        <a href={`tel:${pet.vetPhone}`} className="text-sm text-primary hover:underline">
                          {pet.vetPhone}
                        </a>
                      </div>
                    </div>
                  )}
                  {pet.lastVetVisit && (
                    <div className="flex items-start gap-3 pl-6">
                      <Calendar className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">Last Visit</p>
                        <p className="text-sm">{pet.lastVetVisit}</p>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Medical Info */}
            {(pet.allergies || pet.medications || pet.medicalConditions) && (
              <>
                <Separator />
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Pill className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">Medical Info</span>
                  </div>
                  {pet.allergies && (
                    <div className="flex items-start gap-3 pl-6">
                      <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">Allergies</p>
                        <p className="text-sm whitespace-pre-wrap">{pet.allergies}</p>
                      </div>
                    </div>
                  )}
                  {pet.medications && (
                    <div className="flex items-start gap-3 pl-6">
                      <Pill className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">Medications</p>
                        <p className="text-sm whitespace-pre-wrap">{pet.medications}</p>
                      </div>
                    </div>
                  )}
                  {pet.medicalConditions && (
                    <div className="flex items-start gap-3 pl-6">
                      <Stethoscope className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">Medical Conditions</p>
                        <p className="text-sm whitespace-pre-wrap">{pet.medicalConditions}</p>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Documents */}
            {pet.documentsUrls && pet.documentsUrls.length > 0 && (
              <>
                <Separator />
                <div className="flex items-start gap-3">
                  <FileText className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-muted-foreground">Documents</p>
                    <div className="space-y-1 mt-1">
                      {pet.documentsUrls.map((url, index) => (
                        <BlossomDocumentLink
                          key={index}
                          href={url}
                          name={`Document ${index + 1}`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Notes */}
            {pet.notes && (
              <>
                <Separator />
                <div className="flex items-start gap-3">
                  <StickyNote className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Notes</p>
                    <p className="whitespace-pre-wrap text-sm">{pet.notes}</p>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="flex flex-col gap-4 pt-4 border-t">
            <div className="flex justify-between flex-wrap gap-2">
              <div className="flex gap-2 flex-wrap">
                <Button variant="outline" onClick={handleEdit}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
                {pet.isArchived ? (
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
            <AlertDialogTitle>Remove Pet?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove "{pet.name}" from your records. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isDeleting ? 'Removing...' : 'Remove'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ArchiveConfirmDialog
        isOpen={showArchiveConfirm}
        onClose={() => setShowArchiveConfirm(false)}
        assetType="pet"
        asset={pet}
        onConfirm={handleArchiveConfirm}
      />
    </>
  );
}
