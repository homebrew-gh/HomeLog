import { useMemo, useState, useRef } from 'react';
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
  Sparkles,
  Calendar,
  ChevronRight,
  GripVertical,
  Pencil,
  Check
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useAppliances } from '@/hooks/useAppliances';
import { useVehicles } from '@/hooks/useVehicles';
import { useContractors } from '@/hooks/useContractors';
import { useMaintenance, useApplianceMaintenance, useVehicleMaintenance, calculateNextDueDate, formatDueDate, isOverdue, isDueSoon } from '@/hooks/useMaintenance';
import { useMaintenanceCompletions } from '@/hooks/useMaintenanceCompletions';
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
  onNavigateToTab: (tabId: TabId, scrollTarget?: string) => void;
  onAddTab: () => void;
}

export function HomeTab({ onNavigateToTab, onAddTab }: HomeTabProps) {
  const { preferences, getDashboardCardOrder, reorderDashboardCards, getTabDefinition } = useTabPreferences();
  const { data: appliances = [], isLoading: isLoadingAppliances } = useAppliances();
  const { data: vehicles = [], isLoading: isLoadingVehicles } = useVehicles();
  const { data: contractors = [], isLoading: isLoadingContractors } = useContractors();
  const { data: maintenance = [], isLoading: isLoadingMaintenance } = useMaintenance();
  const { data: completions = [] } = useMaintenanceCompletions();
  const applianceMaintenance = useApplianceMaintenance();
  const vehicleMaintenance = useVehicleMaintenance();

  // Edit mode for reordering dashboard cards
  const [isEditMode, setIsEditMode] = useState(false);
  const [draggedCard, setDraggedCard] = useState<TabId | null>(null);
  const [dragOverCard, setDragOverCard] = useState<TabId | null>(null);
  const dragCounter = useRef(0);

  const hasActiveTabs = preferences.activeTabs.length > 0;
  
  // Get the ordered list of cards for the dashboard
  const dashboardCards = getDashboardCardOrder();

  // Get unique rooms from appliances
  const usedRooms = useMemo(() => {
    const rooms = new Set<string>();
    appliances.forEach(appliance => {
      if (appliance.room) {
        rooms.add(appliance.room);
      }
    });
    // Sort alphabetically, but put "Uncategorized" at the end
    return Array.from(rooms).sort((a, b) => {
      if (a === 'Uncategorized') return 1;
      if (b === 'Uncategorized') return -1;
      return a.localeCompare(b);
    });
  }, [appliances]);

  // Get unique vehicle types from vehicles
  const usedVehicleTypes = useMemo(() => {
    const types = new Set<string>();
    vehicles.forEach(vehicle => {
      if (vehicle.vehicleType) {
        types.add(vehicle.vehicleType);
      }
    });
    return Array.from(types).sort((a, b) => {
      if (a === 'Uncategorized') return 1;
      if (b === 'Uncategorized') return -1;
      return a.localeCompare(b);
    });
  }, [vehicles]);

  // Helper to get last completion date for a maintenance item
  const getLastCompletionDate = (maintenanceId: string): string | undefined => {
    const maintenanceCompletions = completions.filter(c => c.maintenanceId === maintenanceId);
    if (maintenanceCompletions.length === 0) return undefined;
    return maintenanceCompletions[0].completedDate;
  };

  // Calculate maintenance with due dates for sorting
  const getMaintenanceWithDueDate = (
    maint: MaintenanceSchedule,
    referenceDate: string | undefined
  ): { maint: MaintenanceSchedule; dueDate: Date | null; isOverdue: boolean; isDueSoon: boolean } => {
    const lastCompletion = getLastCompletionDate(maint.id);
    const dueDate = calculateNextDueDate(referenceDate || '', maint.frequency, maint.frequencyUnit, lastCompletion);
    const overdue = referenceDate ? isOverdue(referenceDate, maint.frequency, maint.frequencyUnit, lastCompletion) : false;
    const dueSoon = referenceDate ? isDueSoon(referenceDate, maint.frequency, maint.frequencyUnit, lastCompletion) : false;
    return { maint, dueDate, isOverdue: overdue, isDueSoon: dueSoon };
  };

  // Get next 5 home maintenance tasks sorted by due date
  const upcomingHomeMaintenance = useMemo(() => {
    const tasks = applianceMaintenance.map(maint => {
      const appliance = appliances.find(a => a.id === maint.applianceId);
      return {
        ...getMaintenanceWithDueDate(maint, appliance?.purchaseDate),
        appliance,
      };
    });
    
    // Sort by due date (earliest first), with null dates at the end
    return tasks
      .sort((a, b) => {
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return a.dueDate.getTime() - b.dueDate.getTime();
      })
      .slice(0, 5);
  }, [applianceMaintenance, appliances, completions]);

  // Get next 5 vehicle maintenance tasks sorted by due date
  const upcomingVehicleMaintenance = useMemo(() => {
    const tasks = vehicleMaintenance.map(maint => {
      const vehicle = vehicles.find(v => v.id === maint.vehicleId);
      return {
        ...getMaintenanceWithDueDate(maint, vehicle?.purchaseDate),
        vehicle,
      };
    });
    
    // Sort by due date (earliest first), with null dates at the end
    return tasks
      .sort((a, b) => {
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return a.dueDate.getTime() - b.dueDate.getTime();
      })
      .slice(0, 5);
  }, [vehicleMaintenance, vehicles, completions]);

  // Get overdue and upcoming maintenance counts
  const maintenanceWithStatus = maintenance.map(maint => {
    const appliance = appliances.find(a => a.id === maint.applianceId);
    const vehicle = vehicles.find(v => v.id === maint.vehicleId);
    const purchaseDate = appliance?.purchaseDate || vehicle?.purchaseDate || '';
    const lastCompletion = getLastCompletionDate(maint.id);
    return {
      ...maint,
      appliance,
      vehicle,
      isOverdue: purchaseDate ? isOverdue(purchaseDate, maint.frequency, maint.frequencyUnit, lastCompletion) : false,
      isDueSoon: purchaseDate ? isDueSoon(purchaseDate, maint.frequency, maint.frequencyUnit, lastCompletion) : false,
    };
  });

  const overdueCount = maintenanceWithStatus.filter(m => m.isOverdue).length;
  const dueSoonCount = maintenanceWithStatus.filter(m => m.isDueSoon && !m.isOverdue).length;

  // Get unique contractor types from contractors
  const usedContractorTypes = useMemo(() => {
    const types = new Set<string>();
    contractors.forEach(contractor => {
      if (contractor.serviceType) {
        types.add(contractor.serviceType);
      }
    });
    return Array.from(types).sort((a, b) => {
      if (a === 'Uncategorized' || a === 'Other') return 1;
      if (b === 'Uncategorized' || b === 'Other') return -1;
      return a.localeCompare(b);
    });
  }, [contractors]);

  // Drag and drop handlers for dashboard card reordering
  const handleDragStart = (e: React.DragEvent, tabId: TabId) => {
    if (!isEditMode) return;
    setDraggedCard(tabId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', tabId);
  };

  const handleDragEnd = () => {
    setDraggedCard(null);
    setDragOverCard(null);
    dragCounter.current = 0;
  };

  const handleDragEnter = (e: React.DragEvent, tabId: TabId) => {
    e.preventDefault();
    if (tabId === draggedCard || !isEditMode) return;
    dragCounter.current++;
    setDragOverCard(tabId);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setDragOverCard(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetTabId: TabId) => {
    e.preventDefault();
    if (!draggedCard || draggedCard === targetTabId || !isEditMode) return;

    const currentOrder = [...dashboardCards];
    const draggedIndex = currentOrder.indexOf(draggedCard);
    const targetIndex = currentOrder.indexOf(targetTabId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    // Remove dragged item and insert at target position
    currentOrder.splice(draggedIndex, 1);
    currentOrder.splice(targetIndex, 0, draggedCard);

    reorderDashboardCards(currentOrder);
    handleDragEnd();
  };

  // Get wiggle animation class based on card index (same cadence as tab navigation)
  const getWiggleClass = (index: number) => {
    const wiggleClasses = [
      'animate-wiggle-card animate-wiggle-1',
      'animate-wiggle-card animate-wiggle-2',
      'animate-wiggle-card animate-wiggle-3',
      'animate-wiggle-card animate-wiggle-4',
      'animate-wiggle-card animate-wiggle-5',
      'animate-wiggle-card animate-wiggle-6',
      'animate-wiggle-card animate-wiggle-7',
    ];
    return wiggleClasses[index % wiggleClasses.length];
  };

  return (
    <section className="space-y-6">
      {/* Welcome / Dashboard Header */}
      <div className="flex items-center justify-between py-4">
        <div className="flex-1" />
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center justify-center gap-2">
            <Home className="h-6 w-6 text-sky-600 dark:text-sky-400" />
            Dashboard
          </h2>
          <p className="text-muted-foreground mt-1">
            Overview of your home management
          </p>
        </div>
        <div className="flex-1 flex justify-end">
          {hasActiveTabs && dashboardCards.length > 1 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditMode(!isEditMode)}
              className={cn(
                "gap-1.5 px-3 py-2 h-auto rounded-lg transition-all duration-200",
                isEditMode
                  ? "bg-sky-600 text-white hover:bg-sky-700"
                  : "text-slate-500 dark:text-slate-400 hover:bg-sky-50 dark:hover:bg-slate-800 hover:text-sky-600 dark:hover:text-sky-400"
              )}
            >
              {isEditMode ? (
                <>
                  <Check className="h-4 w-4" />
                  <span className="text-sm font-medium">Done</span>
                </>
              ) : (
                <>
                  <Pencil className="h-4 w-4" />
                  <span className="text-sm font-medium hidden sm:inline">Reorder</span>
                </>
              )}
            </Button>
          )}
        </div>
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
          {dashboardCards.map((tabId, index) => {
            const IconComponent = TAB_ICONS[tabId];
            const isDragging = draggedCard === tabId;
            const isDragOver = dragOverCard === tabId;
            
            // Wrapper for drag-drop functionality
            const DraggableWrapper = ({ children, fullWidth = false }: { children: React.ReactNode; fullWidth?: boolean }) => (
              <div
                className={cn(
                  "relative",
                  fullWidth && "md:col-span-2",
                  isDragging && "opacity-50",
                  isEditMode && getWiggleClass(index)
                )}
                draggable={isEditMode}
                onDragStart={(e) => handleDragStart(e, tabId)}
                onDragEnd={handleDragEnd}
                onDragEnter={(e) => handleDragEnter(e, tabId)}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, tabId)}
              >
                {/* Drop indicator */}
                {isDragOver && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-sky-500 rounded-full -translate-x-2" />
                )}
                {/* Drag handle overlay in edit mode */}
                {isEditMode && (
                  <div className="absolute top-2 right-2 z-10 p-1.5 rounded-lg bg-sky-100 dark:bg-sky-900 cursor-grab active:cursor-grabbing">
                    <GripVertical className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                  </div>
                )}
                {children}
              </div>
            );
            
            if (tabId === 'appliances') {
              return (
                <DraggableWrapper key={tabId}>
                  <SummaryCard
                    title="Appliances"
                    icon={IconComponent}
                    onClick={() => !isEditMode && onNavigateToTab(tabId)}
                    isLoading={isLoadingAppliances}
                    clickable={!isEditMode}
                  >
                    {appliances.length === 0 ? (
                      <p className="text-muted-foreground text-sm">No appliances tracked yet</p>
                    ) : usedRooms.length === 0 ? (
                      <p className="text-muted-foreground text-sm">No rooms assigned yet</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {usedRooms.map(room => {
                          const count = appliances.filter(a => a.room === room).length;
                          return (
                            <button
                              key={room}
                              onClick={(e) => {
                                if (isEditMode) {
                                  e.stopPropagation();
                                  return;
                                }
                                onNavigateToTab('appliances', `room-${room}`);
                              }}
                              disabled={isEditMode}
                              className={cn(
                                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300 transition-colors",
                                !isEditMode && "hover:bg-sky-200 dark:hover:bg-sky-800/50"
                              )}
                            >
                              <Home className="h-3.5 w-3.5" />
                              {room}
                              <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0 bg-sky-200/50 dark:bg-sky-800/50">
                                {count}
                              </Badge>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </SummaryCard>
                </DraggableWrapper>
              );
            }

            if (tabId === 'vehicles') {
              return (
                <DraggableWrapper key={tabId}>
                  <SummaryCard
                    title="Vehicles"
                    icon={IconComponent}
                    onClick={() => !isEditMode && onNavigateToTab(tabId)}
                    isLoading={isLoadingVehicles}
                    clickable={!isEditMode}
                  >
                    {vehicles.length === 0 ? (
                      <p className="text-muted-foreground text-sm">No vehicles tracked yet</p>
                    ) : usedVehicleTypes.length === 0 ? (
                      <p className="text-muted-foreground text-sm">No vehicle types assigned yet</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {usedVehicleTypes.map(type => {
                          const count = vehicles.filter(v => v.vehicleType === type).length;
                          return (
                            <button
                              key={type}
                              onClick={(e) => {
                                if (isEditMode) {
                                  e.stopPropagation();
                                  return;
                                }
                                onNavigateToTab('vehicles', `type-${type}`);
                              }}
                              disabled={isEditMode}
                              className={cn(
                                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300 transition-colors",
                                !isEditMode && "hover:bg-sky-200 dark:hover:bg-sky-800/50"
                              )}
                            >
                              <Car className="h-3.5 w-3.5" />
                              {type}
                              <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0 bg-sky-200/50 dark:bg-sky-800/50">
                                {count}
                              </Badge>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </SummaryCard>
                </DraggableWrapper>
              );
            }

            if (tabId === 'contractors') {
              return (
                <DraggableWrapper key={tabId}>
                  <SummaryCard
                    title="Contractors & Services"
                    icon={IconComponent}
                    onClick={() => !isEditMode && onNavigateToTab(tabId)}
                    isLoading={isLoadingContractors}
                    clickable={!isEditMode}
                  >
                    {contractors.length === 0 ? (
                      <p className="text-muted-foreground text-sm">No contractors added yet</p>
                    ) : usedContractorTypes.length === 0 ? (
                      <p className="text-muted-foreground text-sm">No service types assigned yet</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {usedContractorTypes.slice(0, 6).map(type => {
                          const count = contractors.filter(c => c.serviceType === type).length;
                          return (
                            <button
                              key={type}
                              onClick={(e) => {
                                if (isEditMode) {
                                  e.stopPropagation();
                                  return;
                                }
                                onNavigateToTab('contractors', `type-${type}`);
                              }}
                              disabled={isEditMode}
                              className={cn(
                                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300 transition-colors",
                                !isEditMode && "hover:bg-sky-200 dark:hover:bg-sky-800/50"
                              )}
                            >
                              <Users className="h-3.5 w-3.5" />
                              {type}
                              <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0 bg-sky-200/50 dark:bg-sky-800/50">
                                {count}
                              </Badge>
                            </button>
                          );
                        })}
                        {usedContractorTypes.length > 6 && (
                          <span className="text-sm text-muted-foreground self-center">
                            +{usedContractorTypes.length - 6} more
                          </span>
                        )}
                      </div>
                    )}
                  </SummaryCard>
                </DraggableWrapper>
              );
            }

            if (tabId === 'maintenance') {
              return (
                <DraggableWrapper key={tabId} fullWidth>
                  <div className="grid gap-4 md:grid-cols-2">
                    {/* Home Maintenance Card */}
                    <Card 
                      className={cn(
                        "bg-white dark:bg-slate-800 border-sky-200 dark:border-slate-700 transition-shadow group",
                        !isEditMode && "cursor-pointer hover:shadow-md"
                      )}
                      onClick={() => !isEditMode && onNavigateToTab('maintenance', 'home-maintenance')}
                    >
                      <CardHeader className="pb-2">
                        <CardTitle className="flex items-center justify-between text-base">
                          <div className="flex items-center gap-2">
                            <Home className="h-5 w-5 text-sky-600 dark:text-sky-400" />
                            <span>Home Maintenance</span>
                            {upcomingHomeMaintenance.filter(m => m.isOverdue).length > 0 && (
                              <Badge variant="destructive" className="text-xs">
                                {upcomingHomeMaintenance.filter(m => m.isOverdue).length} overdue
                              </Badge>
                            )}
                          </div>
                          {!isEditMode && (
                            <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors" />
                          )}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {isLoadingMaintenance ? (
                          <div className="space-y-2">
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-3/4" />
                          </div>
                        ) : upcomingHomeMaintenance.length === 0 ? (
                          <p className="text-muted-foreground text-sm">No home maintenance tasks</p>
                        ) : (
                          <div className="space-y-2">
                            {upcomingHomeMaintenance.map(({ maint, dueDate, isOverdue: itemOverdue, isDueSoon: itemDueSoon, appliance }) => (
                              <div
                                key={maint.id}
                                className={`flex items-center justify-between text-sm p-2 rounded-lg ${
                                  itemOverdue 
                                    ? 'bg-red-50 dark:bg-red-900/30' 
                                    : itemDueSoon 
                                      ? 'bg-amber-50 dark:bg-amber-900/30' 
                                      : 'bg-slate-50 dark:bg-slate-700/30'
                                }`}
                              >
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-slate-700 dark:text-slate-200 truncate">
                                    {maint.description}
                                  </p>
                                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                    {appliance?.model || 'Unknown'}
                                  </p>
                                </div>
                                <div className="text-right shrink-0 ml-2">
                                  <p className={`text-xs font-medium ${
                                    itemOverdue
                                      ? 'text-red-600 dark:text-red-400'
                                      : itemDueSoon
                                        ? 'text-amber-600 dark:text-amber-400'
                                        : 'text-slate-600 dark:text-slate-300'
                                  }`}>
                                    {formatDueDate(dueDate)}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                    {/* Vehicle Maintenance Card */}
                    <Card 
                      className={cn(
                        "bg-white dark:bg-slate-800 border-sky-200 dark:border-slate-700 transition-shadow group",
                        !isEditMode && "cursor-pointer hover:shadow-md"
                      )}
                      onClick={() => !isEditMode && onNavigateToTab('maintenance', 'vehicle-maintenance')}
                    >
                      <CardHeader className="pb-2">
                        <CardTitle className="flex items-center justify-between text-base">
                          <div className="flex items-center gap-2">
                            <Car className="h-5 w-5 text-sky-600 dark:text-sky-400" />
                            <span>Vehicle Maintenance</span>
                            {upcomingVehicleMaintenance.filter(m => m.isOverdue).length > 0 && (
                              <Badge variant="destructive" className="text-xs">
                                {upcomingVehicleMaintenance.filter(m => m.isOverdue).length} overdue
                              </Badge>
                            )}
                          </div>
                          {!isEditMode && (
                            <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors" />
                          )}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {isLoadingMaintenance || isLoadingVehicles ? (
                          <div className="space-y-2">
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-3/4" />
                          </div>
                        ) : upcomingVehicleMaintenance.length === 0 ? (
                          <p className="text-muted-foreground text-sm">No vehicle maintenance tasks</p>
                        ) : (
                          <div className="space-y-2">
                            {upcomingVehicleMaintenance.map(({ maint, dueDate, isOverdue: vehOverdue, isDueSoon: vehDueSoon, vehicle }) => (
                              <div
                                key={maint.id}
                                className={`flex items-center justify-between text-sm p-2 rounded-lg ${
                                  vehOverdue 
                                    ? 'bg-red-50 dark:bg-red-900/30' 
                                    : vehDueSoon 
                                      ? 'bg-amber-50 dark:bg-amber-900/30' 
                                      : 'bg-slate-50 dark:bg-slate-700/30'
                                }`}
                              >
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-slate-700 dark:text-slate-200 truncate">
                                    {maint.description}
                                  </p>
                                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                    {vehicle?.name || 'Unknown'}
                                  </p>
                                </div>
                                <div className="text-right shrink-0 ml-2">
                                  <p className={`text-xs font-medium ${
                                    vehOverdue
                                      ? 'text-red-600 dark:text-red-400'
                                      : vehDueSoon
                                        ? 'text-amber-600 dark:text-amber-400'
                                        : 'text-slate-600 dark:text-slate-300'
                                  }`}>
                                    {formatDueDate(dueDate)}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </DraggableWrapper>
              );
            }

            // Coming soon tabs (subscriptions, warranties, projects)
            return (
              <DraggableWrapper key={tabId}>
                <SummaryCard
                  title={tabId.charAt(0).toUpperCase() + tabId.slice(1)}
                  icon={IconComponent}
                  onClick={() => !isEditMode && onNavigateToTab(tabId)}
                  clickable={!isEditMode}
                >
                  <div className="flex items-center gap-2 text-muted-foreground text-sm">
                    <Badge variant="secondary" className="text-xs">Coming Soon</Badge>
                  </div>
                </SummaryCard>
              </DraggableWrapper>
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
  clickable?: boolean;
  children: React.ReactNode;
}

function SummaryCard({ title, icon: Icon, onClick, isLoading, badge, clickable = true, children }: SummaryCardProps) {
  return (
    <Card 
      className={`bg-white dark:bg-slate-800 border-sky-200 dark:border-slate-700 transition-shadow ${
        clickable ? 'cursor-pointer hover:shadow-md group' : ''
      }`}
      onClick={clickable ? onClick : undefined}
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
          {clickable && (
            <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors" />
          )}
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


