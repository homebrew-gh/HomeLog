import { useState, useMemo } from 'react';
import { 
  CreditCard, 
  Plus, 
  ChevronDown, 
  ChevronRight, 
  List, 
  LayoutGrid,
  DollarSign,
  Calendar,
  Building,
  Tv,
  Monitor,
  Heart,
  ShoppingBag,
  Car,
  Utensils,
  Gamepad2,
  Newspaper,
  Music,
  Home,
  Wallet,
  Dog,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { SubscriptionDialog } from '@/components/SubscriptionDialog';
import { SubscriptionDetailDialog } from '@/components/SubscriptionDetailDialog';
import { useSubscriptions } from '@/hooks/useSubscriptions';
import { useCompanyById } from '@/hooks/useCompanies';
import { useUserPreferences } from '@/contexts/UserPreferencesContext';
import { BILLING_FREQUENCIES, type Subscription } from '@/lib/types';

// Get icon based on subscription type
function getSubscriptionIcon(type: string) {
  const lowerType = type.toLowerCase();
  if (lowerType.includes('stream')) return Tv;
  if (lowerType.includes('software')) return Monitor;
  if (lowerType.includes('health') || lowerType.includes('wellness')) return Heart;
  if (lowerType.includes('shop')) return ShoppingBag;
  if (lowerType.includes('vehicle')) return Car;
  if (lowerType.includes('food')) return Utensils;
  if (lowerType.includes('gaming')) return Gamepad2;
  if (lowerType.includes('news') || lowerType.includes('media')) return Newspaper;
  if (lowerType.includes('music')) return Music;
  if (lowerType.includes('home')) return Home;
  if (lowerType.includes('finance')) return Wallet;
  if (lowerType.includes('pet')) return Dog;
  return CreditCard;
}

export function SubscriptionsTab() {
  const { data: subscriptions = [], isLoading } = useSubscriptions();
  const { preferences, setSubscriptionsViewMode } = useUserPreferences();
  const viewMode = preferences.subscriptionsViewMode || 'card';

  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSubscription, setEditingSubscription] = useState<Subscription | undefined>();
  const [viewingSubscription, setViewingSubscription] = useState<Subscription | undefined>();

  // Collapsed types state (for list view)
  const [collapsedTypes, setCollapsedTypes] = useState<Set<string>>(new Set());

  // Group subscriptions by type
  const subscriptionsByType = useMemo(() => {
    const grouped: Record<string, Subscription[]> = {};

    for (const sub of subscriptions) {
      const type = sub.subscriptionType || 'Uncategorized';
      if (!grouped[type]) {
        grouped[type] = [];
      }
      grouped[type].push(sub);
    }

    // Sort types alphabetically, but put "Uncategorized" and "Other" at the end
    const sortedTypes = Object.keys(grouped).sort((a, b) => {
      if (a === 'Uncategorized' || a === 'Other') return 1;
      if (b === 'Uncategorized' || b === 'Other') return -1;
      return a.localeCompare(b);
    });

    return { grouped, sortedTypes };
  }, [subscriptions]);

  // Calculate total monthly cost estimate
  const totalMonthlyCost = useMemo(() => {
    let total = 0;
    for (const sub of subscriptions) {
      // Extract numeric value from cost string
      const numericCost = parseFloat(sub.cost.replace(/[^0-9.]/g, '')) || 0;
      
      // Convert to monthly equivalent
      switch (sub.billingFrequency) {
        case 'weekly':
          total += numericCost * 4.33; // Average weeks per month
          break;
        case 'monthly':
          total += numericCost;
          break;
        case 'quarterly':
          total += numericCost / 3;
          break;
        case 'semi-annually':
          total += numericCost / 6;
          break;
        case 'annually':
          total += numericCost / 12;
          break;
        case 'one-time':
          // Don't add one-time costs to monthly
          break;
      }
    }
    return total;
  }, [subscriptions]);

  const toggleType = (type: string) => {
    setCollapsedTypes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(type)) {
        newSet.delete(type);
      } else {
        newSet.add(type);
      }
      return newSet;
    });
  };

  const handleEditSubscription = (subscription: Subscription) => {
    setEditingSubscription(subscription);
    setDialogOpen(true);
  };

  const handleAddNew = () => {
    setEditingSubscription(undefined);
    setDialogOpen(true);
  };

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <CreditCard className="h-6 w-6 text-primary" />
          Subscriptions
        </h2>
        <div className="flex items-center gap-2">
          {/* View Toggle */}
          {subscriptions.length > 0 && (
            <ToggleGroup 
              type="single" 
              value={viewMode} 
              onValueChange={(value) => value && setSubscriptionsViewMode(value as 'list' | 'card')}
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
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
            onClick={handleAddNew}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Subscription
          </Button>
        </div>
      </div>

      {/* Monthly Cost Summary */}
      {subscriptions.length > 0 && (
        <Card className="mb-6 bg-gradient-to-r from-primary/10 to-transparent border-primary/20">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" />
                <span className="font-medium text-muted-foreground">Estimated Monthly Cost</span>
              </div>
              <span className="text-2xl font-bold text-primary">
                ${totalMonthlyCost.toFixed(2)}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

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
      ) : subscriptions.length === 0 ? (
        <Card className="bg-card border-border border-dashed">
          <CardContent className="py-12 text-center">
            <CreditCard className="h-12 w-12 text-primary/30 mx-auto mb-4" />
            <h3 className="font-semibold text-foreground mb-2">
              No Subscriptions Yet
            </h3>
            <p className="text-muted-foreground mb-4 max-w-md mx-auto">
              Keep track of all your recurring subscriptions, billing dates, costs, and manage renewals efficiently.
            </p>
            <Button
              onClick={handleAddNew}
              variant="outline"
              className="border-primary/30 hover:bg-primary/10"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Subscription
            </Button>
          </CardContent>
        </Card>
      ) : viewMode === 'list' ? (
        /* List View */
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            {subscriptionsByType.sortedTypes.map((type) => {
              const TypeIcon = getSubscriptionIcon(type);
              return (
                <Collapsible
                  key={type}
                  open={!collapsedTypes.has(type)}
                  onOpenChange={() => toggleType(type)}
                  className="mb-2 last:mb-0"
                >
                  <CollapsibleTrigger className="flex items-center gap-2 w-full p-2 rounded-lg hover:bg-primary/10 transition-colors">
                    {collapsedTypes.has(type) ? (
                      <ChevronRight className="h-4 w-4 text-slate-500" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-slate-500" />
                    )}
                    <TypeIcon className="h-4 w-4 text-primary" />
                    <span className="font-semibold text-slate-700 dark:text-slate-200">
                      {type}
                    </span>
                    <Badge variant="secondary" className="ml-auto bg-primary/10 text-primary">
                      {subscriptionsByType.grouped[type].length}
                    </Badge>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="pl-8 py-2 space-y-1">
                      {subscriptionsByType.grouped[type].map((subscription) => (
                        <SubscriptionListItem
                          key={subscription.id}
                          subscription={subscription}
                          onClick={() => setViewingSubscription(subscription)}
                        />
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
          {subscriptionsByType.sortedTypes.map((type) => {
            const TypeIcon = getSubscriptionIcon(type);
            return (
              <Card key={type} className="bg-card border-border overflow-hidden">
                <CardHeader className="pb-3 bg-gradient-to-r from-primary/10 to-transparent">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <div className="p-1.5 rounded-lg bg-primary/10">
                      <TypeIcon className="h-4 w-4 text-primary" />
                    </div>
                    <span className="text-slate-700 dark:text-slate-200">{type}</span>
                    <Badge variant="secondary" className="ml-auto bg-primary/10 text-primary">
                      {subscriptionsByType.grouped[type].length} {subscriptionsByType.grouped[type].length === 1 ? 'subscription' : 'subscriptions'}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {subscriptionsByType.grouped[type].map((subscription) => (
                      <SubscriptionCard
                        key={subscription.id}
                        subscription={subscription}
                        onClick={() => setViewingSubscription(subscription)}
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
      <SubscriptionDialog
        isOpen={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setEditingSubscription(undefined);
        }}
        subscription={editingSubscription}
      />

      {viewingSubscription && (
        <SubscriptionDetailDialog
          isOpen={!!viewingSubscription}
          onClose={() => setViewingSubscription(undefined)}
          subscription={viewingSubscription}
          onEdit={() => handleEditSubscription(viewingSubscription)}
          onDelete={() => setViewingSubscription(undefined)}
        />
      )}
    </section>
  );
}

interface SubscriptionListItemProps {
  subscription: Subscription;
  onClick: () => void;
}

function SubscriptionListItem({ subscription, onClick }: SubscriptionListItemProps) {
  const linkedCompany = useCompanyById(subscription.companyId);
  const billingLabel = BILLING_FREQUENCIES.find(f => f.value === subscription.billingFrequency)?.label || subscription.billingFrequency;
  const companyName = linkedCompany?.name || subscription.companyName;

  return (
    <button
      onClick={onClick}
      className="flex items-center justify-between w-full p-2 rounded-lg text-left hover:bg-primary/5 transition-colors group"
    >
      <div className="flex flex-col min-w-0 flex-1">
        <span className="text-muted-foreground group-hover:text-primary font-medium truncate">
          {subscription.name}
        </span>
        {companyName && (
          <span className="text-xs text-slate-400 dark:text-slate-500 truncate">
            {companyName}
          </span>
        )}
      </div>
      <div className="flex items-center gap-3 ml-2">
        <span className="text-sm font-semibold text-primary whitespace-nowrap">
          {subscription.cost}
        </span>
        <Badge variant="outline" className="text-xs whitespace-nowrap">
          {billingLabel}
        </Badge>
      </div>
    </button>
  );
}

interface SubscriptionCardProps {
  subscription: Subscription;
  onClick: () => void;
}

function SubscriptionCard({ subscription, onClick }: SubscriptionCardProps) {
  const TypeIcon = getSubscriptionIcon(subscription.subscriptionType);
  const linkedCompany = useCompanyById(subscription.companyId);
  const billingLabel = BILLING_FREQUENCIES.find(f => f.value === subscription.billingFrequency)?.label || subscription.billingFrequency;
  const companyName = linkedCompany?.name || subscription.companyName;
  
  return (
    <button
      onClick={onClick}
      className="group relative flex flex-col p-4 rounded-xl border-2 border-border bg-gradient-to-br from-card to-muted/30 hover:border-primary/50 hover:shadow-md transition-all duration-200 text-left"
    >
      {/* Icon & Price */}
      <div className="flex items-start justify-between mb-3">
        <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
          <TypeIcon className="h-5 w-5 text-primary" />
        </div>
        <div className="text-right">
          <p className="font-bold text-lg text-primary">{subscription.cost}</p>
          <p className="text-xs text-muted-foreground">{billingLabel}</p>
        </div>
      </div>

      {/* Name */}
      <h3 className="font-semibold text-foreground mb-1 line-clamp-2 group-hover:text-primary transition-colors">
        {subscription.name}
      </h3>

      {/* Company/Provider */}
      {companyName && (
        <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mb-1">
          <Building className="h-3.5 w-3.5" />
          <span className="truncate">{companyName}</span>
        </p>
      )}

      {/* Billing Info */}
      <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
        <Calendar className="h-3.5 w-3.5" />
        <span>Billed {billingLabel.toLowerCase()}</span>
      </p>

      {/* Linked Company Badge */}
      {linkedCompany && (
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-auto pt-2 border-t border-slate-100 dark:border-slate-700">
          Linked to Companies & Services
        </p>
      )}

      {/* Hover indicator */}
      <div className="absolute inset-0 rounded-xl ring-2 ring-primary ring-opacity-0 group-hover:ring-opacity-20 transition-all pointer-events-none" />
    </button>
  );
}
