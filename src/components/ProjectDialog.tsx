import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { DateInput } from '@/components/ui/date-input';
import { useProjectActions } from '@/hooks/useProjects';
import { useCompanies } from '@/hooks/useCompanies';
import { toast } from '@/hooks/useToast';
import type { Project } from '@/lib/types';

interface ProjectDialogProps {
  isOpen: boolean;
  onClose: () => void;
  project?: Project; // If provided, we're editing
}

export function ProjectDialog({ isOpen, onClose, project }: ProjectDialogProps) {
  const { createProject, updateProject } = useProjectActions();
  const { data: companies = [] } = useCompanies();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    startDate: '',
    budget: '',
    targetCompletionDate: '',
    companyIds: [] as string[],
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
          budget: project.budget || '',
          targetCompletionDate: project.targetCompletionDate || '',
          companyIds: project.companyIds || [],
        });
        // Show advanced section if any advanced fields are set
        setShowAdvanced(!!(project.budget || project.targetCompletionDate || (project.companyIds && project.companyIds.length > 0)));
      } else {
        // Default start date to today for new projects
        const today = new Date();
        const formattedDate = `${String(today.getMonth() + 1).padStart(2, '0')}/${String(today.getDate()).padStart(2, '0')}/${today.getFullYear()}`;
        setFormData({
          name: '',
          description: '',
          startDate: formattedDate,
          budget: '',
          targetCompletionDate: '',
          companyIds: [],
        });
        setShowAdvanced(false);
      }
    }
  }, [isOpen, project]);

  const handleCompanyToggle = (companyId: string) => {
    setFormData(prev => ({
      ...prev,
      companyIds: prev.companyIds.includes(companyId)
        ? prev.companyIds.filter(id => id !== companyId)
        : [...prev.companyIds, companyId],
    }));
  };

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
        budget: formData.budget.trim() || undefined,
        targetCompletionDate: formData.targetCompletionDate || undefined,
        companyIds: formData.companyIds.length > 0 ? formData.companyIds : undefined,
        status: 'planning' as const,
      };

      if (isEditing) {
        await updateProject(project.id, {
          ...projectData,
          status: project.status,
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

          {/* Advanced Options */}
          <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
            <CollapsibleTrigger asChild>
              <Button type="button" variant="ghost" size="sm" className="w-full justify-start text-muted-foreground">
                {showAdvanced ? '- Hide additional options' : '+ Show additional options'}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 pt-2">
              {/* Target Completion Date */}
              <div className="space-y-2">
                <Label htmlFor="targetCompletionDate">Target Completion Date</Label>
                <DateInput
                  id="targetCompletionDate"
                  value={formData.targetCompletionDate}
                  onChange={(value) => setFormData(prev => ({ ...prev, targetCompletionDate: value }))}
                  placeholder="MM/DD/YYYY"
                />
              </div>

              {/* Budget */}
              <div className="space-y-2">
                <Label htmlFor="budget">Budget</Label>
                <Input
                  id="budget"
                  value={formData.budget}
                  onChange={(e) => setFormData(prev => ({ ...prev, budget: e.target.value }))}
                  placeholder="e.g., $5,000"
                />
              </div>

              {/* Linked Companies */}
              {companies.length > 0 && (
                <div className="space-y-2">
                  <Label>Link Companies/Services</Label>
                  <div className="flex flex-wrap gap-2 p-3 border rounded-lg bg-muted/30 max-h-32 overflow-y-auto">
                    {companies.map((company) => (
                      <Badge
                        key={company.id}
                        variant={formData.companyIds.includes(company.id) ? 'default' : 'outline'}
                        className="cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => handleCompanyToggle(company.id)}
                      >
                        {company.name}
                        {formData.companyIds.includes(company.id) && (
                          <X className="h-3 w-3 ml-1" />
                        )}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Click to toggle companies associated with this project
                  </p>
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>

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
