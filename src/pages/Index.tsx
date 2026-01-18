import { useState, useMemo } from 'react';
import { useSeoMeta } from '@unhead/react';
import { Plus, ChevronDown, ChevronRight, Home, Wrench, Calendar, AlertTriangle, Clock, Package, Menu, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { LoginArea } from '@/components/auth/LoginArea';
import { ThemeToggle } from '@/components/ThemeToggle';
import { ApplianceDialog } from '@/components/ApplianceDialog';
import { ApplianceDetailDialog } from '@/components/ApplianceDetailDialog';
import { MaintenanceDialog } from '@/components/MaintenanceDialog';
import { MaintenanceDetailDialog } from '@/components/MaintenanceDetailDialog';
import { RoomManagementDialog } from '@/components/RoomManagementDialog';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useAppliances, useApplianceById } from '@/hooks/useAppliances';
import { useMaintenance, calculateNextDueDate, formatDueDate, isOverdue, isDueSoon } from '@/hooks/useMaintenance';
import { useCompletionsByMaintenance } from '@/hooks/useMaintenanceCompletions';
import type { Appliance, MaintenanceSchedule } from '@/lib/types';

const Index = () => {
  useSeoMeta({
    title: 'Home Log - Home Ownership Management',
    description: 'Manage your home appliances and maintenance schedules with Nostr.',
  });

  const { user } = useCurrentUser();
  const { data: appliances = [], isLoading: isLoadingAppliances } = useAppliances();
  const { data: maintenance = [], isLoading: isLoadingMaintenance } = useMaintenance();

  // Dialog states
  const [applianceDialogOpen, setApplianceDialogOpen] = useState(false);
  const [editingAppliance, setEditingAppliance] = useState<Appliance | undefined>();
  const [viewingAppliance, setViewingAppliance] = useState<Appliance | undefined>();

  const [maintenanceDialogOpen, setMaintenanceDialogOpen] = useState(false);
  const [editingMaintenance, setEditingMaintenance] = useState<MaintenanceSchedule | undefined>();
  const [viewingMaintenance, setViewingMaintenance] = useState<MaintenanceSchedule | undefined>();

  // Room management dialog state
  const [roomManagementOpen, setRoomManagementOpen] = useState(false);

  // Collapsed rooms state
  const [collapsedRooms, setCollapsedRooms] = useState<Set<string>>(new Set());

  // Group appliances by room
  const appliancesByRoom = useMemo(() => {
    const grouped: Record<string, Appliance[]> = {};

    for (const appliance of appliances) {
      const room = appliance.room || 'Uncategorized';
      if (!grouped[room]) {
        grouped[room] = [];
      }
      grouped[room].push(appliance);
    }

    // Sort rooms alphabetically, but put "Uncategorized" at the end
    const sortedRooms = Object.keys(grouped).sort((a, b) => {
      if (a === 'Uncategorized') return 1;
      if (b === 'Uncategorized') return -1;
      return a.localeCompare(b);
    });

    return { grouped, sortedRooms };
  }, [appliances]);

  const toggleRoom = (room: string) => {
    setCollapsedRooms(prev => {
      const newSet = new Set(prev);
      if (newSet.has(room)) {
        newSet.delete(room);
      } else {
        newSet.add(room);
      }
      return newSet;
    });
  };

  const handleEditAppliance = (appliance: Appliance) => {
    setEditingAppliance(appliance);
    setApplianceDialogOpen(true);
  };

  const handleEditMaintenance = (maint: MaintenanceSchedule) => {
    setEditingMaintenance(maint);
    setMaintenanceDialogOpen(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 to-sky-100 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-sky-200 dark:border-slate-700">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          {/* Left - Menu & Logo */}
          <div className="flex items-center gap-3">
            {user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full">
                    <Menu className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48">
                  <DropdownMenuItem onClick={() => setRoomManagementOpen(true)}>
                    <Settings className="h-4 w-4 mr-2" />
                    Manage Rooms
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <div className="flex items-center gap-2">
              <Home className="h-6 w-6 text-sky-600 dark:text-sky-400" />
              <span className="font-bold text-xl text-sky-700 dark:text-sky-300">Home Log</span>
            </div>
          </div>

          {/* Right - Theme Toggle & Login */}
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <LoginArea className="max-w-48" />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {!user ? (
          // Not logged in - Welcome screen
          <div className="max-w-2xl mx-auto text-center py-16">
            <div className="mb-8">
              <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-sky-200 dark:bg-sky-800 mb-6">
                <Home className="h-12 w-12 text-sky-600 dark:text-sky-300" />
              </div>
              <h1 className="text-4xl font-bold text-slate-800 dark:text-slate-100 mb-4">
                Welcome to Home Log
              </h1>
              <p className="text-lg text-slate-600 dark:text-slate-300 mb-8">
                Keep track of your home appliances and maintenance schedules.
                Your data is stored securely on the Nostr network.
              </p>
            </div>

            <div className="grid sm:grid-cols-3 gap-6 mb-12">
              <Card className="bg-white/70 dark:bg-slate-800/70 border-sky-200 dark:border-slate-700">
                <CardContent className="pt-6">
                  <Package className="h-10 w-10 text-sky-500 mx-auto mb-3" />
                  <h3 className="font-semibold mb-2">Track Appliances</h3>
                  <p className="text-sm text-muted-foreground">
                    Store details about all your home appliances in one place.
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-white/70 dark:bg-slate-800/70 border-sky-200 dark:border-slate-700">
                <CardContent className="pt-6">
                  <Wrench className="h-10 w-10 text-sky-500 mx-auto mb-3" />
                  <h3 className="font-semibold mb-2">Schedule Maintenance</h3>
                  <p className="text-sm text-muted-foreground">
                    Never miss a filter change or maintenance task again.
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-white/70 dark:bg-slate-800/70 border-sky-200 dark:border-slate-700">
                <CardContent className="pt-6">
                  <Calendar className="h-10 w-10 text-sky-500 mx-auto mb-3" />
                  <h3 className="font-semibold mb-2">Stay Organized</h3>
                  <p className="text-sm text-muted-foreground">
                    View upcoming maintenance and keep your home running smoothly.
                  </p>
                </CardContent>
              </Card>
            </div>

            <LoginArea className="justify-center" />

            <p className="mt-8 text-sm text-slate-500 dark:text-slate-400">
              <a href="https://shakespeare.diy" target="_blank" rel="noopener noreferrer" className="hover:text-sky-600 dark:hover:text-sky-400 transition-colors">
                Vibed with Shakespeare
              </a>
            </p>
          </div>
        ) : (
          // Logged in - Main dashboard
          <div className="space-y-8">
            {/* Appliances Section */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <Package className="h-6 w-6 text-sky-600 dark:text-sky-400" />
                  Appliances
                </h2>
                <Button
                  onClick={() => {
                    setEditingAppliance(undefined);
                    setApplianceDialogOpen(true);
                  }}
                  className="bg-sky-600 hover:bg-sky-700 text-white"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Appliance
                </Button>
              </div>

              {isLoadingAppliances ? (
                <Card className="bg-white/70 dark:bg-slate-800/70 border-sky-200 dark:border-slate-700">
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
              ) : appliances.length === 0 ? (
                <Card className="bg-white/70 dark:bg-slate-800/70 border-sky-200 dark:border-slate-700 border-dashed">
                  <CardContent className="py-12 text-center">
                    <Package className="h-12 w-12 text-sky-300 dark:text-sky-700 mx-auto mb-4" />
                    <p className="text-muted-foreground mb-4">
                      No appliances added yet. Start tracking your home equipment!
                    </p>
                    <Button
                      onClick={() => {
                        setEditingAppliance(undefined);
                        setApplianceDialogOpen(true);
                      }}
                      variant="outline"
                      className="border-sky-300 hover:bg-sky-50 dark:border-sky-700 dark:hover:bg-sky-900/30"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Your First Appliance
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <Card className="bg-white/70 dark:bg-slate-800/70 border-sky-200 dark:border-slate-700">
                  <CardContent className="p-4">
                    {appliancesByRoom.sortedRooms.map((room) => (
                      <Collapsible
                        key={room}
                        open={!collapsedRooms.has(room)}
                        onOpenChange={() => toggleRoom(room)}
                        className="mb-2 last:mb-0"
                      >
                        <CollapsibleTrigger className="flex items-center gap-2 w-full p-2 rounded-lg hover:bg-sky-100 dark:hover:bg-slate-700/50 transition-colors">
                          {collapsedRooms.has(room) ? (
                            <ChevronRight className="h-4 w-4 text-slate-500" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-slate-500" />
                          )}
                          <Home className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                          <span className="font-semibold text-slate-700 dark:text-slate-200">
                            {room}
                          </span>
                          <Badge variant="secondary" className="ml-auto bg-sky-100 text-sky-700 dark:bg-sky-900 dark:text-sky-300">
                            {appliancesByRoom.grouped[room].length}
                          </Badge>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="pl-8 py-2 space-y-1">
                            {appliancesByRoom.grouped[room].map((appliance) => (
                              <button
                                key={appliance.id}
                                onClick={() => setViewingAppliance(appliance)}
                                className="flex items-center gap-2 w-full p-2 rounded-lg text-left hover:bg-sky-50 dark:hover:bg-slate-700/30 transition-colors group"
                              >
                                <span className="text-slate-600 dark:text-slate-300 group-hover:text-sky-700 dark:group-hover:text-sky-300">
                                  {appliance.model}
                                </span>
                                {appliance.manufacturer && (
                                  <span className="text-sm text-slate-400 dark:text-slate-500">
                                    - {appliance.manufacturer}
                                  </span>
                                )}
                              </button>
                            ))}
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    ))}
                  </CardContent>
                </Card>
              )}
            </section>

            {/* Maintenance Section */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <Wrench className="h-6 w-6 text-sky-600 dark:text-sky-400" />
                  Maintenance
                </h2>
                <Button
                  onClick={() => {
                    setEditingMaintenance(undefined);
                    setMaintenanceDialogOpen(true);
                  }}
                  className="bg-sky-600 hover:bg-sky-700 text-white"
                  disabled={appliances.length === 0}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Maintenance
                </Button>
              </div>

              {isLoadingMaintenance ? (
                <Card className="bg-white/70 dark:bg-slate-800/70 border-sky-200 dark:border-slate-700">
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
              ) : maintenance.length === 0 ? (
                <Card className="bg-white/70 dark:bg-slate-800/70 border-sky-200 dark:border-slate-700 border-dashed">
                  <CardContent className="py-12 text-center">
                    <Wrench className="h-12 w-12 text-sky-300 dark:text-sky-700 mx-auto mb-4" />
                    <p className="text-muted-foreground mb-4">
                      {appliances.length === 0
                        ? "Add an appliance first, then create maintenance schedules."
                        : "No maintenance schedules yet. Stay on top of your home upkeep!"}
                    </p>
                    {appliances.length > 0 && (
                      <Button
                        onClick={() => {
                          setEditingMaintenance(undefined);
                          setMaintenanceDialogOpen(true);
                        }}
                        variant="outline"
                        className="border-sky-300 hover:bg-sky-50 dark:border-sky-700 dark:hover:bg-sky-900/30"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Your First Maintenance Schedule
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <Card className="bg-white/70 dark:bg-slate-800/70 border-sky-200 dark:border-slate-700">
                  <CardContent className="p-4">
                    <div className="space-y-2">
                      {maintenance.map((maint) => (
                        <MaintenanceItem
                          key={maint.id}
                          maintenance={maint}
                          onClick={() => setViewingMaintenance(maint)}
                        />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </section>

            {/* Footer */}
            <footer className="text-center py-8 text-sm text-slate-500 dark:text-slate-400">
              <a href="https://shakespeare.diy" target="_blank" rel="noopener noreferrer" className="hover:text-sky-600 dark:hover:text-sky-400 transition-colors">
                Vibed with Shakespeare
              </a>
            </footer>
          </div>
        )}
      </main>

      {/* Dialogs */}
      <ApplianceDialog
        isOpen={applianceDialogOpen}
        onClose={() => {
          setApplianceDialogOpen(false);
          setEditingAppliance(undefined);
        }}
        appliance={editingAppliance}
      />

      {viewingAppliance && (
        <ApplianceDetailDialog
          isOpen={!!viewingAppliance}
          onClose={() => setViewingAppliance(undefined)}
          appliance={viewingAppliance}
          onEdit={() => handleEditAppliance(viewingAppliance)}
        />
      )}

      <MaintenanceDialog
        isOpen={maintenanceDialogOpen}
        onClose={() => {
          setMaintenanceDialogOpen(false);
          setEditingMaintenance(undefined);
        }}
        maintenance={editingMaintenance}
      />

      {viewingMaintenance && (
        <MaintenanceDetailDialog
          isOpen={!!viewingMaintenance}
          onClose={() => setViewingMaintenance(undefined)}
          maintenance={viewingMaintenance}
          onEdit={() => handleEditMaintenance(viewingMaintenance)}
        />
      )}

      <RoomManagementDialog
        isOpen={roomManagementOpen}
        onClose={() => setRoomManagementOpen(false)}
      />
    </div>
  );
};

// Maintenance Item Component with Completion History
function MaintenanceItem({
  maintenance,
  onClick
}: {
  maintenance: MaintenanceSchedule;
  onClick: () => void;
}) {
  const [showHistory, setShowHistory] = useState(false);
  const appliance = useApplianceById(maintenance.applianceId);
  const completions = useCompletionsByMaintenance(maintenance.id);
  const purchaseDate = appliance?.purchaseDate || '';
  const nextDueDate = calculateNextDueDate(purchaseDate, maintenance.frequency, maintenance.frequencyUnit);
  const overdue = purchaseDate ? isOverdue(purchaseDate, maintenance.frequency, maintenance.frequencyUnit) : false;
  const dueSoon = purchaseDate ? isDueSoon(purchaseDate, maintenance.frequency, maintenance.frequencyUnit) : false;

  const hasCompletions = completions.length > 0;

  return (
    <div className="space-y-1">
      <div className={`flex items-center gap-2 rounded-lg transition-colors ${
        overdue
          ? 'bg-red-50 dark:bg-red-950/30'
          : dueSoon
            ? 'bg-amber-50 dark:bg-amber-950/30'
            : ''
      }`}>
        {/* Chevron for completion history */}
        {hasCompletions && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowHistory(!showHistory);
            }}
            className="p-2 hover:bg-sky-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
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
              ? 'hover:bg-red-100 dark:hover:bg-red-950/50'
              : dueSoon
                ? 'hover:bg-amber-100 dark:hover:bg-amber-950/50'
                : 'hover:bg-sky-50 dark:hover:bg-slate-700/30'
          }`}
        >
          <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
            overdue
              ? 'bg-red-200 dark:bg-red-900'
              : dueSoon
                ? 'bg-amber-200 dark:bg-amber-900'
                : 'bg-sky-200 dark:bg-sky-900'
          }`}>
            {overdue ? (
              <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
            ) : dueSoon ? (
              <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            ) : (
              <Wrench className="h-5 w-5 text-sky-600 dark:text-sky-400" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <p className="font-medium text-slate-700 dark:text-slate-200 truncate">
              {appliance?.model || 'Unknown Appliance'}
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
        <div className="ml-8 pl-4 border-l-2 border-green-200 dark:border-green-800 space-y-1">
          <p className="text-xs font-medium text-green-700 dark:text-green-300 py-1">
            Completion History
          </p>
          {completions.map((completion) => (
            <div
              key={completion.id}
              className="flex items-center gap-2 p-2 rounded bg-green-50 dark:bg-green-950/30 text-sm"
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

export default Index;
