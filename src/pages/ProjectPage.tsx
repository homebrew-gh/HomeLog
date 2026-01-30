import { useParams, Link } from 'react-router-dom';
import { FolderKanban, ArrowLeft, Construction, Calendar, Clock, CheckCircle2, Pause, PlayCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useProjectById, useProjects } from '@/hooks/useProjects';
import NotFound from './NotFound';
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

export function ProjectPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const project = useProjectById(projectId);
  const { isLoading } = useProjects();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container max-w-4xl mx-auto px-4 py-8">
          <Skeleton className="h-8 w-48 mb-6" />
          <Card>
            <CardHeader>
              <Skeleton className="h-8 w-64" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!project) {
    return <NotFound />;
  }

  const StatusIcon = getStatusIcon(project.status);

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl mx-auto px-4 py-8">
        {/* Back Link */}
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>

        {/* Project Header */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-primary/10">
                  <FolderKanban className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-2xl">{project.name}</CardTitle>
                  {project.description && (
                    <p className="text-muted-foreground mt-1">{project.description}</p>
                  )}
                </div>
              </div>
              <Badge variant={getStatusVariant(project.status)} className="text-sm">
                <StatusIcon className="h-4 w-4 mr-1" />
                {getStatusText(project.status)}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {project.startDate && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>Started {project.startDate}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Under Construction Notice */}
        <Card className="border-dashed border-2 border-primary/30 bg-primary/5">
          <CardContent className="py-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/20 mb-4">
              <Construction className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">
              Feature Under Construction
            </h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              This project management page is being built. Soon you'll be able to track budgets, timelines, tasks, and more for your home improvement projects.
            </p>
            <Button
              variant="outline"
              asChild
              className="border-primary/30 hover:bg-primary/10"
            >
              <Link to="/">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Return to Dashboard
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
