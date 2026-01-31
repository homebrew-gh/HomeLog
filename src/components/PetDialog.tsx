import { useState, useEffect, useRef } from 'react';
import { Plus, Upload, X, FileText, Image, ChevronDown, ChevronUp, Trash2, MoreVertical, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DateInput } from '@/components/ui/date-input';
import { BlossomImage } from '@/components/BlossomMedia';
import { usePetActions } from '@/hooks/usePets';
import { usePetTypes } from '@/hooks/usePetTypes';
import { useUploadFile, useDeleteFile, NoPrivateServerError, useCanUploadFiles } from '@/hooks/useUploadFile';
import { toast } from '@/hooks/useToast';
import type { Pet } from '@/lib/types';

interface PetDialogProps {
  isOpen: boolean;
  onClose: () => void;
  pet?: Pet; // If provided, we're editing
}

export function PetDialog({ isOpen, onClose, pet }: PetDialogProps) {
  const { createPet, updatePet } = usePetActions();
  const { allPetTypes, addCustomPetType } = usePetTypes();
  const { mutateAsync: uploadFile, isPending: isUploading } = useUploadFile();
  const { mutateAsync: deleteFile, isPending: _isDeleting } = useDeleteFile();
  const canUploadFiles = useCanUploadFiles();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAddType, setShowAddType] = useState(false);
  const [newType, setNewType] = useState('');
  const [showMedical, setShowMedical] = useState(false);
  const [showVet, setShowVet] = useState(false);

  const [formData, setFormData] = useState({
    petType: '',
    name: '',
    species: '',
    breed: '',
    birthDate: '',
    adoptionDate: '',
    weight: '',
    color: '',
    sex: '' as '' | 'male' | 'female' | 'unknown',
    isNeutered: false,
    microchipId: '',
    licenseNumber: '',
    vetClinic: '',
    vetPhone: '',
    allergies: '',
    medications: '',
    medicalConditions: '',
    lastVetVisit: '',
    photoUrl: '',
    documentsUrls: [] as string[],
    notes: '',
  });

  const photoInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);

  const isEditing = !!pet;

  // Reset form when dialog opens
  useEffect(() => {
    if (isOpen) {
      if (pet) {
        setFormData({
          petType: pet.petType,
          name: pet.name,
          species: pet.species || '',
          breed: pet.breed || '',
          birthDate: pet.birthDate || '',
          adoptionDate: pet.adoptionDate || '',
          weight: pet.weight || '',
          color: pet.color || '',
          sex: pet.sex || '',
          isNeutered: pet.isNeutered || false,
          microchipId: pet.microchipId || '',
          licenseNumber: pet.licenseNumber || '',
          vetClinic: pet.vetClinic || '',
          vetPhone: pet.vetPhone || '',
          allergies: pet.allergies || '',
          medications: pet.medications || '',
          medicalConditions: pet.medicalConditions || '',
          lastVetVisit: pet.lastVetVisit || '',
          photoUrl: pet.photoUrl || '',
          documentsUrls: pet.documentsUrls || [],
          notes: pet.notes || '',
        });
        setShowMedical(!!(pet.allergies || pet.medications || pet.medicalConditions || pet.lastVetVisit));
        setShowVet(!!(pet.vetClinic || pet.vetPhone));
      } else {
        setFormData({
          petType: '',
          name: '',
          species: '',
          breed: '',
          birthDate: '',
          adoptionDate: '',
          weight: '',
          color: '',
          sex: '',
          isNeutered: false,
          microchipId: '',
          licenseNumber: '',
          vetClinic: '',
          vetPhone: '',
          allergies: '',
          medications: '',
          medicalConditions: '',
          lastVetVisit: '',
          photoUrl: '',
          documentsUrls: [],
          notes: '',
        });
        setShowMedical(false);
        setShowVet(false);
      }
      setShowAddType(false);
      setNewType('');
    }
  }, [isOpen, pet]);

  const handleFileUpload = async (file: File, type: 'photo' | 'document') => {
    try {
      const tags = await uploadFile(file);
      const url = tags[0]?.[1];
      if (url) {
        if (type === 'document') {
          setFormData(prev => ({
            ...prev,
            documentsUrls: [...prev.documentsUrls, url],
          }));
        } else {
          setFormData(prev => ({
            ...prev,
            photoUrl: url,
          }));
        }
        toast({
          title: 'File uploaded',
          description: `${type.charAt(0).toUpperCase() + type.slice(1)} uploaded successfully.`,
        });
      }
    } catch (error) {
      console.error('File upload error:', error);
      
      if (error instanceof NoPrivateServerError) {
        toast({
          title: 'No private server configured',
          description: 'Please configure a private media server in Settings > Server Settings > Media before uploading sensitive files.',
          variant: 'destructive',
        });
      } else {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        toast({
          title: 'Upload failed',
          description: errorMessage,
          variant: 'destructive',
        });
      }
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file, 'photo');
    e.target.value = '';
  };

  const handleDocumentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file, 'document');
    e.target.value = '';
  };

  const handleRemoveDocument = (index: number, deleteFromServer: boolean = false) => {
    const url = formData.documentsUrls[index];
    
    setFormData(prev => ({
      ...prev,
      documentsUrls: prev.documentsUrls.filter((_, i) => i !== index),
    }));

    if (deleteFromServer && url) {
      deleteFile(url)
        .then(() => {
          toast({
            title: 'File deleted',
            description: 'Document has been removed from your media server.',
          });
        })
        .catch((error) => {
          console.error('Failed to delete file from server:', error);
          toast({
            title: 'Could not delete from server',
            description: error instanceof Error ? error.message : 'The file reference was removed but the file may still exist on the server.',
            variant: 'destructive',
          });
        });
    }
  };

  const handleRemovePhoto = async (deleteFromServer: boolean = false) => {
    const url = formData.photoUrl;
    
    setFormData(prev => ({
      ...prev,
      photoUrl: '',
    }));

    if (deleteFromServer && url) {
      try {
        await deleteFile(url);
        toast({
          title: 'File deleted',
          description: 'Photo has been removed from your media server.',
        });
      } catch (error) {
        console.error('Failed to delete file from server:', error);
        toast({
          title: 'Could not delete from server',
          description: error instanceof Error ? error.message : 'The file reference was removed but the file may still exist on the server.',
          variant: 'destructive',
        });
      }
    }
  };

  const handleAddType = () => {
    if (newType.trim()) {
      addCustomPetType(newType.trim());
      setFormData(prev => ({ ...prev, petType: newType.trim() }));
      setNewType('');
      setShowAddType(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.petType) {
      toast({
        title: 'Pet type required',
        description: 'Please select a pet type.',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.name.trim()) {
      toast({
        title: 'Name required',
        description: 'Please enter your pet\'s name.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const petData = {
        ...formData,
        sex: formData.sex || undefined,
      };

      if (isEditing && pet) {
        await updatePet(pet.id, petData);
        toast({
          title: 'Pet updated',
          description: 'Your pet\'s information has been updated successfully.',
        });
      } else {
        await createPet(petData);
        toast({
          title: 'Pet added',
          description: 'Your pet has been added successfully.',
        });
      }

      onClose();
    } catch {
      toast({
        title: 'Error',
        description: `Failed to ${isEditing ? 'update' : 'add'} pet. Please try again.`,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] sm:max-w-lg max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Pet' : 'Add Pet'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Pet Type Selection */}
          <div className="space-y-2">
            <Label>Pet Type *</Label>
            {showAddType ? (
              <div className="flex gap-2">
                <Input
                  value={newType}
                  onChange={(e) => setNewType(e.target.value)}
                  placeholder="Enter custom type name"
                  className="flex-1"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddType();
                    }
                  }}
                />
                <Button type="button" onClick={handleAddType} size="sm">
                  Add
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setShowAddType(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Select
                  value={formData.petType}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, petType: value }))}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select a pet type" />
                  </SelectTrigger>
                  <SelectContent>
                    {allPetTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button type="button" variant="outline" size="icon" onClick={() => setShowAddType(true)}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., Buddy, Whiskers"
            />
          </div>

          {/* Photo Upload */}
          <div className="space-y-2">
            <Label>Photo</Label>
            {formData.photoUrl ? (
              <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                <BlossomImage 
                  src={formData.photoUrl} 
                  alt={formData.name || 'Pet photo'} 
                  className="h-16 w-16 object-cover rounded-md"
                  showSkeleton={false}
                />
                <span className="text-sm text-muted-foreground flex-1 truncate">Photo uploaded</span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleRemovePhoto(false)}>
                      <X className="h-4 w-4 mr-2" />
                      Remove reference
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => handleRemovePhoto(true)}
                      className="text-red-600 dark:text-red-400"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete from server
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ) : (
              <>
                <input
                  type="file"
                  ref={photoInputRef}
                  onChange={handlePhotoUpload}
                  accept="image/*"
                  className="hidden"
                />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="w-full">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => photoInputRef.current?.click()}
                        disabled={isUploading || !canUploadFiles}
                        className="w-full"
                      >
                        {isUploading ? (
                          <div className="h-4 w-4 mr-2 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        ) : !canUploadFiles ? (
                          <AlertCircle className="h-4 w-4 mr-2 text-amber-500" />
                        ) : (
                          <Image className="h-4 w-4 mr-2" />
                        )}
                        {isUploading ? 'Uploading...' : 'Upload Photo'}
                      </Button>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    {!canUploadFiles 
                      ? 'Configure a private media server in Settings > Server Settings > Media to enable uploads'
                      : 'Upload a photo of your pet'
                    }
                  </TooltipContent>
                </Tooltip>
              </>
            )}
          </div>

          {/* Warning when no private server is configured */}
          {!canUploadFiles && (
            <Alert className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/30">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-sm text-amber-800 dark:text-amber-200">
                <strong>File uploads disabled.</strong> To upload photos and documents, configure a private media server in Settings &gt; Server Settings &gt; Media.
              </AlertDescription>
            </Alert>
          )}

          {/* Species & Breed */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-2">
              <Label htmlFor="species">Species/Breed Type</Label>
              <Input
                id="species"
                value={formData.species}
                onChange={(e) => setFormData(prev => ({ ...prev, species: e.target.value }))}
                placeholder="e.g., Golden Retriever"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="breed">Breed</Label>
              <Input
                id="breed"
                value={formData.breed}
                onChange={(e) => setFormData(prev => ({ ...prev, breed: e.target.value }))}
                placeholder="e.g., Purebred"
              />
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-2">
              <Label>Birth Date</Label>
              <DateInput
                value={formData.birthDate}
                onChange={(value) => setFormData(prev => ({ ...prev, birthDate: value }))}
                placeholder="MM/DD/YYYY"
              />
            </div>
            <div className="space-y-2">
              <Label>Adoption Date</Label>
              <DateInput
                value={formData.adoptionDate}
                onChange={(value) => setFormData(prev => ({ ...prev, adoptionDate: value }))}
                placeholder="MM/DD/YYYY"
              />
            </div>
          </div>

          {/* Physical Characteristics */}
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-2">
              <Label htmlFor="weight">Weight</Label>
              <Input
                id="weight"
                value={formData.weight}
                onChange={(e) => setFormData(prev => ({ ...prev, weight: e.target.value }))}
                placeholder="e.g., 45 lbs"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="color">Color</Label>
              <Input
                id="color"
                value={formData.color}
                onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                placeholder="e.g., Brown"
              />
            </div>
            <div className="space-y-2">
              <Label>Sex</Label>
              <Select
                value={formData.sex}
                onValueChange={(value) => setFormData(prev => ({ ...prev, sex: value as typeof formData.sex }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="unknown">Unknown</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Neutered/Spayed */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="isNeutered"
              checked={formData.isNeutered}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isNeutered: checked === true }))}
            />
            <Label htmlFor="isNeutered" className="text-sm font-normal">
              Spayed/Neutered
            </Label>
          </div>

          {/* IDs */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-2">
              <Label htmlFor="microchipId">Microchip ID</Label>
              <Input
                id="microchipId"
                value={formData.microchipId}
                onChange={(e) => setFormData(prev => ({ ...prev, microchipId: e.target.value }))}
                placeholder="Microchip number"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="licenseNumber">License Number</Label>
              <Input
                id="licenseNumber"
                value={formData.licenseNumber}
                onChange={(e) => setFormData(prev => ({ ...prev, licenseNumber: e.target.value }))}
                placeholder="Pet license"
              />
            </div>
          </div>

          {/* Veterinary Information */}
          <Collapsible open={showVet} onOpenChange={setShowVet}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between p-2 h-auto">
                <span className="text-sm font-medium">Veterinary Information</span>
                {showVet ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label htmlFor="vetClinic">Vet Clinic</Label>
                  <Input
                    id="vetClinic"
                    value={formData.vetClinic}
                    onChange={(e) => setFormData(prev => ({ ...prev, vetClinic: e.target.value }))}
                    placeholder="Clinic name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vetPhone">Vet Phone</Label>
                  <Input
                    id="vetPhone"
                    value={formData.vetPhone}
                    onChange={(e) => setFormData(prev => ({ ...prev, vetPhone: e.target.value }))}
                    placeholder="Phone number"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Last Vet Visit</Label>
                <DateInput
                  value={formData.lastVetVisit}
                  onChange={(value) => setFormData(prev => ({ ...prev, lastVetVisit: value }))}
                  placeholder="MM/DD/YYYY"
                />
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Medical Information */}
          <Collapsible open={showMedical} onOpenChange={setShowMedical}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between p-2 h-auto">
                <span className="text-sm font-medium">Medical Information</span>
                {showMedical ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="allergies">Allergies</Label>
                <Textarea
                  id="allergies"
                  value={formData.allergies}
                  onChange={(e) => setFormData(prev => ({ ...prev, allergies: e.target.value }))}
                  placeholder="List any allergies"
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="medications">Medications</Label>
                <Textarea
                  id="medications"
                  value={formData.medications}
                  onChange={(e) => setFormData(prev => ({ ...prev, medications: e.target.value }))}
                  placeholder="Current medications"
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="medicalConditions">Medical Conditions</Label>
                <Textarea
                  id="medicalConditions"
                  value={formData.medicalConditions}
                  onChange={(e) => setFormData(prev => ({ ...prev, medicalConditions: e.target.value }))}
                  placeholder="Ongoing conditions"
                  rows={2}
                />
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Documents */}
          <div className="space-y-2">
            <Label>Documents</Label>
            <input
              type="file"
              ref={documentInputRef}
              onChange={handleDocumentUpload}
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              className="hidden"
            />
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="w-full block">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => documentInputRef.current?.click()}
                    disabled={isUploading || !canUploadFiles}
                    className="w-full"
                  >
                    {isUploading ? (
                      <div className="h-4 w-4 mr-2 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : !canUploadFiles ? (
                      <AlertCircle className="h-4 w-4 mr-2 text-amber-500" />
                    ) : (
                      <Upload className="h-4 w-4 mr-2" />
                    )}
                    {isUploading ? 'Uploading...' : 'Upload Document'}
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>
                {!canUploadFiles 
                  ? 'Configure a private media server in Settings > Server Settings > Media to enable uploads'
                  : 'Upload vet records, vaccination certificates, or other documents'
                }
              </TooltipContent>
            </Tooltip>

            {formData.documentsUrls.length > 0 && (
              <div className="space-y-2 mt-2">
                {formData.documentsUrls.map((url, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 bg-muted rounded-md">
                    <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm text-muted-foreground flex-1 truncate">
                      Document {index + 1}
                    </span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <a href={url} target="_blank" rel="noopener noreferrer">
                            <FileText className="h-4 w-4 mr-2" />
                            View document
                          </a>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleRemoveDocument(index, false)}>
                          <X className="h-4 w-4 mr-2" />
                          Remove reference
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleRemoveDocument(index, true)}
                          className="text-red-600 dark:text-red-400"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete from server
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Any additional notes about your pet"
              rows={3}
            />
          </div>

          {/* Submit Buttons */}
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || isUploading}
            >
              {isSubmitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Add Pet'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
