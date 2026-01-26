import { useState, useEffect, useRef, useMemo } from 'react';
import { Plus, Wrench, AlertTriangle, Clock, Calendar, ChevronDown, ChevronRight, Car, Home, TreePine, Gauge, CalendarPlus, Archive, ArrowLeft, ClipboardList } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { MaintenanceDialog } from '@/components/MaintenanceDialog';
import { MaintenanceDetailDialog } from '@/components/MaintenanceDetailDialog';
import { CalendarExportDialog } from '@/components/CalendarExportDialog';
import { useAppliances } from '@/hooks/useAppliances';
import { useVehicles } from '@/hooks/useVehicles';
import { useMaintenance, useApplianceMaintenance, useVehicleMaintenance, calculateNextDueDate, formatDueDate, isOverdue, isDueSoon } from '@/hooks/useMaintenance';
import { useMaintenanceCompletions } from '@/hooks/useMaintenanceCompletions';
import type { MaintenanceSchedule, Appliance, Vehicle, MaintenanceCompletion } from '@/lib/types';

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
  const applianceMaintenanceRaw = useApplianceMaintenance();
  const vehicleMaintenanceRaw = useVehicleMaintenance();
  
  // View mode: 'active' or 'archived'
  const [showArchived, setShowArchived] = useState(false);

  // Filter maintenance by archive status
  const activeApplianceMaintenance = useMemo(() => 
    applianceMaintenanceRaw.filter(m => !m.isArchived),
    [applianceMaintenanceRaw]
  );
  const archivedApplianceMaintenance = useMemo(() => 
    applianceMaintenanceRaw.filter(m => m.isArchived),
    [applianceMaintenanceRaw]
  );
  
  const activeVehicleMaintenance = useMemo(() => 
    vehicleMaintenanceRaw.filter(m => !m.isArchived),
    [vehicleMaintenanceRaw]
  );
  const archivedVehicleMaintenance = useMemo(() => 
    vehicleMaintenanceRaw.filter(m => m.isArchived),
    [vehicleMaintenanceRaw]
  );

  const archivedCount = archivedApplianceMaintenance.length + archivedVehicleMaintenance.length;
  
  // Sort maintenance items by due date (closest first)
  const applianceMaintenance = useMemo(() => 
    sortMaintenanceByDueDate(showArchived ? archivedApplianceMaintenance : activeApplianceMaintenance, appliances, vehicles, completions),
    [showArchived, archivedApplianceMaintenance, activeApplianceMaintenance, appliances, vehicles, completions]
  );
  
  const vehicleMaintenance = useMemo(() => 
    sortMaintenanceByDueDate(showArchived ? archivedVehicleMaintenance : activeVehicleMaintenance, appliances, vehicles, completions),
    [showArchived, archivedVehicleMaintenance, activeVehicleMaintenance, appliances, vehicles, completions]
  );

  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'appliance' | 'vehicle'>('appliance');
  const [editingMaintenance, setEditingMaintenance] = useState<MaintenanceSchedule | undefined>();
  const [viewingMaintenance, setViewingMaintenance] = useState<MaintenanceSchedule | undefined>();
  const [exportDialogOpen, setExportDialogOpen] = useState(false);

  // Refs for maintenance sections
  const homeMaintenanceRef = useRef<HTMLDivElement | null>(null);
  const vehicleMaintenanceRef = useRef<HTMLDivElement | null>(null);

  // Handle scroll to target when scrollTarget changes
  useEffect(() => {
    if (scrollTarget && !isLoading) {
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

  return (
    <section className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
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
              {allMaintenance.length > 0 && (
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
          {/* Home/Appliance Maintenance Section */}
          <Card 
            ref={homeMaintenanceRef}
            className="bg-card border-border"
          >
            <CardHeader className="pb-3 bg-gradient-to-r from-primary/10 to-transparent">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-primary/10">
                    <Home className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-lg text-foreground">Home Maintenance</span>
                  <Badge variant="secondary" className="ml-2 bg-primary/10 text-primary">
                    {applianceMaintenance.length}
                  </Badge>
                </div>
                <Button
                  onClick={() => handleAddMaintenance('appliance')}
                  size="sm"
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {applianceMaintenance.length === 0 ? (
                <p className="text-center text-muted-foreground py-6">
                  No home maintenance schedules yet.
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

          {/* Vehicle Maintenance Section */}
          <Card 
            ref={vehicleMaintenanceRef}
            className="bg-card border-border"
          >
            <CardHeader className="pb-3 bg-gradient-to-r from-primary/10 to-transparent">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-primary/10">
                    <Car className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-lg text-foreground">Vehicle Maintenance</span>
                  <Badge variant="secondary" className="ml-2 bg-primary/10 text-primary">
                    {vehicleMaintenance.length}
                  </Badge>
                </div>
                <Button
                  onClick={() => handleAddMaintenance('vehicle')}
                  size="sm"
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                  disabled={vehicles.length === 0}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {vehicles.length === 0 ? (
                <p className="text-center text-muted-foreground py-6">
                  Add a vehicle first to create maintenance schedules.
                </p>
              ) : vehicleMaintenance.length === 0 ? (
                <p className="text-center text-muted-foreground py-6">
                  No vehicle maintenance schedules yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {vehicleMaintenance.map((maint) => (
                    <VehicleMaintenanceItem
                      key={maint.id}
                      maintenance={maint}
                      vehicle={vehicles.find(v => v.id === maint.vehicleId)}
                      completions={completions.filter(c => c.maintenanceId === maint.id)}
                      onClick={() => setViewingMaintenance(maint)}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
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
              className="flex items-center gap-2 p-2 rounded bg-green-50 dark:bg-green-900 text-sm flex-wrap"
            >
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
          ))}
        </div>
      )}
    </div>
  );
}
