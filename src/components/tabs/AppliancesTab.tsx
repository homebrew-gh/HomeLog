import { useState, useMemo } from 'react';
import { Plus, ChevronDown, ChevronRight, Home, Package, List, LayoutGrid, Calendar, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { ApplianceDialog } from '@/components/ApplianceDialog';
import { ApplianceDetailDialog } from '@/components/ApplianceDetailDialog';
import { useAppliances } from '@/hooks/useAppliances';
import { useUserPreferences } from '@/hooks/useTabPreferences';
import type { Appliance } from '@/lib/types';

export function AppliancesTab() {
  const { data: appliances = [], isLoading } = useAppliances();
  const { preferences, setAppliancesViewMode } = useUserPreferences();
  const viewMode = preferences.appliancesViewMode;

  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAppliance, setEditingAppliance] = useState<Appliance | undefined>();
  const [viewingAppliance, setViewingAppliance] = useState<Appliance | undefined>();

  // Collapsed rooms state (for list view)
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
    setDialogOpen(true);
  };

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <Package className="h-6 w-6 text-sky-600 dark:text-sky-400" />
          Appliances
        </h2>
        <div className="flex items-center gap-2">
          {/* View Toggle */}
          {appliances.length > 0 && (
            <ToggleGroup 
              type="single" 
              value={viewMode} 
              onValueChange={(value) => value && setAppliancesViewMode(value as 'list' | 'card')}
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
            onClick={() => {
              setEditingAppliance(undefined);
              setDialogOpen(true);
            }}
            className="bg-sky-600 hover:bg-sky-700 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Appliance
          </Button>
        </div>
      </div>

      {isLoading ? (
        viewMode === 'list' ? (
          <Card className="bg-white dark:bg-slate-800 border-sky-200 dark:border-slate-700">
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
              <Card key={i} className="bg-white dark:bg-slate-800 border-sky-200 dark:border-slate-700">
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
      ) : appliances.length === 0 ? (
        <Card className="bg-white dark:bg-slate-800 border-sky-200 dark:border-slate-700 border-dashed">
          <CardContent className="py-12 text-center">
            <Package className="h-12 w-12 text-sky-300 dark:text-sky-700 mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">
              No appliances added yet. Start tracking your home equipment!
            </p>
            <Button
              onClick={() => {
                setEditingAppliance(undefined);
                setDialogOpen(true);
              }}
              variant="outline"
              className="border-sky-300 hover:bg-sky-50 dark:border-sky-700 dark:hover:bg-sky-900"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Appliance
            </Button>
          </CardContent>
        </Card>
      ) : viewMode === 'list' ? (
        /* List View */
        <Card className="bg-white dark:bg-slate-800 border-sky-200 dark:border-slate-700">
          <CardContent className="p-4">
            {appliancesByRoom.sortedRooms.map((room) => (
              <Collapsible
                key={room}
                open={!collapsedRooms.has(room)}
                onOpenChange={() => toggleRoom(room)}
                className="mb-2 last:mb-0"
              >
                <CollapsibleTrigger className="flex items-center gap-2 w-full p-2 rounded-lg hover:bg-sky-100 dark:hover:bg-slate-700 transition-colors">
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
                        className="flex items-center gap-2 w-full p-2 rounded-lg text-left hover:bg-sky-50 dark:hover:bg-slate-700 transition-colors group"
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
      ) : (
        /* Card View */
        <div className="space-y-6">
          {appliancesByRoom.sortedRooms.map((room) => (
            <Card key={room} className="bg-white dark:bg-slate-800 border-sky-200 dark:border-slate-700 overflow-hidden">
              <CardHeader className="pb-3 bg-gradient-to-r from-sky-50 to-transparent dark:from-sky-900/30 dark:to-transparent">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <div className="p-1.5 rounded-lg bg-sky-100 dark:bg-sky-900">
                    <Home className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                  </div>
                  <span className="text-slate-700 dark:text-slate-200">{room}</span>
                  <Badge variant="secondary" className="ml-auto bg-sky-100 text-sky-700 dark:bg-sky-900 dark:text-sky-300">
                    {appliancesByRoom.grouped[room].length} {appliancesByRoom.grouped[room].length === 1 ? 'item' : 'items'}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {appliancesByRoom.grouped[room].map((appliance) => (
                    <ApplianceCard
                      key={appliance.id}
                      appliance={appliance}
                      onClick={() => setViewingAppliance(appliance)}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialogs */}
      <ApplianceDialog
        isOpen={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
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
          onDelete={() => setViewingAppliance(undefined)}
        />
      )}
    </section>
  );
}

interface ApplianceCardProps {
  appliance: Appliance;
  onClick: () => void;
}

function ApplianceCard({ appliance, onClick }: ApplianceCardProps) {
  return (
    <button
      onClick={onClick}
      className="group relative flex flex-col p-4 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 hover:border-sky-300 dark:hover:border-sky-700 hover:shadow-md transition-all duration-200 text-left"
    >
      {/* Icon */}
      <div className="flex items-start justify-between mb-3">
        <div className="p-2 rounded-lg bg-sky-100 dark:bg-sky-900/50 group-hover:bg-sky-200 dark:group-hover:bg-sky-800 transition-colors">
          <Package className="h-5 w-5 text-sky-600 dark:text-sky-400" />
        </div>
      </div>

      {/* Model/Name */}
      <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-1 line-clamp-2 group-hover:text-sky-700 dark:group-hover:text-sky-300 transition-colors">
        {appliance.model}
      </h3>

      {/* Manufacturer */}
      {appliance.manufacturer && (
        <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mb-2">
          <Building2 className="h-3.5 w-3.5" />
          <span className="truncate">{appliance.manufacturer}</span>
        </p>
      )}

      {/* Purchase Date */}
      {appliance.purchaseDate && (
        <p className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1.5 mt-auto pt-2 border-t border-slate-100 dark:border-slate-700">
          <Calendar className="h-3 w-3" />
          <span>Purchased {appliance.purchaseDate}</span>
        </p>
      )}

      {/* Hover indicator */}
      <div className="absolute inset-0 rounded-xl ring-2 ring-sky-500 ring-opacity-0 group-hover:ring-opacity-20 transition-all pointer-events-none" />
    </button>
  );
}
