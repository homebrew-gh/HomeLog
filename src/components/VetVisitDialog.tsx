import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { 
  Stethoscope, 
  Calendar, 
  Scale, 
  Syringe, 
  Plus, 
  X, 
  FileText,
  DollarSign,
  Pill,
  ClipboardList,
  Upload,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DateInput } from '@/components/ui/date-input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { LoadingAnimation } from '@/components/LoadingAnimation';
import { useVetVisitActions } from '@/hooks/useVetVisits';
import { usePetById, usePetActions } from '@/hooks/usePets';
import { useUploadFile } from '@/hooks/useUploadFile';
import { toast } from '@/hooks/useToast';
import { VET_VISIT_TYPES, type VetVisit, type VetVisitType } from '@/lib/types';

interface VetVisitDialogProps {
  isOpen: boolean;
  onClose: () => void;
  petId: string;
  vetVisit?: VetVisit; // For editing an existing vet visit
}

// Get today's date in MM/DD/YYYY format
function getTodayFormatted(): string {
  return format(new Date(), 'MM/dd/yyyy');
}

export function VetVisitDialog({ isOpen, onClose, petId, vetVisit }: VetVisitDialogProps) {
  const pet = usePetById(petId);
  const { createVetVisit, updateVetVisit } = useVetVisitActions();
  const { updatePet } = usePetActions();
  const { mutateAsync: uploadFile, isPending: isUploading } = useUploadFile();

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    visitDate: getTodayFormatted(),
    visitType: 'checkup' as VetVisitType,
    reason: '',
    vetClinic: '',
    veterinarian: '',
    diagnosis: '',
    treatment: '',
    prescriptions: '',
    weight: '',
    followUpDate: '',
    followUpNotes: '',
    cost: '',
    notes: '',
  });

  // Vaccinations state
  const [vaccinations, setVaccinations] = useState<string[]>([]);
  const [newVaccination, setNewVaccination] = useState('');
  const [showAddVaccination, setShowAddVaccination] = useState(false);

  // Documents state
  const [documentsUrls, setDocumentsUrls] = useState<string[]>([]);

  // Reset form when dialog opens
  useEffect(() => {
    if (isOpen) {
      if (vetVisit) {
        // Editing an existing vet visit
        setFormData({
          visitDate: vetVisit.visitDate,
          visitType: vetVisit.visitType,
          reason: vetVisit.reason,
          vetClinic: vetVisit.vetClinic || '',
          veterinarian: vetVisit.veterinarian || '',
          diagnosis: vetVisit.diagnosis || '',
          treatment: vetVisit.treatment || '',
          prescriptions: vetVisit.prescriptions || '',
          weight: vetVisit.weight || '',
          followUpDate: vetVisit.followUpDate || '',
          followUpNotes: vetVisit.followUpNotes || '',
          cost: vetVisit.cost || '',
          notes: vetVisit.notes || '',
        });
        setVaccinations(vetVisit.vaccinations || []);
        setDocumentsUrls(vetVisit.documentsUrls || []);
      } else {
        // New vet visit - pre-populate with pet's vet info if available
        setFormData({
          visitDate: getTodayFormatted(),
          visitType: 'checkup',
          reason: '',
          vetClinic: pet?.vetClinic || '',
          veterinarian: '',
          diagnosis: '',
          treatment: '',
          prescriptions: '',
          weight: pet?.weight || '',
          followUpDate: '',
          followUpNotes: '',
          cost: '',
          notes: '',
        });
        setVaccinations([]);
        setDocumentsUrls([]);
      }
      setNewVaccination('');
      setShowAddVaccination(false);
    }
  }, [isOpen, vetVisit, pet]);

  const handleAddVaccination = () => {
    if (!newVaccination.trim()) {
      return;
    }
    setVaccinations(prev => [...prev, newVaccination.trim()]);
    setNewVaccination('');
    setShowAddVaccination(false);
  };

  const handleRemoveVaccination = (index: number) => {
    setVaccinations(prev => prev.filter((_, i) => i !== index));
  };

  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const [[_, url]] = await uploadFile(file);
      setDocumentsUrls(prev => [...prev, url]);
      toast({
        title: 'Document uploaded',
        description: 'Your document has been uploaded successfully.',
      });
    } catch {
      toast({
        title: 'Upload failed',
        description: 'Failed to upload document. Please try again.',
        variant: 'destructive',
      });
    }

    // Reset the input
    e.target.value = '';
  };

  const handleRemoveDocument = (index: number) => {
    setDocumentsUrls(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!formData.visitDate) {
      toast({
        title: 'Date required',
        description: 'Please select the visit date.',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.reason.trim()) {
      toast({
        title: 'Reason required',
        description: 'Please enter the reason for the visit.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const visitData = {
        visitDate: formData.visitDate,
        visitType: formData.visitType,
        reason: formData.reason.trim(),
        vetClinic: formData.vetClinic.trim() || undefined,
        veterinarian: formData.veterinarian.trim() || undefined,
        diagnosis: formData.diagnosis.trim() || undefined,
        treatment: formData.treatment.trim() || undefined,
        prescriptions: formData.prescriptions.trim() || undefined,
        weight: formData.weight.trim() || undefined,
        vaccinations: vaccinations.length > 0 ? vaccinations : undefined,
        followUpDate: formData.followUpDate || undefined,
        followUpNotes: formData.followUpNotes.trim() || undefined,
        cost: formData.cost.trim() || undefined,
        documentsUrls: documentsUrls.length > 0 ? documentsUrls : undefined,
        notes: formData.notes.trim() || undefined,
      };

      if (vetVisit) {
        // Update existing vet visit
        await updateVetVisit(vetVisit.id, petId, visitData);
        toast({
          title: 'Vet visit updated',
          description: 'The vet visit has been updated successfully.',
        });
      } else {
        // Create new vet visit
        await createVetVisit(petId, visitData);
        toast({
          title: 'Vet visit logged',
          description: 'The vet visit has been recorded successfully.',
        });

        // Update pet's lastVetVisit and weight if provided
        if (pet) {
          const updates: Partial<typeof pet> = {};
          
          // Update last vet visit date
          updates.lastVetVisit = formData.visitDate;
          
          // Update weight if provided
          if (formData.weight.trim()) {
            updates.weight = formData.weight.trim();
          }

          // Update vet clinic info if not already set on pet
          if (formData.vetClinic.trim() && !pet.vetClinic) {
            updates.vetClinic = formData.vetClinic.trim();
          }

          // Only update if there are changes
          if (Object.keys(updates).length > 0) {
            await updatePet(pet.id, { ...pet, ...updates });
          }
        }
      }

      onClose();
    } catch {
      toast({
        title: 'Error',
        description: vetVisit 
          ? 'Failed to update vet visit. Please try again.' 
          : 'Failed to log vet visit. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show loading overlay during submission
  if (isSubmitting) {
    return (
      <Dialog open={true}>
        <DialogContent className="max-w-[95vw] sm:max-w-lg" hideCloseButton>
          <LoadingAnimation 
            size="md" 
            message={vetVisit ? "Updating Vet Visit" : "Logging Vet Visit"}
            subMessage="Please wait..."
          />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] sm:max-w-lg max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Stethoscope className="h-5 w-5 text-primary" />
            {vetVisit ? 'Edit Vet Visit' : 'Log Vet Visit'}
            {pet && <span className="text-muted-foreground font-normal">- {pet.name}</span>}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Visit Date and Type */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                Visit Date *
              </Label>
              <DateInput
                value={formData.visitDate}
                onChange={(date) => setFormData(prev => ({ ...prev, visitDate: date }))}
                placeholder="Select date"
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-muted-foreground" />
                Visit Type *
              </Label>
              <Select
                value={formData.visitType}
                onValueChange={(value) => setFormData(prev => ({ ...prev, visitType: value as VetVisitType }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {VET_VISIT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label>Reason for Visit *</Label>
            <Input
              value={formData.reason}
              onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
              placeholder="e.g., Annual checkup, limping, vaccinations"
            />
          </div>

          <Separator />

          {/* Vet Information */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Vet Clinic</Label>
              <Input
                value={formData.vetClinic}
                onChange={(e) => setFormData(prev => ({ ...prev, vetClinic: e.target.value }))}
                placeholder="Clinic name"
              />
            </div>
            <div className="space-y-2">
              <Label>Veterinarian</Label>
              <Input
                value={formData.veterinarian}
                onChange={(e) => setFormData(prev => ({ ...prev, veterinarian: e.target.value }))}
                placeholder="Dr. name"
              />
            </div>
          </div>

          {/* Weight */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Scale className="h-4 w-4 text-muted-foreground" />
              Weight at Visit
            </Label>
            <Input
              value={formData.weight}
              onChange={(e) => setFormData(prev => ({ ...prev, weight: e.target.value }))}
              placeholder="e.g., 45 lbs"
            />
          </div>

          <Separator />

          {/* Diagnosis and Treatment */}
          <div className="space-y-2">
            <Label>Diagnosis / Findings</Label>
            <Textarea
              value={formData.diagnosis}
              onChange={(e) => setFormData(prev => ({ ...prev, diagnosis: e.target.value }))}
              placeholder="What was diagnosed or found during the visit..."
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>Treatment Provided</Label>
            <Textarea
              value={formData.treatment}
              onChange={(e) => setFormData(prev => ({ ...prev, treatment: e.target.value }))}
              placeholder="Treatment or procedures performed..."
              rows={2}
            />
          </div>

          {/* Prescriptions */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Pill className="h-4 w-4 text-muted-foreground" />
              Prescriptions / Medications
            </Label>
            <Textarea
              value={formData.prescriptions}
              onChange={(e) => setFormData(prev => ({ ...prev, prescriptions: e.target.value }))}
              placeholder="List any medications prescribed..."
              rows={2}
            />
          </div>

          <Separator />

          {/* Vaccinations */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Syringe className="h-4 w-4 text-muted-foreground" />
              Vaccinations Given
            </Label>
            <div className="flex flex-wrap gap-2">
              {vaccinations.map((vax, index) => (
                <Badge key={index} variant="secondary" className="flex items-center gap-1">
                  {vax}
                  <button
                    type="button"
                    onClick={() => handleRemoveVaccination(index)}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            {showAddVaccination ? (
              <div className="flex gap-2">
                <Input
                  value={newVaccination}
                  onChange={(e) => setNewVaccination(e.target.value)}
                  placeholder="e.g., Rabies, DHPP"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddVaccination()}
                />
                <Button type="button" size="sm" onClick={handleAddVaccination}>
                  Add
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => setShowAddVaccination(false)}>
                  Cancel
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowAddVaccination(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Vaccination
              </Button>
            )}
          </div>

          <Separator />

          {/* Follow-up */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Follow-up Date</Label>
              <DateInput
                value={formData.followUpDate}
                onChange={(date) => setFormData(prev => ({ ...prev, followUpDate: date }))}
                placeholder="Next appointment"
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                Visit Cost
              </Label>
              <Input
                value={formData.cost}
                onChange={(e) => setFormData(prev => ({ ...prev, cost: e.target.value }))}
                placeholder="e.g., $150.00"
              />
            </div>
          </div>

          {formData.followUpDate && (
            <div className="space-y-2">
              <Label>Follow-up Notes</Label>
              <Textarea
                value={formData.followUpNotes}
                onChange={(e) => setFormData(prev => ({ ...prev, followUpNotes: e.target.value }))}
                placeholder="Notes for the follow-up visit..."
                rows={2}
              />
            </div>
          )}

          <Separator />

          {/* Documents */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              Documents
            </Label>
            <div className="space-y-2">
              {documentsUrls.map((url, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-muted rounded-md">
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline truncate flex-1"
                  >
                    Document {index + 1}
                  </a>
                  <button
                    type="button"
                    onClick={() => handleRemoveDocument(index)}
                    className="ml-2 text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <div className="relative">
                <input
                  type="file"
                  accept="image/*,.pdf,.doc,.docx"
                  onChange={handleDocumentUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  disabled={isUploading}
                />
                <Button type="button" variant="outline" size="sm" disabled={isUploading} className="w-full">
                  <Upload className="h-4 w-4 mr-2" />
                  {isUploading ? 'Uploading...' : 'Upload Document'}
                </Button>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Additional Notes</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Any other notes about this visit..."
              rows={3}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {vetVisit ? 'Update Visit' : 'Log Visit'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
