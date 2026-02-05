import { useState, useMemo, useRef } from 'react';
import {
  Plus,
  Trash2,
  Search,
  FileText,
  Quote,
  Upload,
  X,
  StickyNote,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useProjectResearch, useProjectResearchActions } from '@/hooks/useProjectResearch';
import { useUploadFile, useCanUploadFiles, NoPrivateServerError } from '@/hooks/useUploadFile';
import { toast } from '@/hooks/useToast';
import type { ProjectResearchNote, ProjectResearchDocument } from '@/lib/types';

interface ResearchPlanningCardProps {
  projectId: string;
}

function formatTimestamp(createdAt: number): string {
  const d = new Date(createdAt * 1000);
  return d.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function ResearchNoteItem({
  note,
  onDelete,
}: {
  note: ProjectResearchNote;
  onDelete: () => void;
}) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const hasDocuments = note.documents && note.documents.length > 0;
  const hasQuotes = note.quotes && note.quotes.length > 0;

  return (
    <>
      <div className="group rounded-lg border bg-card p-4 text-card-foreground shadow-sm transition-colors hover:bg-muted/30">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-2">
            <h4 className="font-semibold leading-tight">{note.description}</h4>
            <p className="text-xs text-muted-foreground">{formatTimestamp(note.createdAt)}</p>
            <div className="whitespace-pre-wrap text-sm">{note.content}</div>
            {hasDocuments && (
              <div className="space-y-1 pt-2">
                <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <FileText className="h-3.5 w-3.5" />
                  Documents
                </p>
                <ul className="space-y-1">
                  {note.documents!.map((doc, i) => (
                    <li key={i}>
                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline text-sm"
                      >
                        {doc.name || doc.url}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {hasQuotes && (
              <div className="space-y-1 pt-2">
                <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <Quote className="h-3.5 w-3.5" />
                  Quotes
                </p>
                <ul className="space-y-1 pl-3 border-l-2 border-muted">
                  {note.quotes!.map((q, i) => (
                    <li key={i} className="text-sm italic text-muted-foreground">
                      &ldquo;{q}&rdquo;
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="shrink-0 rounded p-1.5 text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
            aria-label="Delete note"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete research note?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove &ldquo;{note.description}&rdquo;. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onDelete();
                setShowDeleteConfirm(false);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function ResearchPlanningCard({ projectId }: ResearchPlanningCardProps) {
  const { data: notes = [], isLoading } = useProjectResearch(projectId);
  const { createNote, deleteNote } = useProjectResearchActions();
  const { mutateAsync: uploadFile, isPending: isUploading } = useUploadFile();
  const canUploadFiles = useCanUploadFiles();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    description: '',
    content: '',
    documents: [] as ProjectResearchDocument[],
    quotes: [] as string[],
  });

  const sortedNotes = useMemo(() => {
    const copy = [...notes];
    copy.sort((a, b) =>
      sortOrder === 'newest' ? b.createdAt - a.createdAt : a.createdAt - b.createdAt
    );
    return copy;
  }, [notes, sortOrder]);

  const resetForm = () => {
    setFormData({
      description: '',
      content: '',
      documents: [],
      quotes: [],
    });
  };

  const handleAddDocument = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    for (const file of Array.from(files)) {
      try {
        const tags = await uploadFile(file);
        const url = tags[0]?.[1];
        if (url) {
          setFormData((prev) => ({
            ...prev,
            documents: [...prev.documents, { url, name: file.name }],
          }));
        }
      } catch (err) {
        if (err instanceof NoPrivateServerError) {
          toast({
            title: 'No media server configured',
            description: 'Configure a media server in Settings to upload documents.',
            variant: 'destructive',
          });
        } else {
          toast({
            title: 'Upload failed',
            description: err instanceof Error ? err.message : 'Failed to upload',
            variant: 'destructive',
          });
        }
      }
    }
    e.target.value = '';
  };

  const removeDocument = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      documents: prev.documents.filter((_, i) => i !== index),
    }));
  };

  const addQuote = () => {
    setFormData((prev) => ({ ...prev, quotes: [...prev.quotes, ''] }));
  };

  const setQuote = (index: number, value: string) => {
    setFormData((prev) => ({
      ...prev,
      quotes: prev.quotes.map((q, i) => (i === index ? value : q)),
    }));
  };

  const removeQuote = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      quotes: prev.quotes.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.description.trim() || !formData.content.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a description and some text.',
        variant: 'destructive',
      });
      return;
    }
    setIsSubmitting(true);
    try {
      await createNote(projectId, {
        description: formData.description.trim(),
        content: formData.content.trim(),
        documents: formData.documents.length ? formData.documents : undefined,
        quotes: formData.quotes.filter((q) => q.trim()).length
          ? formData.quotes.map((q) => q.trim()).filter(Boolean)
          : undefined,
      });
      toast({ title: 'Note added', description: 'Research note has been saved.' });
      resetForm();
      setShowAddDialog(false);
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to save note',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Search className="h-5 w-5 text-primary" />
                Research & Planning
              </CardTitle>
              <CardDescription>
                Structured notes with optional documents and quotes. Each entry is timestamped.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={sortOrder} onValueChange={(v) => setSortOrder(v as 'newest' | 'oldest')}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest first</SelectItem>
                  <SelectItem value="oldest">Oldest first</SelectItem>
                </SelectContent>
              </Select>
              <Button size="sm" onClick={() => setShowAddDialog(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Add Note
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-28 w-full" />
              ))}
            </div>
          ) : notes.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <StickyNote className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>No research or planning notes yet.</p>
              <p className="text-sm mt-1">Add structured notes with description, text, and optional documents or quotes.</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => setShowAddDialog(true)}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add First Note
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {sortedNotes.map((note) => (
                <ResearchNoteItem
                  key={note.id}
                  note={note}
                  onDelete={() => deleteNote(note.id)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={showAddDialog}
        onOpenChange={(open) => {
          if (!open) {
            resetForm();
            setShowAddDialog(false);
          } else setShowAddDialog(true);
        }}
      >
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <StickyNote className="h-5 w-5 text-primary" />
              Add Research / Planning Note
            </DialogTitle>
            <DialogDescription>
              Add a structured note with a description, text, and optional documents or quotes. The note will be timestamped automatically.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="research-description">Description *</Label>
              <Input
                id="research-description"
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="e.g., Contractor comparison, Paint samples"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="research-content">Notes / Text *</Label>
              <Textarea
                id="research-content"
                value={formData.content}
                onChange={(e) => setFormData((prev) => ({ ...prev, content: e.target.value }))}
                placeholder="Your research or planning notes..."
                rows={5}
              />
            </div>

            <div className="space-y-2">
              <Label>Documents (optional)</Label>
              {formData.documents.length > 0 && (
                <ul className="space-y-1 mb-2">
                  {formData.documents.map((doc, i) => (
                    <li key={i} className="flex items-center justify-between gap-2 text-sm">
                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary truncate hover:underline"
                      >
                        {doc.name || doc.url}
                      </a>
                      <button
                        type="button"
                        onClick={() => removeDocument(i)}
                        className="shrink-0 text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleAddDocument}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading || !canUploadFiles}
              >
                {isUploading ? 'Uploading...' : <><Upload className="h-4 w-4 mr-2" /> Add document</>}
              </Button>
              {!canUploadFiles && (
                <p className="text-xs text-muted-foreground">Configure a media server in Settings to upload files.</p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Quotes (optional)</Label>
                <Button type="button" variant="ghost" size="sm" onClick={addQuote}>
                  <Plus className="h-4 w-4 mr-1" /> Add quote
                </Button>
              </div>
              {formData.quotes.length > 0 && (
                <div className="space-y-2">
                  {formData.quotes.map((q, i) => (
                    <div key={i} className="flex gap-2">
                      <Textarea
                        value={q}
                        onChange={(e) => setQuote(i, e.target.value)}
                        placeholder="Paste a quote or reference..."
                        rows={2}
                        className="flex-1"
                      />
                      <button
                        type="button"
                        onClick={() => removeQuote(i)}
                        className="shrink-0 text-muted-foreground hover:text-destructive p-2"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Add Note'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
