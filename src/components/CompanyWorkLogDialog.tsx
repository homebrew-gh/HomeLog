import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import {
  ClipboardList,
  Calendar,
  DollarSign,
  FileText,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DateInput } from '@/components/ui/date-input';
import { Separator } from '@/components/ui/separator';
import { LoadingAnimation } from '@/components/LoadingAnimation';
import { useCompanyWorkLogActions } from '@/hooks/useCompanyWorkLogs';
import { useUploadFile } from '@/hooks/useUploadFile';
import { toast } from '@/hooks/useToast';
import type { CompanyWorkLog } from '@/lib/types';

interface CompanyWorkLogDialogProps {
  isOpen: boolean;
  onClose: () => void;
  companyId: string;
  companyName: string;
  workLog?: CompanyWorkLog | null;
}

function getTodayFormatted(): string {
  return format(new Date(), 'MM/dd/yyyy');
}

export function CompanyWorkLogDialog({
  isOpen,
  onClose,
  companyId,
  companyName,
  workLog,
}: CompanyWorkLogDialogProps) {
  const { createWorkLog, updateWorkLog } = useCompanyWorkLogActions();
  const { mutateAsync: uploadFile, isPending: isUploading } = useUploadFile();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [useDateRange, setUseDateRange] = useState(false);

  const [formData, setFormData] = useState({
    description: '',
    totalPrice: '',
    completedDate: '',
    completedDateStart: '',
    completedDateEnd: '',
    notes: '',
    invoiceUrl: '',
  });

  useEffect(() => {
    if (isOpen) {
      if (workLog) {
        setFormData({
          description: workLog.description,
          totalPrice: workLog.totalPrice ?? '',
          completedDate: workLog.completedDate ?? '',
          completedDateStart: workLog.completedDateStart ?? '',
          completedDateEnd: workLog.completedDateEnd ?? '',
          notes: workLog.notes ?? '',
          invoiceUrl: workLog.invoiceUrl ?? '',
        });
        setUseDateRange(!!(workLog.completedDateStart || workLog.completedDateEnd));
      } else {
        setFormData({
          description: '',
          totalPrice: '',
          completedDate: getTodayFormatted(),
          completedDateStart: '',
          completedDateEnd: '',
          notes: '',
          invoiceUrl: '',
        });
        setUseDateRange(false);
      }
    }
  }, [isOpen, workLog]);

  const handleInvoiceUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const [[_, url]] = await uploadFile(file);
      setFormData((prev) => ({ ...prev, invoiceUrl: url }));
      toast({
        title: 'Invoice uploaded',
        description: 'Your invoice has been uploaded successfully.',
      });
    } catch {
      toast({
        title: 'Upload failed',
        description: 'Failed to upload invoice. Please try again.',
        variant: 'destructive',
      });
    }
    e.target.value = '';
  };

  const handleSubmit = async () => {
    if (!formData.description.trim()) {
      toast({
        title: 'Description required',
        description: 'Please enter a brief description of the work done.',
        variant: 'destructive',
      });
      return;
    }

    if (useDateRange) {
      if (!formData.completedDateStart?.trim() || !formData.completedDateEnd?.trim()) {
        toast({
          title: 'Date range required',
          description: 'Please enter both start and end dates for the work period.',
          variant: 'destructive',
        });
        return;
      }
    } else {
      if (!formData.completedDate?.trim()) {
        toast({
          title: 'Completion date required',
          description: 'Please select when the work was completed.',
          variant: 'destructive',
        });
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const payload = {
        description: formData.description.trim(),
        totalPrice: formData.totalPrice.trim() || undefined,
        completedDate: useDateRange ? undefined : (formData.completedDate.trim() || undefined),
        completedDateStart: useDateRange ? formData.completedDateStart.trim() || undefined : undefined,
        completedDateEnd: useDateRange ? formData.completedDateEnd.trim() || undefined : undefined,
        notes: formData.notes.trim() || undefined,
        invoiceUrl: formData.invoiceUrl.trim() || undefined,
      };

      if (workLog) {
        await updateWorkLog(workLog.id, companyId, payload);
        toast({
          title: 'Work log updated',
          description: 'Your work log has been updated successfully.',
        });
      } else {
        await createWorkLog(companyId, payload);
        toast({
          title: 'Work logged',
          description: 'Your work has been logged successfully.',
        });
      }
      onClose();
    } catch {
      toast({
        title: workLog ? 'Update failed' : 'Log failed',
        description: 'Something went wrong. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitting) {
    return (
      <Dialog open={true}>
        <DialogContent className="max-w-[95vw] sm:max-w-lg" hideCloseButton>
          <LoadingAnimation
            size="md"
            message={workLog ? 'Updating work log' : 'Logging work'}
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
            <ClipboardList className="h-5 w-5 text-primary" />
            {workLog ? 'Edit work log' : 'Log work'}
            <span className="text-muted-foreground font-normal">– {companyName}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Description */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-muted-foreground" />
              Description of work *
            </Label>
            <Input
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="e.g., Annual HVAC tune-up, replaced filter"
            />
          </div>

          {/* Total price */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              Total price
            </Label>
            <Input
              value={formData.totalPrice}
              onChange={(e) => setFormData((prev) => ({ ...prev, totalPrice: e.target.value }))}
              placeholder="e.g., $150.00"
            />
          </div>

          <Separator />

          {/* Date: single or range */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="use-date-range"
                checked={useDateRange}
                onChange={(e) => setUseDateRange(e.target.checked)}
                className="rounded border-input"
              />
              <Label htmlFor="use-date-range" className="font-normal cursor-pointer">
                Work spanned multiple days (date range)
              </Label>
            </div>

            {useDateRange ? (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    Start date *
                  </Label>
                  <DateInput
                    value={formData.completedDateStart}
                    onChange={(date) => setFormData((prev) => ({ ...prev, completedDateStart: date }))}
                    placeholder="MM/DD/YYYY"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    End date *
                  </Label>
                  <DateInput
                    value={formData.completedDateEnd}
                    onChange={(date) => setFormData((prev) => ({ ...prev, completedDateEnd: date }))}
                    placeholder="MM/DD/YYYY"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  Completion date *
                </Label>
                <DateInput
                  value={formData.completedDate}
                  onChange={(date) => setFormData((prev) => ({ ...prev, completedDate: date }))}
                  placeholder="MM/DD/YYYY"
                />
              </div>
            )}
          </div>

          <Separator />

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
              placeholder="Any additional notes..."
              rows={3}
            />
          </div>

          {/* Invoice upload */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              Invoice
            </Label>
            {formData.invoiceUrl ? (
              <div className="flex items-center gap-2 p-3 rounded-lg border bg-muted/30">
                <FileText className="h-5 w-5 text-primary shrink-0" />
                <a
                  href={formData.invoiceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline truncate flex-1 min-w-0"
                >
                  View invoice
                </a>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setFormData((prev) => ({ ...prev, invoiceUrl: '' }))}
                  aria-label="Remove invoice"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Input
                  type="file"
                  accept=".pdf,image/*"
                  onChange={handleInvoiceUpload}
                  disabled={isUploading}
                  className="max-w-[200px]"
                />
                {isUploading && (
                  <span className="text-sm text-muted-foreground">Uploading…</span>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!formData.description.trim()}>
            {workLog ? 'Update work log' : 'Log work'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
