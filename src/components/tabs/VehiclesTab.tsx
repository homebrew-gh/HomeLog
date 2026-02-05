import { useState, useMemo, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, ChevronDown, ChevronRight, Car, List, LayoutGrid, Calendar, Factory, Plane, Ship, Tractor, Gauge, Archive, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { VehicleDialog } from '@/components/VehicleDialog';
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

interface VehiclesTabProps {
  scrollTarget?: string;
}

export function VehiclesTab({ scrollTarget }: VehiclesTabProps) {
  const { data: vehicles = [], isLoading } = useVehicles();
  const { preferences, setVehiclesViewMode } = useUserPreferences();
  const viewMode = preferences.vehiclesViewMode;

  // View mode: 'active' or 'archived'
  const [showArchived, setShowArchived] = useState(false);

  // Dialog state (for Add)
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | undefined>();
  const navigate = useNavigate();

  // Collapsed types state (for list view)
  const [collapsedTypes, setCollapsedTypes] = useState<Set<string>>(new Set());

  // Filter vehicles based on archive state
  const activeVehicles = useMemo(() => vehicles.filter(v => !v.isArchived), [vehicles]);
  const archivedVehicles = useMemo(() => vehicles.filter(v => v.isArchived), [vehicles]);
  const displayedVehicles = showArchived ? archivedVehicles : activeVehicles;

  // Refs for vehicle type sections
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
          
          // Check if element needs scrolling
          const rect = element.getBoundingClientRect();
          const viewportHeight = window.innerHeight;
          const headerOffset = 120; // Sticky header height
          const halfwayPoint = viewportHeight / 2;
          
          // Only scroll if:
          // 1. Element is above the visible area (top < headerOffset)
          // 2. Element is below the viewport (top > viewportHeight)
          // 3. Element's top is below the halfway point of the screen
          const needsScroll = rect.top < headerOffset || 
                             rect.top > viewportHeight || 
                             rect.top > halfwayPoint;
          
          if (needsScroll) {
            // Calculate target scroll position (element at top with header offset)
            const targetY = window.scrollY + rect.top - headerOffset;
            window.scrollTo({ top: targetY, behavior: 'smooth' });
          }
        }
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [scrollTarget, isLoading]);

  // Group vehicles by type
  const vehiclesByType = useMemo(() => {
    const grouped: Record<string, Vehicle[]> = {};

    for (const vehicle of displayedVehicles) {
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
  }, [displayedVehicles]);

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

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
          {showArchived ? (
            <>
              <Archive className="h-6 w-6 text-muted-foreground" />
              Archived Vehicles
            </>
          ) : (
            <>
              <Car className="h-6 w-6 text-primary" />
              Vehicles
            </>
          )}
        </h2>
        <div className="flex items-center gap-2">
          {/* Archive Toggle */}
          {showArchived ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowArchived(false)}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Vehicles
            </Button>
          ) : (
            <>
              {archivedVehicles.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowArchived(true)}
                  className="text-muted-foreground"
                >
                  <Archive className="h-4 w-4 mr-2" />
                  Archived ({archivedVehicles.length})
                </Button>
              )}
              {/* View Toggle */}
              {activeVehicles.length > 0 && (
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
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Vehicle
              </Button>
            </>
          )}
        </div>
      </div>

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
      ) : displayedVehicles.length === 0 ? (
        <Card className="bg-card border-border border-dashed">
          <CardContent className="py-12 text-center">
            {showArchived ? (
              <>
                <Archive className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">
                  No archived vehicles.
                </p>
                <Button
                  onClick={() => setShowArchived(false)}
                  variant="outline"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Vehicles
                </Button>
              </>
            ) : (
              <>
                <Car className="h-12 w-12 text-primary/30 mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">
                  No vehicles added yet. Start tracking your vehicles!
                </p>
                <Button
                  onClick={() => {
                    setEditingVehicle(undefined);
                    setDialogOpen(true);
                  }}
                  variant="outline"
                  className="border-primary/30 hover:bg-primary/10"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Vehicle
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      ) : viewMode === 'list' ? (
        /* List View */
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            {vehiclesByType.sortedTypes.map((type) => {
              const TypeIcon = getVehicleIcon(type);
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
                    <span className="font-semibold text-foreground">
                      {type}
                    </span>
                    <Badge variant="secondary" className="ml-auto bg-primary/10 text-primary">
                      {vehiclesByType.grouped[type].length}
                    </Badge>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="pl-8 py-2 space-y-1">
                      {vehiclesByType.grouped[type].map((vehicle) => (
                        <button
                          key={vehicle.id}
                          onClick={() => navigate(`/asset/vehicle/${vehicle.id}`)}
                          className="flex items-center gap-2 w-full p-2 rounded-lg text-left hover:bg-primary/5 transition-colors group"
                        >
                          <span className="text-muted-foreground group-hover:text-primary">
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
                </div>
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
                    <span className="text-foreground">{type}</span>
                    <Badge variant="secondary" className="ml-auto bg-primary/10 text-primary">
                      {vehiclesByType.grouped[type].length} {vehiclesByType.grouped[type].length === 1 ? 'vehicle' : 'vehicles'}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {vehiclesByType.grouped[type].map((vehicle) => (
                      <VehicleCard key={vehicle.id} vehicle={vehicle} />
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

    </section>
  );
}

interface VehicleCardProps {
  vehicle: Vehicle;
}

function VehicleCard({ vehicle }: VehicleCardProps) {
  const VehicleIcon = getVehicleIcon(vehicle.vehicleType);
  
  const getUsageDisplay = () => {
    if (vehicle.mileage) return `${vehicle.mileage} mi`;
    if (vehicle.engineHours) return `${vehicle.engineHours} hrs`;
    if (vehicle.hobbsTime) return `${vehicle.hobbsTime} hrs`;
    return null;
  };

  const usageDisplay = getUsageDisplay();

  return (
    <Link
      to={`/asset/vehicle/${vehicle.id}`}
      className="group relative flex flex-col p-4 rounded-xl border-2 border-border bg-gradient-to-br from-card to-muted/30 hover:border-primary/50 hover:shadow-md transition-all duration-200"
    >
      {/* Icon */}
      <div className="flex items-start justify-between mb-3">
        <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
          <VehicleIcon className="h-5 w-5 text-primary" />
        </div>
        {usageDisplay && (
          <Badge variant="secondary" className="text-xs bg-slate-100 dark:bg-slate-700">
            <Gauge className="h-3 w-3 mr-1" />
            {usageDisplay}
          </Badge>
        )}
      </div>

      {/* Name */}
      <h3 className="font-semibold text-foreground mb-1 line-clamp-2 group-hover:text-primary transition-colors">
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
      <div className="absolute inset-0 rounded-xl ring-2 ring-primary ring-opacity-0 group-hover:ring-opacity-20 transition-all pointer-events-none" />
    </Link>
  );
}
