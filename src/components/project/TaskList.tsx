import { useState } from 'react';
import { Plus, Trash2, CheckCircle2, Circle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useProjectTasks, useProjectTaskActions } from '@/hooks/useProjectTasks';
import { toast } from '@/hooks/useToast';
import type { ProjectTask } from '@/lib/types';

interface TaskListProps {
  projectId: string;
}

export function TaskList({ projectId }: TaskListProps) {
  const { data: tasks = [], isLoading } = useProjectTasks(projectId);
  const { createTask, toggleTaskComplete, deleteTask } = useProjectTaskActions();

  const [newTaskText, setNewTaskText] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [isAdding, setIsAdding] = useState(false);

  const incompleteTasks = tasks.filter(t => !t.isCompleted);
  const completedTasks = tasks.filter(t => t.isCompleted);

  const handleAddTask = async () => {
    if (!newTaskText.trim()) return;

    setIsAdding(true);
    try {
      await createTask(projectId, {
        description: newTaskText.trim(),
        isCompleted: false,
        priority: newTaskPriority,
      });
      setNewTaskText('');
      toast({
        title: 'Task Added',
        description: 'New task has been added to your list.',
      });
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to add task',
        variant: 'destructive',
      });
    } finally {
      setIsAdding(false);
    }
  };

  const handleToggleComplete = async (task: ProjectTask) => {
    try {
      await toggleTaskComplete(task);
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to update task',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await deleteTask(taskId);
      toast({
        title: 'Task Deleted',
        description: 'Task has been removed.',
      });
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to delete task',
        variant: 'destructive',
      });
    }
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'high': return 'text-red-500';
      case 'medium': return 'text-amber-500';
      case 'low': return 'text-green-500';
      default: return 'text-muted-foreground';
    }
  };

  const getPriorityBadge = (priority?: string) => {
    switch (priority) {
      case 'high': return <Badge variant="destructive" className="text-xs">High</Badge>;
      case 'medium': return <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-700">Medium</Badge>;
      case 'low': return <Badge variant="outline" className="text-xs">Low</Badge>;
      default: return null;
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <CheckCircle2 className="h-5 w-5 text-primary" />
          To-Do List
        </CardTitle>
        <CardDescription>
          {incompleteTasks.length} remaining, {completedTasks.length} completed
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add Task Form */}
        <div className="flex gap-2">
          <Input
            value={newTaskText}
            onChange={(e) => setNewTaskText(e.target.value)}
            placeholder="Add a new task..."
            onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
            disabled={isAdding}
            className="flex-1"
          />
          <Select
            value={newTaskPriority}
            onValueChange={(v) => setNewTaskPriority(v as 'low' | 'medium' | 'high')}
          >
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
            </SelectContent>
          </Select>
          <Button 
            onClick={handleAddTask} 
            disabled={isAdding || !newTaskText.trim()}
            size="icon"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <CheckCircle2 className="h-10 w-10 mx-auto mb-2 opacity-30" />
            <p>No tasks yet. Add your first task above!</p>
          </div>
        ) : (
          <div className="space-y-1">
            {/* Incomplete Tasks */}
            {incompleteTasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 group transition-colors"
              >
                <button
                  onClick={() => handleToggleComplete(task)}
                  className={`shrink-0 ${getPriorityColor(task.priority)}`}
                >
                  <Circle className="h-5 w-5" />
                </button>
                <span className="flex-1 text-foreground">{task.description}</span>
                {getPriorityBadge(task.priority)}
                <button
                  onClick={() => handleDeleteTask(task.id)}
                  className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}

            {/* Completed Tasks */}
            {completedTasks.length > 0 && (
              <div className="pt-4 mt-4 border-t">
                <p className="text-sm text-muted-foreground mb-2">Completed</p>
                {completedTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 group transition-colors"
                  >
                    <button
                      onClick={() => handleToggleComplete(task)}
                      className="shrink-0 text-green-500"
                    >
                      <CheckCircle2 className="h-5 w-5" />
                    </button>
                    <span className="flex-1 text-muted-foreground line-through">
                      {task.description}
                    </span>
                    <button
                      onClick={() => handleDeleteTask(task.id)}
                      className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
