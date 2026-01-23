import { useState, useMemo } from 'react';
import { Plus, ChevronDown, ChevronRight, Car, List, LayoutGrid, Calendar, Factory, Settings, Plane, Ship, Tractor, Gauge } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { VehicleDialog } from '@/components/VehicleDialog';
import { VehicleDetailDialog } from '@/components/VehicleDetailDialog';
import { VehicleTypeManagementDialog } from '@/components/VehicleTypeManagementDialog';
import { useVehicles } from '@/hooks/useVehicles';
import { useUserPreferences } from '@/contexts/UserPreferencesContext';
import type { Vehicle } from '@/lib/types';

// Get icon based on vehicle type
function getVehicleIcon(type: string) {
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

export function VehiclesTab() {
  const { data: vehicles = [], isLoading } = useVehicles();
  const { preferences, setVehiclesViewMode } = useUserPreferences();
  const viewMode = preferences.vehiclesViewMode;

  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | undefined>();
  const [viewingVehicle, setViewingVehicle] = useState<Vehicle | undefined>();
  const [typeManagementOpen, setTypeManagementOpen] = useState(false);

  // Collapsed types state (for list view)
  const [collapsedTypes, setCollapsedTypes] = useState<Set<string>>(new Set());

  // Group vehicles by type
  const vehiclesByType = useMemo(() => {
    const grouped: Record<string, Vehicle[]> = {};

    for (const vehicle of vehicles) {
      const type = vehicle.vehicleType || 'Uncategorized';
      if (!grouped[type]) {
        grouped[type] = [];
      }
      grouped[type].push(vehicle);
    }

    // Sort types alphabetically, but put "Uncategorized" at the end
    const sortedTypes = Object.keys(grouped).sort((a, b) => {
      if (a === 'Uncategorized') return 1;
      if (b === 'Uncategorized') return -1;
      return a.localeCompare(b);
    });

    return { grouped, sortedTypes };
  }, [vehicles]);

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

  const handleEditVehicle = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    setDialogOpen(true);
  };

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <Car className="h-6 w-6 text-sky-600 dark:text-sky-400" />
          Vehicles
        </h2>
        <div className="flex items-center gap-2">
          {/* Settings button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTypeManagementOpen(true)}
            className="rounded-full"
          >
            <Settings className="h-5 w-5" />
          </Button>
          
          {/* View Toggle */}
          {vehicles.length > 0 && (
            <ToggleGroup 
              type="single" 
              value={viewMode} 
              onValueChange={(value) => value && setVehiclesViewMode(value as 'list' | 'card')}
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
              setEditingVehicle(undefined);
              setDialogOpen(true);
            }}
            className="bg-sky-600 hover:bg-sky-700 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Vehicle
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
      ) : vehicles.length === 0 ? (
        <Card className="bg-white dark:bg-slate-800 border-sky-200 dark:border-slate-700 border-dashed">
          <CardContent className="py-12 text-center">
            <Car className="h-12 w-12 text-sky-300 dark:text-sky-700 mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">
              No vehicles added yet. Start tracking your vehicles!
            </p>
            <Button
              onClick={() => {
                setEditingVehicle(undefined);
                setDialogOpen(true);
              }}
              variant="outline"
              className="border-sky-300 hover:bg-sky-50 dark:border-sky-700 dark:hover:bg-sky-900"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Vehicle
            </Button>
          </CardContent>
        </Card>
      ) : viewMode === 'list' ? (
        /* List View */
        <Card className="bg-white dark:bg-slate-800 border-sky-200 dark:border-slate-700">
          <CardContent className="p-4">
            {vehiclesByType.sortedTypes.map((type) => {
              const TypeIcon = getVehicleIcon(type);
              return (
                <Collapsible
                  key={type}
                  open={!collapsedTypes.has(type)}
                  onOpenChange={() => toggleType(type)}
                  className="mb-2 last:mb-0"
                >
                  <CollapsibleTrigger className="flex items-center gap-2 w-full p-2 rounded-lg hover:bg-sky-100 dark:hover:bg-slate-700 transition-colors">
                    {collapsedTypes.has(type) ? (
                      <ChevronRight className="h-4 w-4 text-slate-500" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-slate-500" />
                    )}
                    <TypeIcon className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                    <span className="font-semibold text-slate-700 dark:text-slate-200">
                      {type}
                    </span>
                    <Badge variant="secondary" className="ml-auto bg-sky-100 text-sky-700 dark:bg-sky-900 dark:text-sky-300">
                      {vehiclesByType.grouped[type].length}
                    </Badge>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="pl-8 py-2 space-y-1">
                      {vehiclesByType.grouped[type].map((vehicle) => (
                        <button
                          key={vehicle.id}
                          onClick={() => setViewingVehicle(vehicle)}
                          className="flex items-center gap-2 w-full p-2 rounded-lg text-left hover:bg-sky-50 dark:hover:bg-slate-700 transition-colors group"
                        >
                          <span className="text-slate-600 dark:text-slate-300 group-hover:text-sky-700 dark:group-hover:text-sky-300">
                            {vehicle.name}
                          </span>
                          {(vehicle.make || vehicle.model) && (
                            <span className="text-sm text-slate-400 dark:text-slate-500">
                              - {[vehicle.make, vehicle.model].filter(Boolean).join(' ')}
                            </span>
                          )}
                        </button>
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
          {vehiclesByType.sortedTypes.map((type) => {
            const TypeIcon = getVehicleIcon(type);
            return (
              <Card key={type} className="bg-white dark:bg-slate-800 border-sky-200 dark:border-slate-700 overflow-hidden">
                <CardHeader className="pb-3 bg-gradient-to-r from-sky-50 to-transparent dark:from-sky-900/30 dark:to-transparent">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <div className="p-1.5 rounded-lg bg-sky-100 dark:bg-sky-900">
                      <TypeIcon className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                    </div>
                    <span className="text-slate-700 dark:text-slate-200">{type}</span>
                    <Badge variant="secondary" className="ml-auto bg-sky-100 text-sky-700 dark:bg-sky-900 dark:text-sky-300">
                      {vehiclesByType.grouped[type].length} {vehiclesByType.grouped[type].length === 1 ? 'vehicle' : 'vehicles'}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {vehiclesByType.grouped[type].map((vehicle) => (
                      <VehicleCard
                        key={vehicle.id}
                        vehicle={vehicle}
                        onClick={() => setViewingVehicle(vehicle)}
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
      <VehicleDialog
        isOpen={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setEditingVehicle(undefined);
        }}
        vehicle={editingVehicle}
      />

      {viewingVehicle && (
        <VehicleDetailDialog
          isOpen={!!viewingVehicle}
          onClose={() => setViewingVehicle(undefined)}
          vehicle={viewingVehicle}
          onEdit={() => handleEditVehicle(viewingVehicle)}
        />
      )}

      <VehicleTypeManagementDialog
        isOpen={typeManagementOpen}
        onClose={() => setTypeManagementOpen(false)}
      />
    </section>
  );
}

interface VehicleCardProps {
  vehicle: Vehicle;
  onClick: () => void;
}

function VehicleCard({ vehicle, onClick }: VehicleCardProps) {
  const VehicleIcon = getVehicleIcon(vehicle.vehicleType);
  
  // Get usage display (mileage, hours, etc.)
  const getUsageDisplay = () => {
    if (vehicle.mileage) return `${vehicle.mileage} mi`;
    if (vehicle.engineHours) return `${vehicle.engineHours} hrs`;
    if (vehicle.hobbsTime) return `${vehicle.hobbsTime} hrs`;
    return null;
  };

  const usageDisplay = getUsageDisplay();

  return (
    <button
      onClick={onClick}
      className="group relative flex flex-col p-4 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 hover:border-sky-300 dark:hover:border-sky-700 hover:shadow-md transition-all duration-200 text-left"
    >
      {/* Icon */}
      <div className="flex items-start justify-between mb-3">
        <div className="p-2 rounded-lg bg-sky-100 dark:bg-sky-900/50 group-hover:bg-sky-200 dark:group-hover:bg-sky-800 transition-colors">
          <VehicleIcon className="h-5 w-5 text-sky-600 dark:text-sky-400" />
        </div>
        {usageDisplay && (
          <Badge variant="secondary" className="text-xs bg-slate-100 dark:bg-slate-700">
            <Gauge className="h-3 w-3 mr-1" />
            {usageDisplay}
          </Badge>
        )}
      </div>

      {/* Name */}
      <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-1 line-clamp-2 group-hover:text-sky-700 dark:group-hover:text-sky-300 transition-colors">
        {vehicle.name}
      </h3>

      {/* Make/Model */}
      {(vehicle.make || vehicle.model) && (
        <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mb-2">
          <Factory className="h-3.5 w-3.5" />
          <span className="truncate">{[vehicle.make, vehicle.model, vehicle.year].filter(Boolean).join(' ')}</span>
        </p>
      )}

      {/* Purchase Date */}
      {vehicle.purchaseDate && (
        <p className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1.5 mt-auto pt-2 border-t border-slate-100 dark:border-slate-700">
          <Calendar className="h-3 w-3" />
          <span>Purchased {vehicle.purchaseDate}</span>
        </p>
      )}

      {/* Hover indicator */}
      <div className="absolute inset-0 rounded-xl ring-2 ring-sky-500 ring-opacity-0 group-hover:ring-opacity-20 transition-all pointer-events-none" />
    </button>
  );
}
