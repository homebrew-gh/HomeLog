/**
 * AppliancesTab - "My Stuff" Tab
 * 
 * NOTE: This tab is displayed as "My Stuff" in the UI, but the underlying
 * data model and variables still use "appliance" terminology for backwards
 * compatibility with existing data and to maintain code stability.
 * 
 * UI Label: "My Stuff"
 * Code/Data: "appliance" / "appliances"
 */
import { useState, useMemo, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, ChevronDown, ChevronRight, Home, Package, List, LayoutGrid, Calendar, Building2, Archive, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { ApplianceDialog } from '@/components/ApplianceDialog';
import { useAppliances } from '@/hooks/useAppliances';
import { useUserPreferences } from '@/hooks/useTabPreferences';
import type { Appliance } from '@/lib/types';

interface AppliancesTabProps {
  scrollTarget?: string;
}

export function AppliancesTab({ scrollTarget }: AppliancesTabProps) {
  const { data: appliances = [], isLoading } = useAppliances();
  const { preferences, setAppliancesViewMode } = useUserPreferences();
  const viewMode = preferences.appliancesViewMode;

  // View mode: 'active' or 'archived'
  const [showArchived, setShowArchived] = useState(false);

  // Dialog state (for Add)
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAppliance, setEditingAppliance] = useState<Appliance | undefined>();
  const navigate = useNavigate();

  // Collapsed rooms state (for list view)
  const [collapsedRooms, setCollapsedRooms] = useState<Set<string>>(new Set());

  // Filter appliances based on archive state
  const activeAppliances = useMemo(() => appliances.filter(a => !a.isArchived), [appliances]);
  const archivedAppliances = useMemo(() => appliances.filter(a => a.isArchived), [appliances]);
  const displayedAppliances = showArchived ? archivedAppliances : activeAppliances;

  // Refs for room sections
  const roomRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Handle scroll to target when scrollTarget changes
  useEffect(() => {
    if (scrollTarget && scrollTarget.startsWith('room-') && !isLoading) {
      const roomName = scrollTarget.replace('room-', '');
      // Small delay to ensure the DOM has rendered
      const timer = setTimeout(() => {
        const element = roomRefs.current[roomName];
        if (element) {
          // Expand the room if it's collapsed (for list view)
          setCollapsedRooms(prev => {
            const newSet = new Set(prev);
            newSet.delete(roomName);
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

  // Group appliances by room
  const appliancesByRoom = useMemo(() => {
    const grouped: Record<string, Appliance[]> = {};

    for (const appliance of displayedAppliances) {
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
  }, [displayedAppliances]);

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

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
          {showArchived ? (
            <>
              <Archive className="h-6 w-6 text-muted-foreground" />
              Archived Items
            </>
          ) : (
            <>
              <Package className="h-6 w-6 text-primary" />
              My Stuff
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
              Back to My Stuff
            </Button>
          ) : (
            <>
              {archivedAppliances.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowArchived(true)}
                  className="text-muted-foreground"
                >
                  <Archive className="h-4 w-4 mr-2" />
                  Archived ({archivedAppliances.length})
                </Button>
              )}
              {/* View Toggle */}
              {activeAppliances.length > 0 && (
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
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add
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
      ) : displayedAppliances.length === 0 ? (
        <Card className="bg-card border-border border-dashed">
          <CardContent className="py-12 text-center">
            {showArchived ? (
              <>
                <Archive className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">
                  No archived items.
                </p>
                <Button
                  onClick={() => setShowArchived(false)}
                  variant="outline"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to My Stuff
                </Button>
              </>
            ) : (
              <>
                <Package className="h-12 w-12 text-primary/30 mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">
                  No items added yet. Start tracking your stuff!
                </p>
                <Button
                  onClick={() => {
                    setEditingAppliance(undefined);
                    setDialogOpen(true);
                  }}
                  variant="outline"
                  className="border-primary/30 hover:bg-primary/10"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Item
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      ) : viewMode === 'list' ? (
        /* List View */
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            {appliancesByRoom.sortedRooms.map((room) => (
              <div
                key={room}
                ref={(el) => { roomRefs.current[room] = el; }}
              >
              <Collapsible
                open={!collapsedRooms.has(room)}
                onOpenChange={() => toggleRoom(room)}
                className="mb-2 last:mb-0"
              >
                <CollapsibleTrigger className="flex items-center gap-2 w-full p-2 rounded-lg hover:bg-primary/10 transition-colors">
                  {collapsedRooms.has(room) ? (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                  <Home className="h-4 w-4 text-primary" />
                  <span className="font-semibold text-foreground">
                    {room}
                  </span>
                  <Badge variant="secondary" className="ml-auto bg-primary/10 text-primary">
                    {appliancesByRoom.grouped[room].length}
                  </Badge>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="pl-8 py-2 space-y-1">
                    {appliancesByRoom.grouped[room].map((appliance) => (
                      <button
                        key={appliance.id}
                        onClick={() => navigate(`/asset/appliance/${appliance.id}`)}
                        className="flex items-center gap-2 w-full p-2 rounded-lg text-left hover:bg-primary/5 transition-colors group"
                      >
                        <span className="text-muted-foreground group-hover:text-primary">
                          {appliance.model}
                        </span>
                        {appliance.manufacturer && (
                          <span className="text-sm text-muted-foreground/70">
                            - {appliance.manufacturer}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : (
        /* Card View */
        <div className="space-y-6">
          {appliancesByRoom.sortedRooms.map((room) => (
            <Card 
              key={room} 
              ref={(el) => { roomRefs.current[room] = el; }}
              className="bg-card border-border overflow-hidden"
            >
              <CardHeader className="pb-3 bg-gradient-to-r from-primary/10 to-transparent">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <div className="p-1.5 rounded-lg bg-primary/10">
                    <Home className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-foreground">{room}</span>
                  <Badge variant="secondary" className="ml-auto bg-primary/10 text-primary">
                    {appliancesByRoom.grouped[room].length} {appliancesByRoom.grouped[room].length === 1 ? 'item' : 'items'}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {appliancesByRoom.grouped[room].map((appliance) => (
                    <ApplianceCard key={appliance.id} appliance={appliance} />
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

    </section>
  );
}

interface ApplianceCardProps {
  appliance: Appliance;
}

function ApplianceCard({ appliance }: ApplianceCardProps) {
  return (
    <Link
      to={`/asset/appliance/${appliance.id}`}
      className="group relative flex flex-col p-4 rounded-xl border-2 border-border bg-gradient-to-br from-card to-muted/30 hover:border-primary/50 hover:shadow-md transition-all duration-200"
    >
      {/* Icon */}
      <div className="flex items-start justify-between mb-3">
        <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
          <Package className="h-5 w-5 text-primary" />
        </div>
      </div>

      {/* Model/Name */}
      <h3 className="font-semibold text-foreground mb-1 line-clamp-2 group-hover:text-primary transition-colors">
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
      <div className="absolute inset-0 rounded-xl ring-2 ring-primary ring-opacity-0 group-hover:ring-opacity-20 transition-all pointer-events-none" />
    </Link>
  );
}
