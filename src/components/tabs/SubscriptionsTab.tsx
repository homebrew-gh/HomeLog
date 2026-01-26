import { useState, useMemo, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
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
  Package,
  TreePine,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { SubscriptionDialog } from '@/components/SubscriptionDialog';
import { SubscriptionDetailDialog } from '@/components/SubscriptionDetailDialog';
import { useSubscriptions } from '@/hooks/useSubscriptions';
import { useCompanyById } from '@/hooks/useCompanies';
import { useApplianceById } from '@/hooks/useAppliances';
import { useVehicleById } from '@/hooks/useVehicles';
import { useUserPreferences } from '@/contexts/UserPreferencesContext';
import { useSubscriptionCurrency, useCurrency } from '@/hooks/useCurrency';
import { BILLING_FREQUENCIES, type Subscription } from '@/lib/types';
import { parseCurrencyAmount, formatCurrency, convertCurrency, getCurrency } from '@/lib/currency';

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

interface SubscriptionsTabProps {
  scrollTarget?: string;
}

export function SubscriptionsTab({ scrollTarget }: SubscriptionsTabProps) {
  const { data: subscriptions = [], isLoading } = useSubscriptions();
  const { preferences, setSubscriptionsViewMode } = useUserPreferences();
  const viewMode = preferences.subscriptionsViewMode || 'card';
  const { formatSubscriptionCost, entryCurrency, displayCurrency, hasRates } = useSubscriptionCurrency();
  const { rates } = useCurrency();

  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSubscription, setEditingSubscription] = useState<Subscription | undefined>();
  const [viewingSubscription, setViewingSubscription] = useState<Subscription | undefined>();

  // Collapsed types state (for list view)
  const [collapsedTypes, setCollapsedTypes] = useState<Set<string>>(new Set());

  // Refs for subscription type sections
  const typeRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Handle scroll to target when scrollTarget changes
  useEffect(() => {
    if (scrollTarget && scrollTarget.startsWith('type-') && !isLoading) {
      const typeName = scrollTarget.replace('type-', '');
      // Small delay to ensure the DOM has rendered
      const timer = setTimeout(() => {
        const element = typeRefs.current[typeName];
        if (element) {
          // Expand the type if it's collapsed (for list view)
          setCollapsedTypes(prev => {
            const newSet = new Set(prev);
            newSet.delete(typeName);
            return newSet;
          });
          // Scroll into view with offset for sticky header
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
          // Adjust for sticky header (approximately 120px)
          setTimeout(() => {
            window.scrollBy({ top: -120, behavior: 'smooth' });
          }, 100);
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [scrollTarget, isLoading]);

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

  // Calculate total monthly cost estimate with currency conversion
  const { totalMonthlyCost, formattedTotal } = useMemo(() => {
    let total = 0;
    for (const sub of subscriptions) {
      // Extract numeric value from cost string
      const numericCost = parseCurrencyAmount(sub.cost);
      const subCurrency = sub.currency || entryCurrency;
      
      // Convert to display currency if rates are available
      let costInDisplayCurrency = numericCost;
      if (hasRates && subCurrency !== displayCurrency) {
        costInDisplayCurrency = convertCurrency(numericCost, subCurrency, displayCurrency, rates);
      }
      
      // Convert to monthly equivalent
      switch (sub.billingFrequency) {
        case 'weekly':
          total += costInDisplayCurrency * 4.33; // Average weeks per month
          break;
        case 'monthly':
          total += costInDisplayCurrency;
          break;
        case 'quarterly':
          total += costInDisplayCurrency / 3;
          break;
        case 'semi-annually':
          total += costInDisplayCurrency / 6;
          break;
        case 'annually':
          total += costInDisplayCurrency / 12;
          break;
        case 'one-time':
          // Don't add one-time costs to monthly
          break;
      }
    }
    return {
      totalMonthlyCost: total,
      formattedTotal: formatCurrency(total, displayCurrency),
    };
  }, [subscriptions, entryCurrency, displayCurrency, hasRates, rates]);

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
                {formattedTotal}
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
                <div
                  key={type}
                  ref={(el) => { typeRefs.current[type] = el; }}
                >
                  <Collapsible
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
                </div>
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
              <Card 
                key={type} 
                ref={(el) => { typeRefs.current[type] = el; }}
                className="bg-card border-border overflow-hidden"
              >
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
  const linkedAppliance = useApplianceById(subscription.linkedAssetType === 'appliance' ? subscription.linkedAssetId : undefined);
  const linkedVehicle = useVehicleById(subscription.linkedAssetType === 'vehicle' ? subscription.linkedAssetId : undefined);
  const { formatSubscriptionCost } = useSubscriptionCurrency();
  const billingLabel = BILLING_FREQUENCIES.find(f => f.value === subscription.billingFrequency)?.label || subscription.billingFrequency;
  const companyName = linkedCompany?.name || subscription.companyName;
  const formattedCost = formatSubscriptionCost(subscription.cost, subscription.currency);

  // Get linked asset info
  const getLinkedAssetInfo = () => {
    if (subscription.linkedAssetType === 'appliance' && linkedAppliance) {
      return {
        icon: Package,
        name: linkedAppliance.model,
        link: `/asset/appliance/${linkedAppliance.id}`,
      };
    }
    if (subscription.linkedAssetType === 'vehicle' && linkedVehicle) {
      return {
        icon: Car,
        name: linkedVehicle.name,
        link: `/asset/vehicle/${linkedVehicle.id}`,
      };
    }
    if (subscription.linkedAssetType === 'home_feature' && subscription.linkedAssetName) {
      return {
        icon: TreePine,
        name: subscription.linkedAssetName,
        link: `/asset/home-feature/${encodeURIComponent(subscription.linkedAssetName)}`,
      };
    }
    return null;
  };

  const linkedAssetInfo = getLinkedAssetInfo();

  return (
    <div className="flex items-center justify-between w-full p-2 rounded-lg hover:bg-primary/5 transition-colors group">
      <button
        onClick={onClick}
        className="flex flex-col min-w-0 flex-1 text-left"
      >
        <span className="text-muted-foreground group-hover:text-primary font-medium truncate">
          {subscription.name}
        </span>
        {companyName && (
          <span className="text-xs text-slate-400 dark:text-slate-500 truncate">
            {companyName}
          </span>
        )}
      </button>
      <div className="flex items-center gap-2 ml-2">
        {linkedAssetInfo && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  to={linkedAssetInfo.link}
                  onClick={(e) => e.stopPropagation()}
                  className="p-1.5 rounded-md bg-primary/10 hover:bg-primary/20 transition-colors"
                >
                  <linkedAssetInfo.icon className="h-3.5 w-3.5 text-primary" />
                </Link>
              </TooltipTrigger>
              <TooltipContent>
                <p>View {linkedAssetInfo.name}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        <span className="text-sm font-semibold text-primary whitespace-nowrap">
          {formattedCost}
        </span>
        <Badge variant="outline" className="text-xs whitespace-nowrap">
          {billingLabel}
        </Badge>
      </div>
    </div>
  );
}

interface SubscriptionCardProps {
  subscription: Subscription;
  onClick: () => void;
}

function SubscriptionCard({ subscription, onClick }: SubscriptionCardProps) {
  const TypeIcon = getSubscriptionIcon(subscription.subscriptionType);
  const linkedCompany = useCompanyById(subscription.companyId);
  const linkedAppliance = useApplianceById(subscription.linkedAssetType === 'appliance' ? subscription.linkedAssetId : undefined);
  const linkedVehicle = useVehicleById(subscription.linkedAssetType === 'vehicle' ? subscription.linkedAssetId : undefined);
  const { formatSubscriptionCost } = useSubscriptionCurrency();
  const billingLabel = BILLING_FREQUENCIES.find(f => f.value === subscription.billingFrequency)?.label || subscription.billingFrequency;
  const companyName = linkedCompany?.name || subscription.companyName;
  const formattedCost = formatSubscriptionCost(subscription.cost, subscription.currency);

  // Get linked asset info
  const getLinkedAssetInfo = () => {
    if (subscription.linkedAssetType === 'appliance' && linkedAppliance) {
      return {
        icon: Package,
        name: linkedAppliance.model,
        link: `/asset/appliance/${linkedAppliance.id}`,
        type: 'Appliance',
      };
    }
    if (subscription.linkedAssetType === 'vehicle' && linkedVehicle) {
      return {
        icon: Car,
        name: linkedVehicle.name,
        link: `/asset/vehicle/${linkedVehicle.id}`,
        type: 'Vehicle',
      };
    }
    if (subscription.linkedAssetType === 'home_feature' && subscription.linkedAssetName) {
      return {
        icon: TreePine,
        name: subscription.linkedAssetName,
        link: `/asset/home-feature/${encodeURIComponent(subscription.linkedAssetName)}`,
        type: 'Home Feature',
      };
    }
    return null;
  };

  const linkedAssetInfo = getLinkedAssetInfo();
  
  return (
    <div className="group relative flex flex-col p-4 rounded-xl border-2 border-border bg-gradient-to-br from-card to-muted/30 hover:border-primary/50 hover:shadow-md transition-all duration-200">
      {/* Clickable area for quick view */}
      <button
        onClick={onClick}
        className="text-left flex-1 flex flex-col"
      >
        {/* Icon & Price */}
        <div className="flex items-start justify-between mb-3">
          <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
            <TypeIcon className="h-5 w-5 text-primary" />
          </div>
          <div className="text-right">
            <p className="font-bold text-lg text-primary">{formattedCost}</p>
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
      </button>

      {/* Linked Asset - Clickable Link */}
      {linkedAssetInfo && (
        <Link
          to={linkedAssetInfo.link}
          onClick={(e) => e.stopPropagation()}
          className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700 flex items-center gap-2 text-sm text-primary hover:text-primary/80 font-medium transition-colors"
        >
          <linkedAssetInfo.icon className="h-4 w-4" />
          <span className="truncate">{linkedAssetInfo.name}</span>
          <ExternalLink className="h-3 w-3 ml-auto shrink-0" />
        </Link>
      )}

      {/* Linked Company Badge - only show if no asset link */}
      {!linkedAssetInfo && linkedCompany && (
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-auto pt-2 border-t border-slate-100 dark:border-slate-700">
          Linked to Companies & Services
        </p>
      )}

      {/* Hover indicator */}
      <div className="absolute inset-0 rounded-xl ring-2 ring-primary ring-opacity-0 group-hover:ring-opacity-20 transition-all pointer-events-none" />
    </div>
  );
}
