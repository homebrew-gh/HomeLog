import { useState, useEffect, useRef, useMemo, forwardRef } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Wrench, AlertTriangle, Clock, Calendar, ChevronDown, ChevronRight, Car, Home, TreePine, Gauge, CalendarPlus, Archive, ArrowLeft, ClipboardList, Package, CheckCircle2, Plane, Ship, Tractor } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MaintenanceDialog } from '@/components/MaintenanceDialog';
import { MaintenanceDetailDialog } from '@/components/MaintenanceDetailDialog';
import { LogMaintenanceDialog } from '@/components/LogMaintenanceDialog';
import { CalendarExportDialog } from '@/components/CalendarExportDialog';
import { useAppliances } from '@/hooks/useAppliances';
import { useVehicles } from '@/hooks/useVehicles';
import { useMaintenance, calculateNextDueDate, formatDueDate, isOverdue, isDueSoon } from '@/hooks/useMaintenance';
import { useMaintenanceCompletions } from '@/hooks/useMaintenanceCompletions';
import type { MaintenanceSchedule, Appliance, Vehicle, MaintenanceCompletion } from '@/lib/types';

// Get icon based on vehicle type
function getVehicleTypeIcon(type: string) {
  switch (type) {
    case 'Plane':
      return Plane;
    case 'Boat':
      return Ship;
    case 'Farm Machinery':
      return Tractor;
    default:
      return Car;
  }
}

interface MaintenanceTabProps {
  scrollTarget?: string;
}

// Helper function to calculate due date for sorting
function getMaintenanceDueDate(
  maintenance: MaintenanceSchedule,
  appliances: Appliance[],
  vehicles: Vehicle[],
  completions: MaintenanceCompletion[]
): Date | null {
  // Log-only maintenance has no due date
  if (maintenance.isLogOnly || !maintenance.frequency || !maintenance.frequencyUnit) {
    return null;
  }

  // Get the purchase date based on type
  let purchaseDate = '';
  
  if (maintenance.vehicleId) {
    const vehicle = vehicles.find(v => v.id === maintenance.vehicleId);
    purchaseDate = vehicle?.purchaseDate || '';
  } else if (maintenance.applianceId) {
    const appliance = appliances.find(a => a.id === maintenance.applianceId);
    purchaseDate = appliance?.purchaseDate || '';
  }
  
  // Get the last completion date for this maintenance
  const maintenanceCompletions = completions.filter(c => c.maintenanceId === maintenance.id);
  const lastCompletionDate = maintenanceCompletions.length > 0 ? maintenanceCompletions[0].completedDate : undefined;
  
  // For home feature-only maintenance without a purchase date, use last completion or today
  const isHomeFeatureOnly = maintenance.homeFeature && !maintenance.applianceId && !maintenance.vehicleId;
  const effectivePurchaseDate = purchaseDate || (lastCompletionDate ? '' : new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }));
  
  return calculateNextDueDate(effectivePurchaseDate, maintenance.frequency, maintenance.frequencyUnit, lastCompletionDate);
}

// Sort maintenance items by due date (closest first)
function sortMaintenanceByDueDate(
  maintenanceList: MaintenanceSchedule[],
  appliances: Appliance[],
  vehicles: Vehicle[],
  completions: MaintenanceCompletion[]
): MaintenanceSchedule[] {
  return [...maintenanceList].sort((a, b) => {
    const dueDateA = getMaintenanceDueDate(a, appliances, vehicles, completions);
    const dueDateB = getMaintenanceDueDate(b, appliances, vehicles, completions);
    
    // Items with no due date go to the end
    if (!dueDateA && !dueDateB) return 0;
    if (!dueDateA) return 1;
    if (!dueDateB) return -1;
    
    // Sort by due date (earliest first)
    return dueDateA.getTime() - dueDateB.getTime();
  });
}

export function MaintenanceTab({ scrollTarget }: MaintenanceTabProps) {
  const { data: appliances = [] } = useAppliances();
  const { data: vehicles = [] } = useVehicles();
  const { data: allMaintenance = [], isLoading } = useMaintenance();
  const { data: completions = [] } = useMaintenanceCompletions();
  
  // View mode: 'active' or 'archived'
  const [showArchived, setShowArchived] = useState(false);
  
  // Tab selection: 'home' or 'vehicle'
  const [activeTab, setActiveTab] = useState<'home' | 'vehicle'>('home');

  // Filter and sort maintenance - all in one useMemo to avoid cascading recomputes
  const { applianceMaintenance, vehicleMaintenance, archivedCount } = useMemo(() => {
    // Filter by type
    const applianceMaintenanceRaw = allMaintenance.filter(m => (m.applianceId || m.homeFeature) && !m.vehicleId);
    const vehicleMaintenanceRaw = allMaintenance.filter(m => m.vehicleId && !m.applianceId);
    
    // Filter by archive status
    const activeAppliance = applianceMaintenanceRaw.filter(m => !m.isArchived);
    const archivedAppliance = applianceMaintenanceRaw.filter(m => m.isArchived);
    const activeVehicle = vehicleMaintenanceRaw.filter(m => !m.isArchived);
    const archivedVehicle = vehicleMaintenanceRaw.filter(m => m.isArchived);
    
    const archivedCount = archivedAppliance.length + archivedVehicle.length;
    
    // Sort by due date
    const applianceMaintenance = sortMaintenanceByDueDate(
      showArchived ? archivedAppliance : activeAppliance, 
      appliances, 
      vehicles, 
      completions
    );
    const vehicleMaintenance = sortMaintenanceByDueDate(
      showArchived ? archivedVehicle : activeVehicle, 
      appliances, 
      vehicles, 
      completions
    );
    
    return { applianceMaintenance, vehicleMaintenance, archivedCount };
  }, [allMaintenance, appliances, vehicles, completions, showArchived]);

  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'appliance' | 'vehicle'>('appliance');
  const [editingMaintenance, setEditingMaintenance] = useState<MaintenanceSchedule | undefined>();
  const [viewingMaintenance, setViewingMaintenance] = useState<MaintenanceSchedule | undefined>();
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [logDialogOpen, setLogDialogOpen] = useState(false);

  // Refs for maintenance sections
  const homeMaintenanceRef = useRef<HTMLDivElement | null>(null);
  const vehicleMaintenanceRef = useRef<HTMLDivElement | null>(null);

  // Handle scroll to target when scrollTarget changes
  useEffect(() => {
    if (scrollTarget && !isLoading) {
      // Set the appropriate tab based on scroll target
      if (scrollTarget === 'home-maintenance') {
        setActiveTab('home');
      } else if (scrollTarget === 'vehicle-maintenance') {
        setActiveTab('vehicle');
      }
      
      const timer = setTimeout(() => {
        let element: HTMLDivElement | null = null;
        
        if (scrollTarget === 'home-maintenance') {
          element = homeMaintenanceRef.current;
        } else if (scrollTarget === 'vehicle-maintenance') {
          element = vehicleMaintenanceRef.current;
        }
        
        if (element) {
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

  const handleEditMaintenance = (maint: MaintenanceSchedule) => {
    setEditingMaintenance(maint);
    setDialogMode(maint.vehicleId ? 'vehicle' : 'appliance');
    setDialogOpen(true);
  };

  const handleAddMaintenance = (mode: 'appliance' | 'vehicle') => {
    setEditingMaintenance(undefined);
    setDialogMode(mode);
    setDialogOpen(true);
  };

  // Get counts for badges
  const homeCount = applianceMaintenance.length;
  const vehicleCount = vehicleMaintenance.length;

  return (
    <section className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
          {showArchived ? (
            <>
              <Archive className="h-6 w-6 text-muted-foreground" />
              Archived Maintenance
            </>
          ) : (
            <>
              <Wrench className="h-6 w-6 text-primary" />
              Maintenance
            </>
          )}
        </h2>
        <div className="flex items-center gap-2">
          {showArchived ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowArchived(false)}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Maintenance
            </Button>
          ) : (
            <>
              {archivedCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowArchived(true)}
                  className="text-muted-foreground"
                >
                  <Archive className="h-4 w-4 mr-2" />
                  Archived ({archivedCount})
                </Button>
              )}
              {((activeTab === 'home' && homeCount > 0) || (activeTab === 'vehicle' && vehicleCount > 0)) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setExportDialogOpen(true)}
                  className="gap-2"
                >
                  <CalendarPlus className="h-4 w-4" />
                  <span className="hidden sm:inline">Export to Calendar</span>
                  <span className="sm:hidden">Export</span>
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Tab Toggle */}
      {!showArchived && (
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'home' | 'vehicle')} className="w-full">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="home" className="flex items-center gap-2">
              <Home className="h-4 w-4" />
              <span>Home</span>
              <Badge variant="secondary" className="ml-1 bg-primary/10 text-primary text-xs px-1.5">
                {homeCount}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="vehicle" className="flex items-center gap-2">
              <Car className="h-4 w-4" />
              <span>Vehicle</span>
              <Badge variant="secondary" className="ml-1 bg-primary/10 text-primary text-xs px-1.5">
                {vehicleCount}
              </Badge>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      )}

      {isLoading ? (
        <Card className="bg-card border-border">
          <CardContent className="p-6 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-6 w-24" />
              </div>
            ))}
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Home Maintenance Section */}
          {activeTab === 'home' && (
            <Card 
              ref={homeMaintenanceRef}
              className="bg-card border-border"
            >
              <div className="p-4 pb-3 border-b flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-primary/10">
                    <Home className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-lg font-semibold text-foreground">
                    {showArchived ? 'Archived Home Maintenance' : 'Home Maintenance'}
                  </span>
                </div>
                {!showArchived && (
                  <Button
                    onClick={() => handleAddMaintenance('appliance')}
                    size="sm"
                    className="bg-primary hover:bg-primary/90 text-primary-foreground"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Recurring
                  </Button>
                )}
              </div>
              <CardContent className="pt-4">
                {applianceMaintenance.length === 0 ? (
                  <p className="text-center text-muted-foreground py-6">
                    {showArchived ? 'No archived home maintenance.' : 'No home maintenance schedules yet.'}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {applianceMaintenance.map((maint) => (
                      <MaintenanceItem
                        key={maint.id}
                        maintenance={maint}
                        appliance={appliances.find(a => a.id === maint.applianceId)}
                        completions={completions.filter(c => c.maintenanceId === maint.id)}
                        onClick={() => setViewingMaintenance(maint)}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Vehicle Maintenance Section - New Layout */}
          {activeTab === 'vehicle' && (
            <VehicleMaintenanceSection
              ref={vehicleMaintenanceRef}
              vehicles={vehicles}
              vehicleMaintenance={vehicleMaintenance}
              completions={completions}
              showArchived={showArchived}
              onAddMaintenance={() => handleAddMaintenance('vehicle')}
              onLogTask={() => setLogDialogOpen(true)}
              onViewMaintenance={setViewingMaintenance}
            />
          )}
        </>
      )}

      {/* Dialogs */}
      <MaintenanceDialog
        isOpen={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setEditingMaintenance(undefined);
        }}
        maintenance={editingMaintenance}
        mode={dialogMode}
      />

      {viewingMaintenance && (
        <MaintenanceDetailDialog
          isOpen={!!viewingMaintenance}
          onClose={() => setViewingMaintenance(undefined)}
          maintenance={viewingMaintenance}
          onEdit={() => handleEditMaintenance(viewingMaintenance)}
        />
      )}

      <CalendarExportDialog
        isOpen={exportDialogOpen}
        onClose={() => setExportDialogOpen(false)}
        filter={activeTab}
      />

      <LogMaintenanceDialog
        isOpen={logDialogOpen}
        onClose={() => setLogDialogOpen(false)}
      />
    </section>
  );
}

// Maintenance Item Component with Completion History
function MaintenanceItem({
  maintenance,
  appliance,
  completions,
  onClick
}: {
  maintenance: MaintenanceSchedule;
  appliance: Appliance | undefined;
  completions: MaintenanceCompletion[];
  onClick: () => void;
}) {
  const [showHistory, setShowHistory] = useState(false);
  
  // For home feature maintenance without an appliance, use today as a baseline for due date calculations
  // For appliance maintenance, use the appliance's purchase date
  const purchaseDate = appliance?.purchaseDate || '';
  const hasValidPurchaseDate = !!purchaseDate;
  
  // For home feature-only maintenance, we calculate from now if no appliance/purchase date
  const isHomeFeatureOnly = maintenance.homeFeature && !maintenance.applianceId;

  // Get the most recent completion date (completions are already sorted newest first)
  const lastCompletionDate = completions.length > 0 ? completions[0].completedDate : undefined;

  // Calculate due dates - for home feature-only without completions, use a default start date
  const effectivePurchaseDate = hasValidPurchaseDate ? purchaseDate : (lastCompletionDate ? '' : new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }));
  
  const nextDueDate = calculateNextDueDate(effectivePurchaseDate, maintenance.frequency, maintenance.frequencyUnit, lastCompletionDate);
  const overdue = effectivePurchaseDate ? isOverdue(effectivePurchaseDate, maintenance.frequency, maintenance.frequencyUnit, lastCompletionDate) : false;
  const dueSoon = effectivePurchaseDate ? isDueSoon(effectivePurchaseDate, maintenance.frequency, maintenance.frequencyUnit, lastCompletionDate) : false;

  const hasCompletions = completions.length > 0;
  
  // Determine display name - appliance model, home feature, or both
  const displayName = appliance?.model 
    ? (maintenance.homeFeature ? `${appliance.model} - ${maintenance.homeFeature}` : appliance.model)
    : (maintenance.homeFeature || 'Unknown Item');

  return (
    <div className="space-y-1">
      <div className={`flex items-center gap-2 rounded-lg transition-colors ${
        overdue
          ? 'bg-red-50 dark:bg-red-900'
          : dueSoon
            ? 'bg-amber-50 dark:bg-amber-900'
            : 'bg-white dark:bg-slate-800'
      }`}>
        {/* Chevron for completion history */}
        {hasCompletions && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowHistory(!showHistory);
            }}
            className="p-2 hover:bg-primary/10 rounded-lg transition-colors"
          >
            {showHistory ? (
              <ChevronDown className="h-4 w-4 text-slate-500" />
            ) : (
              <ChevronRight className="h-4 w-4 text-slate-500" />
            )}
          </button>
        )}

        {/* Main content button */}
        <button
          onClick={onClick}
          className={`flex items-center gap-4 flex-1 p-3 rounded-lg text-left transition-colors ${
            hasCompletions ? '' : 'ml-2'
          } ${
            overdue
              ? 'hover:bg-red-100 dark:hover:bg-red-800'
              : dueSoon
                ? 'hover:bg-amber-100 dark:hover:bg-amber-800'
                : 'hover:bg-primary/5'
          }`}
        >
          <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
            overdue
              ? 'bg-red-200 dark:bg-red-900'
              : dueSoon
                ? 'bg-amber-200 dark:bg-amber-900'
                : isHomeFeatureOnly
                  ? 'bg-green-200 dark:bg-green-900'
                  : 'bg-primary/20'
          }`}>
            {overdue ? (
              <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
            ) : dueSoon ? (
              <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            ) : isHomeFeatureOnly ? (
              <TreePine className="h-5 w-5 text-green-600 dark:text-green-400" />
            ) : (
              <Wrench className="h-5 w-5 text-primary" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <p className="font-medium text-foreground truncate">
              {displayName}
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400 truncate">
              {maintenance.description}
            </p>
          </div>

          <div className="text-right shrink-0">
            <p className={`text-sm font-medium ${
              overdue
                ? 'text-red-600 dark:text-red-400'
                : dueSoon
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-slate-600 dark:text-slate-300'
            }`}>
              {overdue ? 'Overdue' : dueSoon ? 'Due Soon' : 'Due'}
            </p>
            <p className={`text-sm ${
              overdue
                ? 'text-red-500 dark:text-red-500'
                : dueSoon
                  ? 'text-amber-500 dark:text-amber-500'
                  : 'text-slate-500 dark:text-slate-400'
            }`}>
              {formatDueDate(nextDueDate)}
            </p>
          </div>
        </button>
      </div>

      {/* Completion History */}
      {hasCompletions && showHistory && (
        <div className="ml-8 pl-4 border-l-2 border-green-200 dark:border-green-800 space-y-1 bg-white dark:bg-slate-800 rounded-r-lg py-2 pr-2">
          <p className="text-xs font-medium text-green-700 dark:text-green-300 py-1">
            Completion History
          </p>
          {completions.map((completion) => (
            <div
              key={completion.id}
              className="flex items-center gap-2 p-2 rounded bg-green-50 dark:bg-green-900 text-sm"
            >
              <Calendar className="h-4 w-4 text-green-600 dark:text-green-400" />
              <span className="text-green-800 dark:text-green-200">
                Completed on {completion.completedDate}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Vehicle Maintenance Item Component
function VehicleMaintenanceItem({
  maintenance,
  vehicle,
  completions,
  onClick
}: {
  maintenance: MaintenanceSchedule;
  vehicle: Vehicle | undefined;
  completions: MaintenanceCompletion[];
  onClick: () => void;
}) {
  const [showHistory, setShowHistory] = useState(false);
  const purchaseDate = vehicle?.purchaseDate || '';

  // Get the most recent completion date
  const lastCompletionDate = completions.length > 0 ? completions[0].completedDate : undefined;

  // For log-only maintenance, don't calculate due dates
  const isLogOnly = maintenance.isLogOnly;
  const nextDueDate = !isLogOnly && maintenance.frequency && maintenance.frequencyUnit
    ? calculateNextDueDate(purchaseDate, maintenance.frequency, maintenance.frequencyUnit, lastCompletionDate)
    : null;
  const overdue = !isLogOnly && purchaseDate && maintenance.frequency && maintenance.frequencyUnit
    ? isOverdue(purchaseDate, maintenance.frequency, maintenance.frequencyUnit, lastCompletionDate)
    : false;
  const dueSoon = !isLogOnly && purchaseDate && maintenance.frequency && maintenance.frequencyUnit
    ? isDueSoon(purchaseDate, maintenance.frequency, maintenance.frequencyUnit, lastCompletionDate)
    : false;

  const hasCompletions = completions.length > 0;

  return (
    <div className="space-y-1">
      <div className={`flex items-center gap-2 rounded-lg transition-colors ${
        isLogOnly
          ? 'bg-blue-50 dark:bg-blue-950'
          : overdue
            ? 'bg-red-50 dark:bg-red-900'
            : dueSoon
              ? 'bg-amber-50 dark:bg-amber-900'
              : 'bg-white dark:bg-slate-800'
      }`}>
        {/* Chevron for completion history */}
        {hasCompletions && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowHistory(!showHistory);
            }}
            className="p-2 hover:bg-primary/10 rounded-lg transition-colors"
          >
            {showHistory ? (
              <ChevronDown className="h-4 w-4 text-slate-500" />
            ) : (
              <ChevronRight className="h-4 w-4 text-slate-500" />
            )}
          </button>
        )}

        {/* Main content button */}
        <button
          onClick={onClick}
          className={`flex items-center gap-4 flex-1 p-3 rounded-lg text-left transition-colors ${
            hasCompletions ? '' : 'ml-2'
          } ${
            isLogOnly
              ? 'hover:bg-blue-100 dark:hover:bg-blue-900'
              : overdue
                ? 'hover:bg-red-100 dark:hover:bg-red-800'
                : dueSoon
                  ? 'hover:bg-amber-100 dark:hover:bg-amber-800'
                  : 'hover:bg-primary/5'
          }`}
        >
          <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
            isLogOnly
              ? 'bg-blue-200 dark:bg-blue-900'
              : overdue
                ? 'bg-red-200 dark:bg-red-900'
                : dueSoon
                  ? 'bg-amber-200 dark:bg-amber-900'
                  : 'bg-primary/20'
          }`}>
            {isLogOnly ? (
              <ClipboardList className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            ) : overdue ? (
              <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
            ) : dueSoon ? (
              <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            ) : (
              <Car className="h-5 w-5 text-primary" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <p className="font-medium text-foreground truncate">
              {vehicle?.name || 'Unknown Vehicle'}
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400 truncate">
              {maintenance.description}
            </p>
          </div>

          <div className="text-right shrink-0">
            {isLogOnly ? (
              <>
                <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
                  Log Only
                </p>
                {lastCompletionDate ? (
                  <p className="text-sm text-blue-500 dark:text-blue-500">
                    Last: {lastCompletionDate}
                  </p>
                ) : (
                  <p className="text-sm text-slate-400 dark:text-slate-500">
                    No records yet
                  </p>
                )}
              </>
            ) : (
              <>
                <p className={`text-sm font-medium ${
                  overdue
                    ? 'text-red-600 dark:text-red-400'
                    : dueSoon
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-slate-600 dark:text-slate-300'
                }`}>
                  {overdue ? 'Overdue' : dueSoon ? 'Due Soon' : 'Due'}
                </p>
                <p className={`text-sm ${
                  overdue
                    ? 'text-red-500 dark:text-red-500'
                    : dueSoon
                      ? 'text-amber-500 dark:text-amber-500'
                      : 'text-slate-500 dark:text-slate-400'
                }`}>
                  {formatDueDate(nextDueDate)}
                </p>
              </>
            )}
          </div>
        </button>
      </div>

      {/* Completion History - Vehicle maintenance shows mileage */}
      {hasCompletions && showHistory && (
        <div className="ml-8 pl-4 border-l-2 border-green-200 dark:border-green-800 space-y-1 bg-white dark:bg-slate-800 rounded-r-lg py-2 pr-2">
          <p className="text-xs font-medium text-green-700 dark:text-green-300 py-1">
            Completion History
          </p>
          {completions.map((completion) => (
            <div
              key={completion.id}
              className="p-2 rounded bg-green-50 dark:bg-green-900 text-sm space-y-1"
            >
              <div className="flex items-center gap-2 flex-wrap">
                <Calendar className="h-4 w-4 text-green-600 dark:text-green-400 shrink-0" />
                <span className="text-green-800 dark:text-green-200">
                  {completion.completedDate}
                </span>
                {completion.mileageAtCompletion && (
                  <>
                    <span className="text-green-600 dark:text-green-400">•</span>
                    <Gauge className="h-4 w-4 text-green-600 dark:text-green-400 shrink-0" />
                    <span className="text-green-800 dark:text-green-200">
                      {Number(completion.mileageAtCompletion).toLocaleString()} mi
                    </span>
                  </>
                )}
              </div>
              {completion.parts && completion.parts.length > 0 && (
                <div className="flex items-start gap-2 pt-1 pl-6 flex-wrap">
                  <Package className="h-3 w-3 text-green-500 dark:text-green-400 shrink-0 mt-0.5" />
                  <span className="text-xs text-green-700 dark:text-green-300">
                    Parts: {completion.parts.map(p => p.name).join(', ')}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Vehicle Maintenance Section Component with new two-column layout
interface VehicleMaintenanceSectionProps {
  vehicles: Vehicle[];
  vehicleMaintenance: MaintenanceSchedule[];
  completions: MaintenanceCompletion[];
  showArchived: boolean;
  onAddMaintenance: () => void;
  onLogTask: () => void;
  onViewMaintenance: (maint: MaintenanceSchedule) => void;
}

const VehicleMaintenanceSection = forwardRef<HTMLDivElement, VehicleMaintenanceSectionProps>(
  ({ vehicles, vehicleMaintenance, completions, showArchived, onAddMaintenance, onLogTask, onViewMaintenance }, ref) => {
    // Calculate upcoming maintenance (within 3 months) sorted chronologically
    const upcomingMaintenance = useMemo(() => {
      const threeMonthsFromNow = new Date();
      threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);
      
      const items: {
        maintenance: MaintenanceSchedule;
        vehicle: Vehicle | undefined;
        nextDue: Date;
        overdue: boolean;
        dueSoon: boolean;
      }[] = [];
      
      for (const maint of vehicleMaintenance) {
        if (maint.isLogOnly || maint.isArchived) continue;
        
        const vehicle = vehicles.find(v => v.id === maint.vehicleId);
        const purchaseDate = vehicle?.purchaseDate || '';
        const maintCompletions = completions.filter(c => c.maintenanceId === maint.id);
        const lastCompletion = maintCompletions[0];
        
        const nextDue = calculateNextDueDate(purchaseDate, maint.frequency, maint.frequencyUnit, lastCompletion?.completedDate);
        if (!nextDue) continue;
        
        // Include if overdue or within 3 months
        if (nextDue <= threeMonthsFromNow) {
          items.push({
            maintenance: maint,
            vehicle,
            nextDue,
            overdue: isOverdue(purchaseDate, maint.frequency, maint.frequencyUnit, lastCompletion?.completedDate),
            dueSoon: isDueSoon(purchaseDate, maint.frequency, maint.frequencyUnit, lastCompletion?.completedDate),
          });
        }
      }
      
      // Sort by date (soonest first)
      return items.sort((a, b) => a.nextDue.getTime() - b.nextDue.getTime());
    }, [vehicleMaintenance, vehicles, completions]);

    // Get recently completed maintenance (last 5)
    const recentlyCompleted = useMemo(() => {
      // Get all completions for vehicle maintenance
      const vehicleMaintenanceIds = new Set(vehicleMaintenance.map(m => m.id));
      const vehicleCompletions = completions
        .filter(c => vehicleMaintenanceIds.has(c.maintenanceId))
        .sort((a, b) => {
          // Parse MM/DD/YYYY dates for comparison
          const parseDate = (dateStr: string) => {
            const parts = dateStr.split('/');
            if (parts.length !== 3) return 0;
            return new Date(parseInt(parts[2]), parseInt(parts[0]) - 1, parseInt(parts[1])).getTime();
          };
          return parseDate(b.completedDate) - parseDate(a.completedDate);
        })
        .slice(0, 5);
      
      return vehicleCompletions.map(completion => {
        const maint = vehicleMaintenance.find(m => m.id === completion.maintenanceId);
        const vehicle = maint ? vehicles.find(v => v.id === maint.vehicleId) : undefined;
        return { completion, maintenance: maint, vehicle };
      });
    }, [vehicleMaintenance, vehicles, completions]);

    // Get active (non-archived) vehicles
    const activeVehicles = vehicles.filter(v => !v.isArchived);

    if (vehicles.length === 0) {
      return (
        <Card ref={ref} className="bg-card border-border">
          <CardContent className="py-12 text-center">
            <Car className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground">Add a vehicle first to create maintenance schedules.</p>
          </CardContent>
        </Card>
      );
    }

    if (showArchived) {
      // Show archived maintenance in a simple list
      const archivedMaintenance = vehicleMaintenance.filter(m => m.isArchived);
      return (
        <Card ref={ref} className="bg-card border-border">
          <div className="p-4 pb-3 border-b flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-muted">
              <Archive className="h-4 w-4 text-muted-foreground" />
            </div>
            <span className="text-lg font-semibold text-foreground">Archived Vehicle Maintenance</span>
          </div>
          <CardContent className="pt-4">
            {archivedMaintenance.length === 0 ? (
              <p className="text-center text-muted-foreground py-6">No archived vehicle maintenance.</p>
            ) : (
              <div className="space-y-2">
                {archivedMaintenance.map((maint) => (
                  <VehicleMaintenanceItem
                    key={maint.id}
                    maintenance={maint}
                    vehicle={vehicles.find(v => v.id === maint.vehicleId)}
                    completions={completions.filter(c => c.maintenanceId === maint.id)}
                    onClick={() => onViewMaintenance(maint)}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      );
    }

    return (
      <div ref={ref} className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <Car className="h-5 w-5 text-primary" />
            </div>
            <span className="text-lg font-semibold text-foreground">Vehicle Maintenance</span>
          </div>
          <Button
            onClick={onAddMaintenance}
            size="sm"
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add
          </Button>
        </div>

        {/* Two-column layout */}
        <div className="grid lg:grid-cols-2 gap-4">
          {/* Left Column - Upcoming & Completed Maintenance */}
          <div className="space-y-4">
            {/* Upcoming Maintenance */}
            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="h-4 w-4 text-amber-500" />
                  Upcoming Maintenance
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {upcomingMaintenance.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    No maintenance due within 3 months
                  </p>
                ) : (
                  <ScrollArea className="h-[180px]">
                    <div className="space-y-2 pr-4">
                      {upcomingMaintenance.map(({ maintenance: maint, vehicle, nextDue, overdue, dueSoon }) => (
                        <button
                          key={maint.id}
                          onClick={() => onViewMaintenance(maint)}
                          className={`w-full p-3 rounded-lg text-left transition-colors ${
                            overdue
                              ? 'bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-950/50'
                              : dueSoon
                                ? 'bg-amber-50 dark:bg-amber-950/30 hover:bg-amber-100 dark:hover:bg-amber-950/50'
                                : 'bg-muted/50 hover:bg-muted'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{maint.description}</p>
                              <p className="text-xs text-muted-foreground truncate">{vehicle?.name || 'Unknown'}</p>
                            </div>
                            <div className="text-right shrink-0">
                              {overdue ? (
                                <Badge variant="destructive" className="text-xs">Overdue</Badge>
                              ) : dueSoon ? (
                                <Badge className="bg-amber-100 text-amber-700 text-xs">Due Soon</Badge>
                              ) : (
                                <span className="text-xs text-muted-foreground">{formatDueDate(nextDue)}</span>
                              )}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>

            {/* Completed Maintenance */}
            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  Completed Maintenance
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {recentlyCompleted.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    No completed maintenance yet
                  </p>
                ) : (
                  <ScrollArea className="h-[180px]">
                    <div className="space-y-2 pr-4">
                      {recentlyCompleted.map(({ completion, maintenance: maint, vehicle }) => (
                        <div
                          key={completion.id}
                          className="p-3 rounded-lg bg-green-50 dark:bg-green-950/30"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate text-green-800 dark:text-green-200">
                                {maint?.description || 'Unknown'}
                              </p>
                              <p className="text-xs text-green-600 dark:text-green-400 truncate">
                                {vehicle?.name || 'Unknown'}
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="text-xs text-green-700 dark:text-green-300">{completion.completedDate}</span>
                              {completion.mileageAtCompletion && (
                                <p className="text-xs text-green-600 dark:text-green-400 flex items-center justify-end gap-1">
                                  <Gauge className="h-3 w-3" />
                                  {Number(completion.mileageAtCompletion).toLocaleString()} mi
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Vehicle List */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Car className="h-4 w-4 text-primary" />
                Vehicles
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <ScrollArea className="h-[400px]">
                <div className="space-y-2 pr-4">
                  {activeVehicles.map(vehicle => {
                    const vehicleTasks = vehicleMaintenance.filter(m => m.vehicleId === vehicle.id && !m.isArchived);
                    const overdueCount = vehicleTasks.filter(m => {
                      if (m.isLogOnly) return false;
                      const mCompletions = completions.filter(c => c.maintenanceId === m.id);
                      const lastCompletion = mCompletions[0];
                      return isOverdue(vehicle.purchaseDate || '', m.frequency, m.frequencyUnit, lastCompletion?.completedDate);
                    }).length;
                    
                    const VehicleIcon = getVehicleTypeIcon(vehicle.vehicleType);
                    
                    return (
                      <Link
                        key={vehicle.id}
                        to={`/vehicle/${vehicle.id}/maintenance`}
                        className="block p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                            <VehicleIcon className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{vehicle.name}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>{vehicleTasks.length} task{vehicleTasks.length !== 1 ? 's' : ''}</span>
                              {vehicle.mileage && (
                                <>
                                  <span>•</span>
                                  <span className="flex items-center gap-1">
                                    <Gauge className="h-3 w-3" />
                                    {Number(vehicle.mileage).toLocaleString()} mi
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                          {overdueCount > 0 && (
                            <Badge variant="destructive" className="shrink-0">
                              {overdueCount} overdue
                            </Badge>
                          )}
                          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }
);

VehicleMaintenanceSection.displayName = 'VehicleMaintenanceSection';
