import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DateInput } from '@/components/ui/date-input';
import { useProjectActions } from '@/hooks/useProjects';
import { toast } from '@/hooks/useToast';
import type { Project } from '@/lib/types';

interface ProjectDialogProps {
  isOpen: boolean;
  onClose: () => void;
  project?: Project; // If provided, we're editing
}

export function ProjectDialog({ isOpen, onClose, project }: ProjectDialogProps) {
  const { createProject, updateProject } = useProjectActions();

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    startDate: '',
  });

  const isEditing = !!project;

  // Reset form when dialog opens
  useEffect(() => {
    if (isOpen) {
      if (project) {
        setFormData({
          name: project.name,
          description: project.description || '',
          startDate: project.startDate || '',
        });
      } else {
        // Default start date to today for new projects
        const today = new Date();
        const formattedDate = `${String(today.getMonth() + 1).padStart(2, '0')}/${String(today.getDate()).padStart(2, '0')}/${today.getFullYear()}`;
        setFormData({
          name: '',
          description: '',
          startDate: formattedDate,
        });
      }
    }
  }, [isOpen, project]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a project name',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.startDate.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a start date',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const projectData = {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        startDate: formData.startDate,
        status: 'planning' as const,
      };

      if (isEditing) {
        await updateProject(project.id, {
          ...projectData,
          status: project.status,
          budget: project.budget,
          completionDate: project.completionDate,
          notes: project.notes,
          isArchived: project.isArchived,
        });
        toast({
          title: 'Success',
          description: 'Project updated successfully',
        });
      } else {
        await createProject(projectData);
        toast({
          title: 'Success',
          description: 'Project created successfully',
        });
      }

      onClose();
    } catch (error) {
      console.error('Error saving project:', error);
      toast({
        title: 'Error',
        description: isEditing ? 'Failed to update project' : 'Failed to create project',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Project' : 'New Project'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Project Name */}
          <div className="space-y-2">
            <Label htmlFor="name">
              Project Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., Kitchen Renovation"
              autoFocus
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Brief description of the project..."
              rows={3}
            />
          </div>

          {/* Start Date */}
          <div className="space-y-2">
            <Label htmlFor="startDate">
              Start Date <span className="text-destructive">*</span>
            </Label>
            <DateInput
              id="startDate"
              value={formData.startDate}
              onChange={(value) => setFormData(prev => ({ ...prev, startDate: value }))}
              placeholder="MM/DD/YYYY"
            />
          </div>

          {/* Submit Buttons */}
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-primary hover:bg-primary/90"
            >
              {isSubmitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Project'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
