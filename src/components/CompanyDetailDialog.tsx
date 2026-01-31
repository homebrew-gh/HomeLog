import { useState } from 'react';
import { 
  ExternalLink, 
  FileText,
  Edit, 
  Trash2,
  Users,
  Phone,
  Mail,
  Globe,
  MapPin,
  Star,
  Shield,
  StickyNote,
  Calendar,
  DollarSign,
  User,
  CreditCard,
  Bitcoin
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { LoadingAnimation } from '@/components/LoadingAnimation';
import { BlossomLink } from '@/components/BlossomMedia';
import { useCompanyActions } from '@/hooks/useCompanies';
import { useSubscriptionsByCompanyId } from '@/hooks/useSubscriptions';
import { toast } from '@/hooks/useToast';
import type { Company } from '@/lib/types';
import { BILLING_FREQUENCIES } from '@/lib/types';

interface CompanyDetailDialogProps {
  isOpen: boolean;
  onClose: () => void;
  company: Company;
  onEdit: () => void;
  onDelete?: () => void;
}

export function CompanyDetailDialog({ isOpen, onClose, company, onEdit, onDelete }: CompanyDetailDialogProps) {
  const { deleteCompany } = useCompanyActions();
  const linkedSubscriptions = useSubscriptionsByCompanyId(company.id);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setShowDeleteConfirm(false);
    setIsDeleting(true);
    try {
      await deleteCompany(company.id);
      toast({
        title: 'Company deleted',
        description: 'The company has been removed.',
      });
      // Close dialog and notify parent of deletion
      onClose();
      onDelete?.();
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to delete company. Please try again.',
        variant: 'destructive',
      });
      setIsDeleting(false);
    }
  };

  // Show full-screen loading overlay during deletion
  if (isDeleting) {
    return (
      <Dialog open={true}>
        <DialogContent className="max-w-[95vw] sm:max-w-md" hideCloseButton>
          <LoadingAnimation 
            size="md" 
            message="Deleting Company" 
            subMessage="Please wait..."
          />
        </DialogContent>
      </Dialog>
    );
  }

  const handleEdit = () => {
    onClose();
    onEdit();
  };

  // Format full address
  const formatAddress = () => {
    const parts: string[] = [];
    if (company.address) parts.push(company.address);
    const cityStateZip = [
      company.city,
      company.state,
      company.zipCode
    ].filter(Boolean).join(', ');
    if (cityStateZip) parts.push(cityStateZip);
    return parts.join('\n');
  };

  const fullAddress = formatAddress();

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-[95vw] sm:max-w-md max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-sky-600" />
              <span>{company.name}</span>
            </DialogTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="secondary">{company.serviceType}</Badge>
              {company.rating && (
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`h-4 w-4 ${
                        star <= company.rating!
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-slate-300 dark:text-slate-600'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Contact Person */}
            {company.contactName && (
              <div className="flex items-start gap-3">
                <User className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Contact Person</p>
                  <p>{company.contactName}</p>
                </div>
              </div>
            )}

            {/* Phone */}
            {company.phone && (
              <div className="flex items-start gap-3">
                <Phone className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-muted-foreground">Phone</p>
                  <a 
                    href={`tel:${company.phone}`}
                    className="text-primary hover:underline"
                  >
                    {company.phone}
                  </a>
                </div>
              </div>
            )}

            {/* Email */}
            {company.email && (
              <div className="flex items-start gap-3">
                <Mail className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-muted-foreground">Email</p>
                  <a 
                    href={`mailto:${company.email}`}
                    className="text-primary hover:underline truncate block"
                  >
                    {company.email}
                  </a>
                </div>
              </div>
            )}

            {/* Website */}
            {company.website && (
              <div className="flex items-start gap-3">
                <Globe className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-muted-foreground">Website</p>
                  <a 
                    href={company.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline flex items-center gap-1"
                  >
                    <span className="truncate">{company.website.replace(/^https?:\/\//, '')}</span>
                    <ExternalLink className="h-3 w-3 shrink-0" />
                  </a>
                </div>
              </div>
            )}

            {/* Address */}
            {fullAddress && (
              <>
                <Separator />
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Address</p>
                    <p className="whitespace-pre-line">{fullAddress}</p>
                  </div>
                </div>
              </>
            )}

            {/* Business Details */}
            {(company.licenseNumber || company.insuranceInfo) && (
              <>
                <Separator />
                {company.licenseNumber && (
                  <div className="flex items-start gap-3">
                    <Shield className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">License Number</p>
                      <p className="font-mono text-sm">{company.licenseNumber}</p>
                    </div>
                  </div>
                )}

                {company.insuranceInfo && (
                  <div className="flex items-start gap-3">
                    <Shield className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Insurance</p>
                      <p>{company.insuranceInfo}</p>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Bitcoin Payment */}
            {company.acceptsBitcoin && (
              <>
                <Separator />
                <div className="flex items-start gap-3 p-3 rounded-lg bg-gradient-to-r from-orange-500/10 to-orange-500/5">
                  <Bitcoin className="h-5 w-5 text-orange-500 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-orange-600 dark:text-orange-400">Accepts Bitcoin</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      This business accepts Bitcoin as payment.{' '}
                      <a
                        href={`https://btcmap.org/map?search=${encodeURIComponent([company.name, company.city, company.state].filter(Boolean).join(' '))}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline inline-flex items-center gap-1"
                      >
                        View on BTCMap
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </p>
                  </div>
                </div>
              </>
            )}

            {/* Invoices */}
            {company.invoices && company.invoices.length > 0 && (
              <>
                <Separator />
                <div className="flex items-start gap-3">
                  <FileText className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-muted-foreground mb-2">
                      Invoices ({company.invoices.length})
                    </p>
                    <div className="space-y-2">
                      {company.invoices.map((invoice, index) => (
                        <BlossomLink 
                          key={index}
                          href={invoice.url}
                          className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors group text-foreground"
                          showIcon={false}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 text-sm">
                              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="font-medium">{invoice.date}</span>
                              {invoice.amount && (
                                <>
                                  <DollarSign className="h-3.5 w-3.5 text-muted-foreground ml-1" />
                                  <span>{invoice.amount}</span>
                                </>
                              )}
                            </div>
                            {invoice.description && (
                              <p className="text-xs text-muted-foreground truncate mt-0.5">
                                {invoice.description}
                              </p>
                            )}
                          </div>
                          <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary shrink-0" />
                        </BlossomLink>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Linked Subscriptions */}
            {linkedSubscriptions.length > 0 && (
              <>
                <Separator />
                <div className="flex items-start gap-3">
                  <CreditCard className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-muted-foreground mb-2">
                      Active Subscriptions ({linkedSubscriptions.length})
                    </p>
                    <div className="space-y-2">
                      {linkedSubscriptions.map((subscription) => {
                        const billingLabel = BILLING_FREQUENCIES.find(f => f.value === subscription.billingFrequency)?.label || subscription.billingFrequency;
                        return (
                          <div 
                            key={subscription.id}
                            className="flex items-center justify-between p-2 rounded-lg bg-primary/5 border border-primary/10"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{subscription.name}</p>
                              <p className="text-xs text-muted-foreground">{subscription.subscriptionType}</p>
                            </div>
                            <div className="text-right ml-2">
                              <p className="font-semibold text-primary">{subscription.cost}</p>
                              <p className="text-xs text-muted-foreground">{billingLabel}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Notes */}
            {company.notes && (
              <>
                <Separator />
                <div className="flex items-start gap-3">
                  <StickyNote className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Notes</p>
                    <p className="whitespace-pre-wrap">{company.notes}</p>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="flex justify-between pt-4 border-t">
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleEdit}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
              <Button variant="destructive" onClick={() => setShowDeleteConfirm(true)}>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </div>
            <Button variant="ghost" onClick={onClose}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Company?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{company.name}" and all associated invoices. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
