import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSeoMeta } from '@unhead/react';
import {
  ArrowLeft,
  PawPrint,
  Calendar,
  Stethoscope,
  Phone,
  Pill,
  AlertTriangle,
  Tag,
  StickyNote,
  Palette,
  Scale,
  User,
  Heart,
  Edit,
  Plus,
  FileText,
  Syringe,
  ClipboardList,
  DollarSign,
  Clock,
  Trash2,
  Dog,
  Cat,
  Bird,
  Fish,
  Rabbit,
  Tractor,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { BlossomImage, BlossomDocumentLink } from '@/components/BlossomMedia';
import { VetVisitDialog } from '@/components/VetVisitDialog';
import { PetDialog } from '@/components/PetDialog';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { usePetById, usePets } from '@/hooks/usePets';
import { useVetVisitsByPetId, useVetVisitActions } from '@/hooks/useVetVisits';
import { toast } from '@/hooks/useToast';
import { VET_VISIT_TYPES, type VetVisit } from '@/lib/types';
import NotFound from './NotFound';

// Get icon based on pet type
function getPetIcon(type: string) {
  switch (type) {
    case 'Dog':
      return Dog;
    case 'Cat':
      return Cat;
    case 'Bird':
      return Bird;
    case 'Fish':
      return Fish;
    case 'Small Mammal':
      return Rabbit;
    case 'Horse':
    case 'Livestock':
      return Tractor;
    default:
      return PawPrint;
  }
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

// Get visit type label
function getVisitTypeLabel(type: string): string {
  const visitType = VET_VISIT_TYPES.find(t => t.value === type);
  return visitType?.label || type;
}

// Parse MM/DD/YYYY to Date
function parseDate(dateStr: string): Date | null {
  const parts = dateStr.split('/');
  if (parts.length !== 3) return null;
  return new Date(parseInt(parts[2]), parseInt(parts[0]) - 1, parseInt(parts[1]));
}

// Format relative time
function formatRelativeDate(dateStr: string): string {
  const date = parseDate(dateStr);
  if (!date) return dateStr;
  
  const now = new Date();
  const diffTime = date.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays === -1) return 'Yesterday';
  if (diffDays > 0 && diffDays <= 7) return `In ${diffDays} days`;
  if (diffDays < 0 && diffDays >= -7) return `${Math.abs(diffDays)} days ago`;
  
  return dateStr;
}

export function PetDetailPage() {
  const { petId } = useParams<{ petId: string }>();
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const { isLoading: isPetsLoading } = usePets();
  
  const pet = usePetById(petId);
  const vetVisits = useVetVisitsByPetId(petId);
  const { deleteVetVisit } = useVetVisitActions();
  
  // Dialog states
  const [vetVisitDialogOpen, setVetVisitDialogOpen] = useState(false);
  const [editingVetVisit, setEditingVetVisit] = useState<VetVisit | undefined>();
  const [petDialogOpen, setPetDialogOpen] = useState(false);
  const [deletingVetVisit, setDeletingVetVisit] = useState<VetVisit | undefined>();

  // SEO
  useSeoMeta({
    title: pet ? `${pet.name} - Pet Details | Cypher Log` : 'Pet Details | Cypher Log',
    description: pet ? `View details and vet visit history for ${pet.name}` : 'View pet details',
  });

  // Separate upcoming follow-ups
  const { upcomingFollowUps, pastVisits } = useMemo(() => {
    const now = new Date();
    const upcoming: VetVisit[] = [];
    const past: VetVisit[] = [];
    
    for (const visit of vetVisits) {
      if (visit.followUpDate) {
        const followUpDate = parseDate(visit.followUpDate);
        if (followUpDate && followUpDate >= now) {
          upcoming.push(visit);
        }
      }
    }
    
    // Sort upcoming by follow-up date (soonest first)
    upcoming.sort((a, b) => {
      const dateA = parseDate(a.followUpDate!)!;
      const dateB = parseDate(b.followUpDate!)!;
      return dateA.getTime() - dateB.getTime();
    });
    
    return { upcomingFollowUps: upcoming, pastVisits: vetVisits };
  }, [vetVisits]);

  const handleEditVetVisit = (visit: VetVisit) => {
    setEditingVetVisit(visit);
    setVetVisitDialogOpen(true);
  };

  const handleAddVetVisit = () => {
    setEditingVetVisit(undefined);
    setVetVisitDialogOpen(true);
  };

  const handleDeleteVetVisit = async () => {
    if (!deletingVetVisit) return;
    
    try {
      await deleteVetVisit(deletingVetVisit.id);
      toast({
        title: 'Vet visit deleted',
        description: 'The vet visit has been removed.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete vet visit. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setDeletingVetVisit(undefined);
    }
  };

  // Loading state
  if (!user) {
    return (
      <div className="min-h-screen bg-theme-gradient">
        <div className="container mx-auto px-4 py-8">
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">Please log in to view pet details.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Show loading while data is being fetched
  if (isPetsLoading) {
    return (
      <div className="min-h-screen bg-theme-gradient">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-4 mb-6">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Skeleton className="h-[400px] rounded-lg" />
            </div>
            <div>
              <Skeleton className="h-[300px] rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!petId || !pet) {
    return <NotFound />;
  }

  const PetIcon = getPetIcon(pet.petType);

  return (
    <div className="min-h-screen bg-theme-gradient">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-3">
              {pet.photoUrl ? (
                <BlossomImage
                  src={pet.photoUrl}
                  alt={pet.name}
                  className="h-14 w-14 rounded-full object-cover border-2 border-primary/20"
                />
              ) : (
                <div className="p-3 rounded-full bg-primary/10">
                  <PetIcon className="h-8 w-8 text-primary" />
                </div>
              )}
              <div>
                <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                  {pet.name}
                  {pet.isNeutered && (
                    <Heart className="h-5 w-5 text-green-600 fill-green-600" />
                  )}
                </h1>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Badge variant="outline">{pet.petType}</Badge>
                  {(pet.species || pet.breed) && (
                    <span className="text-sm">
                      {[pet.species, pet.breed].filter(Boolean).join(' - ')}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPetDialogOpen(true)}
            >
              <Edit className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Edit Pet</span>
            </Button>
            <Button
              size="sm"
              onClick={handleAddVetVisit}
            >
              <Plus className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Log Vet Visit</span>
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column - Pet Details */}
          <div className="space-y-6">
            {/* Pet Info Card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <PawPrint className="h-5 w-5 text-primary" />
                  Pet Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Physical Characteristics */}
                {(pet.color || pet.weight || pet.sex) && (
                  <div className="grid grid-cols-3 gap-3">
                    {pet.color && (
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                          <Palette className="h-3 w-3" />
                          Color
                        </p>
                        <p className="text-sm">{pet.color}</p>
                      </div>
                    )}
                    {pet.weight && (
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                          <Scale className="h-3 w-3" />
                          Weight
                        </p>
                        <p className="text-sm">{pet.weight}</p>
                      </div>
                    )}
                    {pet.sex && (
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                          <User className="h-3 w-3" />
                          Sex
                        </p>
                        <p className="text-sm">{getSexLabel(pet.sex)}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Dates */}
                {(pet.birthDate || pet.adoptionDate) && (
                  <>
                    <Separator />
                    <div className="grid grid-cols-2 gap-3">
                      {pet.birthDate && (
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Birth Date
                          </p>
                          <p className="text-sm">{pet.birthDate}</p>
                        </div>
                      )}
                      {pet.adoptionDate && (
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                            <Heart className="h-3 w-3" />
                            Adoption Date
                          </p>
                          <p className="text-sm">{pet.adoptionDate}</p>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* IDs */}
                {(pet.microchipId || pet.licenseNumber) && (
                  <>
                    <Separator />
                    <div className="space-y-2">
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

                {/* Documents */}
                {pet.documentsUrls && pet.documentsUrls.length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                        <FileText className="h-3 w-3" />
                        Documents
                      </p>
                      <div className="space-y-1">
                        {pet.documentsUrls.map((url, index) => (
                          <BlossomDocumentLink
                            key={index}
                            href={url}
                            name={`Document ${index + 1}`}
                          />
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* Notes */}
                {pet.notes && (
                  <>
                    <Separator />
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                        <StickyNote className="h-3 w-3" />
                        Notes
                      </p>
                      <p className="text-sm whitespace-pre-wrap">{pet.notes}</p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Medical Info Card */}
            {(pet.vetClinic || pet.vetPhone || pet.allergies || pet.medications || pet.medicalConditions) && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2">
                    <Stethoscope className="h-5 w-5 text-primary" />
                    Medical Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Vet Info */}
                  {(pet.vetClinic || pet.vetPhone) && (
                    <div className="space-y-2">
                      {pet.vetClinic && (
                        <div className="flex items-start gap-2">
                          <Stethoscope className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                          <div>
                            <p className="text-xs font-medium text-muted-foreground">Vet Clinic</p>
                            <p className="text-sm">{pet.vetClinic}</p>
                          </div>
                        </div>
                      )}
                      {pet.vetPhone && (
                        <div className="flex items-start gap-2">
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
                        <div className="flex items-start gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                          <div>
                            <p className="text-xs font-medium text-muted-foreground">Last Visit</p>
                            <p className="text-sm">{pet.lastVetVisit}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Medical Conditions */}
                  {(pet.allergies || pet.medications || pet.medicalConditions) && (
                    <>
                      {(pet.vetClinic || pet.vetPhone) && <Separator />}
                      <div className="space-y-3">
                        {pet.allergies && (
                          <div className="flex items-start gap-2">
                            <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                            <div>
                              <p className="text-xs font-medium text-muted-foreground">Allergies</p>
                              <p className="text-sm whitespace-pre-wrap">{pet.allergies}</p>
                            </div>
                          </div>
                        )}
                        {pet.medications && (
                          <div className="flex items-start gap-2">
                            <Pill className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                            <div>
                              <p className="text-xs font-medium text-muted-foreground">Medications</p>
                              <p className="text-sm whitespace-pre-wrap">{pet.medications}</p>
                            </div>
                          </div>
                        )}
                        {pet.medicalConditions && (
                          <div className="flex items-start gap-2">
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
                </CardContent>
              </Card>
            )}

            {/* Quick Stats */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Vet Visit Stats</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Total Visits</span>
                    <span className="font-semibold">{vetVisits.length}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Upcoming Follow-ups</span>
                    <span className="font-semibold text-amber-600">{upcomingFollowUps.length}</span>
                  </div>
                  {pet.lastVetVisit && (
                    <>
                      <Separator />
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Last Visit</span>
                        <span className="font-semibold">{pet.lastVetVisit}</span>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Vet Visits */}
          <div className="lg:col-span-2 space-y-6">
            {/* Upcoming Follow-ups */}
            {upcomingFollowUps.length > 0 && (
              <Card className="border-amber-200 dark:border-amber-900 bg-amber-50/50 dark:bg-amber-950/20">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                    <Clock className="h-5 w-5" />
                    Upcoming Follow-ups
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {upcomingFollowUps.map((visit) => (
                      <div
                        key={visit.id}
                        className="p-3 rounded-lg bg-amber-100/50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className="border-amber-300 text-amber-700">
                                {formatRelativeDate(visit.followUpDate!)}
                              </Badge>
                              <span className="text-sm text-muted-foreground">
                                {visit.followUpDate}
                              </span>
                            </div>
                            <p className="text-sm font-medium">
                              Follow-up for: {getVisitTypeLabel(visit.visitType)}
                            </p>
                            {visit.followUpNotes && (
                              <p className="text-sm text-muted-foreground mt-1">
                                {visit.followUpNotes}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Vet Visit History */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <Stethoscope className="h-5 w-5 text-primary" />
                  Vet Visit History
                </CardTitle>
                <CardDescription>
                  All recorded vet visits for {pet.name}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {vetVisits.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Stethoscope className="h-10 w-10 mx-auto mb-3 opacity-30" />
                    <p>No vet visits recorded yet.</p>
                    <Button variant="link" onClick={handleAddVetVisit} className="mt-2">
                      Log your first vet visit
                    </Button>
                  </div>
                ) : (
                  <ScrollArea className="h-[500px] pr-4">
                    <div className="space-y-4">
                      {pastVisits.map((visit) => (
                        <div
                          key={visit.id}
                          className="p-4 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-4 mb-3">
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary">
                                {getVisitTypeLabel(visit.visitType)}
                              </Badge>
                              <span className="text-sm text-muted-foreground">
                                {visit.visitDate}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleEditVetVisit(visit)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => setDeletingVetVisit(visit)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>

                          <h4 className="font-medium mb-2">{visit.reason}</h4>

                          {/* Visit details */}
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm mb-3">
                            {visit.vetClinic && (
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <Stethoscope className="h-3.5 w-3.5" />
                                <span className="truncate">{visit.vetClinic}</span>
                              </div>
                            )}
                            {visit.veterinarian && (
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <User className="h-3.5 w-3.5" />
                                <span className="truncate">{visit.veterinarian}</span>
                              </div>
                            )}
                            {visit.weight && (
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <Scale className="h-3.5 w-3.5" />
                                <span>{visit.weight}</span>
                              </div>
                            )}
                            {visit.cost && (
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <DollarSign className="h-3.5 w-3.5" />
                                <span>{visit.cost}</span>
                              </div>
                            )}
                          </div>

                          {/* Diagnosis/Treatment */}
                          {(visit.diagnosis || visit.treatment) && (
                            <div className="space-y-2 mb-3">
                              {visit.diagnosis && (
                                <div className="text-sm">
                                  <span className="font-medium text-muted-foreground">Diagnosis: </span>
                                  <span>{visit.diagnosis}</span>
                                </div>
                              )}
                              {visit.treatment && (
                                <div className="text-sm">
                                  <span className="font-medium text-muted-foreground">Treatment: </span>
                                  <span>{visit.treatment}</span>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Prescriptions */}
                          {visit.prescriptions && (
                            <div className="flex items-start gap-2 mb-3 text-sm">
                              <Pill className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                              <div>
                                <span className="font-medium text-muted-foreground">Rx: </span>
                                <span>{visit.prescriptions}</span>
                              </div>
                            </div>
                          )}

                          {/* Vaccinations */}
                          {visit.vaccinations && visit.vaccinations.length > 0 && (
                            <div className="flex items-center gap-2 mb-3">
                              <Syringe className="h-4 w-4 text-muted-foreground" />
                              <div className="flex flex-wrap gap-1">
                                {visit.vaccinations.map((vax, index) => (
                                  <Badge key={index} variant="outline" className="text-xs">
                                    {vax}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Notes */}
                          {visit.notes && (
                            <p className="text-sm text-muted-foreground mt-2 p-2 bg-muted/50 rounded">
                              {visit.notes}
                            </p>
                          )}

                          {/* Documents */}
                          {visit.documentsUrls && visit.documentsUrls.length > 0 && (
                            <div className="flex items-center gap-2 mt-3 pt-3 border-t">
                              <FileText className="h-4 w-4 text-muted-foreground" />
                              <div className="flex flex-wrap gap-2">
                                {visit.documentsUrls.map((url, index) => (
                                  <a
                                    key={index}
                                    href={url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm text-primary hover:underline"
                                  >
                                    Doc {index + 1}
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Dialogs */}
      <VetVisitDialog
        isOpen={vetVisitDialogOpen}
        onClose={() => {
          setVetVisitDialogOpen(false);
          setEditingVetVisit(undefined);
        }}
        petId={petId}
        vetVisit={editingVetVisit}
      />

      <PetDialog
        isOpen={petDialogOpen}
        onClose={() => setPetDialogOpen(false)}
        pet={pet}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingVetVisit} onOpenChange={() => setDeletingVetVisit(undefined)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Vet Visit?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this vet visit record. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteVetVisit} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default PetDetailPage;
