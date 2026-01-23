import { 
  Home, 
  Package, 
  Wrench, 
  Car, 
  CreditCard, 
  Shield, 
  Users, 
  FolderKanban,
  AlertTriangle,
  Clock,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAppliances, useApplianceById } from '@/hooks/useAppliances';
import { useMaintenance, calculateNextDueDate, formatDueDate, isOverdue, isDueSoon } from '@/hooks/useMaintenance';
import { useCompletionsByMaintenance } from '@/hooks/useMaintenanceCompletions';
import { useTabPreferences, type TabId } from '@/hooks/useTabPreferences';
import type { MaintenanceSchedule } from '@/lib/types';

const TAB_ICONS: Record<TabId, React.ComponentType<{ className?: string }>> = {
  home: Home,
  appliances: Package,
  maintenance: Wrench,
  vehicles: Car,
  subscriptions: CreditCard,
  warranties: Shield,
  contractors: Users,
  projects: FolderKanban,
};

interface HomeTabProps {
  onNavigateToTab: (tabId: TabId) => void;
  onAddTab: () => void;
}

export function HomeTab({ onNavigateToTab, onAddTab }: HomeTabProps) {
  const { preferences } = useTabPreferences();
  const { data: appliances = [], isLoading: isLoadingAppliances } = useAppliances();
  const { data: maintenance = [], isLoading: isLoadingMaintenance } = useMaintenance();

  const hasActiveTabs = preferences.activeTabs.length > 0;

  // Get overdue and upcoming maintenance
  const maintenanceWithStatus = maintenance.map(maint => {
    const appliance = appliances.find(a => a.id === maint.applianceId);
    const purchaseDate = appliance?.purchaseDate || '';
    return {
      ...maint,
      appliance,
      isOverdue: purchaseDate ? isOverdue(purchaseDate, maint.frequency, maint.frequencyUnit) : false,
      isDueSoon: purchaseDate ? isDueSoon(purchaseDate, maint.frequency, maint.frequencyUnit) : false,
    };
  });

  const overdueCount = maintenanceWithStatus.filter(m => m.isOverdue).length;
  const dueSoonCount = maintenanceWithStatus.filter(m => m.isDueSoon && !m.isOverdue).length;

  return (
    <section className="space-y-6">
      {/* Welcome / Dashboard Header */}
      <div className="text-center py-4">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center justify-center gap-2">
          <Home className="h-6 w-6 text-sky-600 dark:text-sky-400" />
          Dashboard
        </h2>
        <p className="text-muted-foreground mt-1">
          Overview of your home management
        </p>
      </div>

      {/* No tabs added yet */}
      {!hasActiveTabs && (
        <Card className="bg-gradient-to-br from-sky-50 to-sky-100 dark:from-slate-800 dark:to-slate-900 border-sky-200 dark:border-slate-700">
          <CardContent className="py-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-sky-200 dark:bg-sky-800 mb-4">
              <Sparkles className="h-8 w-8 text-sky-600 dark:text-sky-300" />
            </div>
            <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-2">
              Get Started
            </h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Add sections to start tracking your home appliances, vehicles, maintenance schedules, and more.
            </p>
            <Button
              onClick={onAddTab}
              className="bg-sky-600 hover:bg-sky-700 text-white"
            >
              Add Your First Section
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Quick Stats */}
      {hasActiveTabs && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Appliances count */}
          {preferences.activeTabs.includes('appliances') && (
            <Card 
              className="bg-white dark:bg-slate-800 border-sky-200 dark:border-slate-700 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => onNavigateToTab('appliances')}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-sky-100 dark:bg-sky-900">
                    <Package className="h-5 w-5 text-sky-600 dark:text-sky-400" />
                  </div>
                  <div>
                    {isLoadingAppliances ? (
                      <Skeleton className="h-6 w-8" />
                    ) : (
                      <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                        {appliances.length}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">Appliances</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Maintenance overview */}
          {preferences.activeTabs.includes('maintenance') && (
            <Card 
              className="bg-white dark:bg-slate-800 border-sky-200 dark:border-slate-700 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => onNavigateToTab('maintenance')}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-sky-100 dark:bg-sky-900">
                    <Wrench className="h-5 w-5 text-sky-600 dark:text-sky-400" />
                  </div>
                  <div>
                    {isLoadingMaintenance ? (
                      <Skeleton className="h-6 w-8" />
                    ) : (
                      <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                        {maintenance.length}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">Schedules</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Overdue items */}
          {preferences.activeTabs.includes('maintenance') && overdueCount > 0 && (
            <Card 
              className="bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => onNavigateToTab('maintenance')}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-red-200 dark:bg-red-900">
                    <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                      {overdueCount}
                    </p>
                    <p className="text-xs text-red-600/70 dark:text-red-400/70">Overdue</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Due soon items */}
          {preferences.activeTabs.includes('maintenance') && dueSoonCount > 0 && (
            <Card 
              className="bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => onNavigateToTab('maintenance')}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-200 dark:bg-amber-900">
                    <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                      {dueSoonCount}
                    </p>
                    <p className="text-xs text-amber-600/70 dark:text-amber-400/70">Due Soon</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Section summaries for each active tab */}
      {hasActiveTabs && (
        <div className="grid gap-4 md:grid-cols-2">
          {preferences.activeTabs.map(tabId => {
            const IconComponent = TAB_ICONS[tabId];
            
            if (tabId === 'appliances') {
              return (
                <SummaryCard
                  key={tabId}
                  title="Appliances"
                  icon={IconComponent}
                  onClick={() => onNavigateToTab(tabId)}
                  isLoading={isLoadingAppliances}
                >
                  {appliances.length === 0 ? (
                    <p className="text-muted-foreground text-sm">No appliances tracked yet</p>
                  ) : (
                    <div className="space-y-1">
                      {appliances.slice(0, 3).map(appliance => (
                        <div key={appliance.id} className="text-sm text-slate-600 dark:text-slate-300 truncate">
                          {appliance.model} {appliance.manufacturer && `- ${appliance.manufacturer}`}
                        </div>
                      ))}
                      {appliances.length > 3 && (
                        <p className="text-xs text-muted-foreground">+{appliances.length - 3} more</p>
                      )}
                    </div>
                  )}
                </SummaryCard>
              );
            }

            if (tabId === 'maintenance') {
              return (
                <SummaryCard
                  key={tabId}
                  title="Home Maintenance"
                  icon={IconComponent}
                  onClick={() => onNavigateToTab(tabId)}
                  isLoading={isLoadingMaintenance}
                  badge={overdueCount > 0 ? { text: `${overdueCount} overdue`, variant: 'destructive' } : undefined}
                >
                  {maintenance.length === 0 ? (
                    <p className="text-muted-foreground text-sm">No maintenance schedules yet</p>
                  ) : (
                    <div className="space-y-1">
                      {maintenanceWithStatus.slice(0, 3).map(maint => (
                        <MaintenanceSummaryItem key={maint.id} maintenance={maint} />
                      ))}
                      {maintenance.length > 3 && (
                        <p className="text-xs text-muted-foreground">+{maintenance.length - 3} more</p>
                      )}
                    </div>
                  )}
                </SummaryCard>
              );
            }

            // Coming soon tabs
            return (
              <SummaryCard
                key={tabId}
                title={tabId === 'contractors' ? 'Contractors & Services' : tabId.charAt(0).toUpperCase() + tabId.slice(1)}
                icon={IconComponent}
                onClick={() => onNavigateToTab(tabId)}
              >
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Badge variant="secondary" className="text-xs">Coming Soon</Badge>
                </div>
              </SummaryCard>
            );
          })}
        </div>
      )}
    </section>
  );
}

interface SummaryCardProps {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  isLoading?: boolean;
  badge?: { text: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' };
  children: React.ReactNode;
}

function SummaryCard({ title, icon: Icon, onClick, isLoading, badge, children }: SummaryCardProps) {
  return (
    <Card 
      className="bg-white dark:bg-slate-800 border-sky-200 dark:border-slate-700 cursor-pointer hover:shadow-md transition-shadow group"
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-base">
          <div className="flex items-center gap-2">
            <Icon className="h-5 w-5 text-sky-600 dark:text-sky-400" />
            <span>{title}</span>
            {badge && (
              <Badge variant={badge.variant} className="text-xs">
                {badge.text}
              </Badge>
            )}
          </div>
          <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors" />
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}

function MaintenanceSummaryItem({ maintenance }: { maintenance: MaintenanceSchedule & { appliance?: { model: string }; isOverdue: boolean; isDueSoon: boolean } }) {
  const completions = useCompletionsByMaintenance(maintenance.id);
  const purchaseDate = maintenance.appliance?.model ? '' : ''; // We don't have direct access, handled by parent
  const lastCompletionDate = completions.length > 0 ? completions[0].completedDate : undefined;

  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-slate-600 dark:text-slate-300 truncate flex-1">
        {maintenance.description}
      </span>
      {maintenance.isOverdue && (
        <Badge variant="destructive" className="text-xs ml-2">Overdue</Badge>
      )}
      {maintenance.isDueSoon && !maintenance.isOverdue && (
        <Badge className="text-xs ml-2 bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300">Due Soon</Badge>
      )}
    </div>
  );
}
