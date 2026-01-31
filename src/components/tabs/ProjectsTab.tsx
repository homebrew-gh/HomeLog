import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Plus, ChevronDown, ChevronRight, FolderKanban, List, LayoutGrid, Calendar, Archive, ArrowLeft, Clock, CheckCircle2, Pause, PlayCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { ProjectDialog } from '@/components/ProjectDialog';
import { useProjects } from '@/hooks/useProjects';
import { useUserPreferences } from '@/contexts/UserPreferencesContext';
import type { Project } from '@/lib/types';

// Get icon based on project status
function getStatusIcon(status?: Project['status']) {
  switch (status) {
    case 'completed':
      return CheckCircle2;
    case 'on_hold':
      return Pause;
    case 'in_progress':
      return PlayCircle;
    case 'planning':
    default:
      return Clock;
  }
}

// Get status display text
function getStatusText(status?: Project['status']) {
  switch (status) {
    case 'completed':
      return 'Completed';
    case 'on_hold':
      return 'On Hold';
    case 'in_progress':
      return 'In Progress';
    case 'planning':
    default:
      return 'Planning';
  }
}

// Get status badge variant
function getStatusVariant(status?: Project['status']): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'completed':
      return 'default';
    case 'on_hold':
      return 'destructive';
    case 'in_progress':
      return 'secondary';
    case 'planning':
    default:
      return 'outline';
  }
}

export function ProjectsTab() {
  const { data: projects = [], isLoading } = useProjects();
  const { preferences, setProjectsViewMode } = useUserPreferences();
  const viewMode = preferences.projectsViewMode || 'card';

  // View mode: 'active' or 'archived'
  const [showArchived, setShowArchived] = useState(false);

  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | undefined>();

  // Collapsed statuses state (for list view)
  const [collapsedStatuses, setCollapsedStatuses] = useState<Set<string>>(new Set());

  // Filter projects based on archive state
  const activeProjects = useMemo(() => projects.filter(p => !p.isArchived), [projects]);
  const archivedProjects = useMemo(() => projects.filter(p => p.isArchived), [projects]);
  const displayedProjects = showArchived ? archivedProjects : activeProjects;

  // Group projects by status
  const projectsByStatus = useMemo(() => {
    const grouped: Record<string, Project[]> = {};
    const statusOrder = ['in_progress', 'planning', 'on_hold', 'completed'];

    for (const project of displayedProjects) {
      const status = project.status || 'planning';
      if (!grouped[status]) {
        grouped[status] = [];
      }
      grouped[status].push(project);
    }

    // Sort statuses by predefined order
    const sortedStatuses = Object.keys(grouped).sort((a, b) => {
      const aIndex = statusOrder.indexOf(a);
      const bIndex = statusOrder.indexOf(b);
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    });

    return { grouped, sortedStatuses };
  }, [displayedProjects]);

  const toggleStatus = (status: string) => {
    setCollapsedStatuses(prev => {
      const newSet = new Set(prev);
      if (newSet.has(status)) {
        newSet.delete(status);
      } else {
        newSet.add(status);
      }
      return newSet;
    });
  };

  const handleEditProject = (project: Project) => {
    setEditingProject(project);
    setDialogOpen(true);
  };

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
          {showArchived ? (
            <>
              <Archive className="h-6 w-6 text-muted-foreground" />
              Archived Projects
            </>
          ) : (
            <>
              <FolderKanban className="h-6 w-6 text-primary" />
              Projects
            </>
          )}
        </h2>
        <div className="flex items-center gap-2">
          {/* Archive Toggle */}
          {showArchived ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowArchived(false)}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Projects
            </Button>
          ) : (
            <>
              {archivedProjects.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowArchived(true)}
                  className="text-muted-foreground"
                >
                  <Archive className="h-4 w-4 mr-2" />
                  Archived ({archivedProjects.length})
                </Button>
              )}
              {/* View Toggle */}
              {activeProjects.length > 0 && (
                <ToggleGroup 
                  type="single" 
                  value={viewMode} 
                  onValueChange={(value) => value && setProjectsViewMode(value as 'list' | 'card')}
                  className="bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5"
                >
                  <ToggleGroupItem 
                    value="list" 
                    aria-label="List view"
                    className="data-[state=on]:bg-white dark:data-[state=on]:bg-slate-700 data-[state=on]:shadow-sm rounded-md px-2.5 py-1.5"
                  >
                    <List className="h-4 w-4" />
                  </ToggleGroupItem>
                  <ToggleGroupItem 
                    value="card" 
                    aria-label="Card view"
                    className="data-[state=on]:bg-white dark:data-[state=on]:bg-slate-700 data-[state=on]:shadow-sm rounded-md px-2.5 py-1.5"
                  >
                    <LayoutGrid className="h-4 w-4" />
                  </ToggleGroupItem>
                </ToggleGroup>
              )}
              <Button
                onClick={() => {
                  setEditingProject(undefined);
                  setDialogOpen(true);
                }}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Project
              </Button>
            </>
          )}
        </div>
      </div>

      {isLoading ? (
        viewMode === 'list' ? (
          <Card className="bg-card border-border">
            <CardContent className="p-6 space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-6 w-32" />
                  <div className="pl-6 space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-4 w-40" />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {[1, 2].map((i) => (
              <Card key={i} className="bg-card border-border">
                <CardHeader className="pb-3">
                  <Skeleton className="h-6 w-32" />
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3].map((j) => (
                      <Skeleton key={j} className="h-32 rounded-xl" />
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )
      ) : displayedProjects.length === 0 ? (
        <Card className="bg-card border-border border-dashed">
          <CardContent className="py-12 text-center">
            {showArchived ? (
              <>
                <Archive className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">
                  No archived projects.
                </p>
                <Button
                  onClick={() => setShowArchived(false)}
                  variant="outline"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Projects
                </Button>
              </>
            ) : (
              <>
                <FolderKanban className="h-12 w-12 text-primary/30 mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">
                  No projects added yet. Start planning your home improvements!
                </p>
                <Button
                  onClick={() => {
                    setEditingProject(undefined);
                    setDialogOpen(true);
                  }}
                  variant="outline"
                  className="border-primary/30 hover:bg-primary/10"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Project
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      ) : viewMode === 'list' ? (
        /* List View */
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            {projectsByStatus.sortedStatuses.map((status) => {
              const StatusIcon = getStatusIcon(status as Project['status']);
              return (
                <Collapsible
                  key={status}
                  open={!collapsedStatuses.has(status)}
                  onOpenChange={() => toggleStatus(status)}
                  className="mb-2 last:mb-0"
                >
                  <CollapsibleTrigger className="flex items-center gap-2 w-full p-2 rounded-lg hover:bg-primary/10 transition-colors">
                    {collapsedStatuses.has(status) ? (
                      <ChevronRight className="h-4 w-4 text-slate-500" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-slate-500" />
                    )}
                    <StatusIcon className="h-4 w-4 text-primary" />
                    <span className="font-semibold text-foreground">
                      {getStatusText(status as Project['status'])}
                    </span>
                    <Badge variant="secondary" className="ml-auto bg-primary/10 text-primary">
                      {projectsByStatus.grouped[status].length}
                    </Badge>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="pl-8 py-2 space-y-1">
                      {projectsByStatus.grouped[status].map((project) => (
                        <Link
                          key={project.id}
                          to={`/project/${project.id}`}
                          className="flex items-center gap-2 w-full p-2 rounded-lg text-left hover:bg-primary/5 transition-colors group"
                        >
                          <span className="text-muted-foreground group-hover:text-primary">
                            {project.name}
                          </span>
                          {project.startDate && (
                            <span className="text-sm text-slate-400 dark:text-slate-500">
                              - Started {project.startDate}
                            </span>
                          )}
                        </Link>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </CardContent>
        </Card>
      ) : (
        /* Card View */
        <div className="space-y-6">
          {projectsByStatus.sortedStatuses.map((status) => {
            const StatusIcon = getStatusIcon(status as Project['status']);
            return (
              <Card 
                key={status} 
                className="bg-card border-border overflow-hidden"
              >
                <CardHeader className="pb-3 bg-gradient-to-r from-primary/10 to-transparent">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <div className="p-1.5 rounded-lg bg-primary/10">
                      <StatusIcon className="h-4 w-4 text-primary" />
                    </div>
                    <span className="text-foreground">{getStatusText(status as Project['status'])}</span>
                    <Badge variant="secondary" className="ml-auto bg-primary/10 text-primary">
                      {projectsByStatus.grouped[status].length} {projectsByStatus.grouped[status].length === 1 ? 'project' : 'projects'}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {projectsByStatus.grouped[status].map((project) => (
                      <ProjectCard
                        key={project.id}
                        project={project}
                        onEdit={() => handleEditProject(project)}
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Dialogs */}
      <ProjectDialog
        isOpen={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setEditingProject(undefined);
        }}
        project={editingProject}
      />
    </section>
  );
}

interface ProjectCardProps {
  project: Project;
  onEdit: () => void;
}

function ProjectCard({ project, onEdit: _onEdit }: ProjectCardProps) {
  const StatusIcon = getStatusIcon(project.status);

  return (
    <div className="group relative flex flex-col p-4 rounded-xl border-2 border-border bg-gradient-to-br from-card to-muted/30 hover:border-primary/50 hover:shadow-md transition-all duration-200">
      {/* Clickable area for project page */}
      <Link
        to={`/project/${project.id}`}
        className="text-left flex-1 flex flex-col"
      >
        {/* Icon and Status */}
        <div className="flex items-start justify-between mb-3">
          <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
            <FolderKanban className="h-5 w-5 text-primary" />
          </div>
          <Badge variant={getStatusVariant(project.status)} className="text-xs">
            <StatusIcon className="h-3 w-3 mr-1" />
            {getStatusText(project.status)}
          </Badge>
        </div>

        {/* Name */}
        <h3 className="font-semibold text-foreground mb-1 line-clamp-2 group-hover:text-primary transition-colors">
          {project.name}
        </h3>

        {/* Description */}
        {project.description && (
          <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mb-2">
            {project.description}
          </p>
        )}

        {/* Start Date */}
        {project.startDate && (
          <p className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1.5 mt-auto pt-2 border-t border-slate-100 dark:border-slate-700">
            <Calendar className="h-3 w-3" />
            <span>Started {project.startDate}</span>
          </p>
        )}
      </Link>

      {/* Hover indicator */}
      <div className="absolute inset-0 rounded-xl ring-2 ring-primary ring-opacity-0 group-hover:ring-opacity-20 transition-all pointer-events-none" />
    </div>
  );
}
