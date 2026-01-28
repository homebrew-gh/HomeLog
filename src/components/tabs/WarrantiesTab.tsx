import { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Plus, 
  ChevronDown, 
  ChevronRight, 
  Shield, 
  List, 
  LayoutGrid, 
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Package,
  Car,
  Home,
  Tag,
  Building,
  ShieldPlus,
  Archive,
  ArrowLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { WarrantyDialog } from '@/components/WarrantyDialog';
import { WarrantyDetailDialog } from '@/components/WarrantyDetailDialog';
import { useWarranties, isWarrantyExpired, isWarrantyExpiringSoon, formatWarrantyTimeRemaining } from '@/hooks/useWarranties';
import { useUserPreferences } from '@/contexts/UserPreferencesContext';
import { useAppliances } from '@/hooks/useAppliances';
import { useVehicles } from '@/hooks/useVehicles';
import type { Warranty } from '@/lib/types';

// Get icon based on warranty type or linked item type
function getWarrantyIcon(warranty: Warranty) {
  // If linked to an item, show that type's icon
  if (warranty.linkedType === 'appliance') return Package;
  if (warranty.linkedType === 'vehicle') return Car;
  if (warranty.linkedType === 'home_feature') return Home;
  if (warranty.linkedType === 'custom') return Tag;
  
  // Otherwise use type-based icons
  const type = warranty.warrantyType.toLowerCase();
  if (type.includes('auto') || type.includes('vehicle')) return Car;
  if (type.includes('appliance')) return Package;
  if (type.includes('electronics')) return Package;
  if (type.includes('tool')) return Package;
  if (type.includes('furniture')) return Home;
  if (type.includes('outdoor')) return Home;
  if (type.includes('home')) return Home;
  
  return Shield;
}

interface WarrantiesTabProps {
  scrollTarget?: string;
}

export function WarrantiesTab({ scrollTarget }: WarrantiesTabProps) {
  const { data: warranties = [], isLoading } = useWarranties();
  const { data: appliances = [] } = useAppliances();
  const { data: vehicles = [] } = useVehicles();
  const { preferences } = useUserPreferences();
  const [viewMode, setViewMode] = useState<'list' | 'card'>('card');

  // View mode: 'active' or 'archived'
  const [showArchived, setShowArchived] = useState(false);

  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingWarranty, setEditingWarranty] = useState<Warranty | undefined>();
  const [viewingWarranty, setViewingWarranty] = useState<Warranty | undefined>();

  // Collapsed types state (for list view)
  const [collapsedTypes, setCollapsedTypes] = useState<Set<string>>(new Set());

  // Refs for warranty type sections
  const typeRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Filter warranties based on archive state
  const activeWarranties = useMemo(() => warranties.filter(w => !w.isArchived), [warranties]);
  const archivedWarranties = useMemo(() => warranties.filter(w => w.isArchived), [warranties]);
  const displayedWarranties = showArchived ? archivedWarranties : activeWarranties;

  // Handle scroll to target when scrollTarget changes
  useEffect(() => {
    if (scrollTarget && scrollTarget.startsWith('type-') && !isLoading) {
      const typeName = scrollTarget.replace('type-', '');
      const timer = setTimeout(() => {
        const element = typeRefs.current[typeName];
        if (element) {
          // Expand the type if it's collapsed
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

  // Group warranties by type
  const warrantiesByType = useMemo(() => {
    const grouped: Record<string, Warranty[]> = {};

    for (const warranty of displayedWarranties) {
      const type = warranty.warrantyType || 'Uncategorized';
      if (!grouped[type]) {
        grouped[type] = [];
      }
      grouped[type].push(warranty);
    }

    // Sort types alphabetically, but put "Uncategorized" at the end
    const sortedTypes = Object.keys(grouped).sort((a, b) => {
      if (a === 'Uncategorized') return 1;
      if (b === 'Uncategorized') return -1;
      return a.localeCompare(b);
    });

    return { grouped, sortedTypes };
  }, [displayedWarranties]);

  // Get linked item name for display
  const getLinkedItemName = (warranty: Warranty): string | null => {
    if (warranty.linkedType === 'appliance' && warranty.linkedItemId) {
      const appliance = appliances.find(a => a.id === warranty.linkedItemId);
      return appliance?.model || warranty.linkedItemName || null;
    }
    if (warranty.linkedType === 'vehicle' && warranty.linkedItemId) {
      const vehicle = vehicles.find(v => v.id === warranty.linkedItemId);
      return vehicle?.name || warranty.linkedItemName || null;
    }
    if (warranty.linkedType === 'home_feature' || warranty.linkedType === 'custom') {
      return warranty.linkedItemName || null;
    }
    return null;
  };

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

  const handleEditWarranty = (warranty: Warranty) => {
    setEditingWarranty(warranty);
    setDialogOpen(true);
  };

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
          {showArchived ? (
            <>
              <Archive className="h-6 w-6 text-muted-foreground" />
              Archived Warranties
            </>
          ) : (
            <>
              <Shield className="h-6 w-6 text-primary" />
              Warranties
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
              Back to Warranties
            </Button>
          ) : (
            <>
              {archivedWarranties.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowArchived(true)}
                  className="text-muted-foreground"
                >
                  <Archive className="h-4 w-4 mr-2" />
                  Archived ({archivedWarranties.length})
                </Button>
              )}
              {/* View Toggle */}
              {activeWarranties.length > 0 && (
                <ToggleGroup 
                  type="single" 
                  value={viewMode} 
                  onValueChange={(value) => value && setViewMode(value as 'list' | 'card')}
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
                  setEditingWarranty(undefined);
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
      ) : displayedWarranties.length === 0 ? (
        <Card className="bg-card border-border border-dashed">
          <CardContent className="py-12 text-center">
            {showArchived ? (
              <>
                <Archive className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">
                  No archived warranties.
                </p>
                <Button
                  onClick={() => setShowArchived(false)}
                  variant="outline"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Warranties
                </Button>
              </>
            ) : (
              <>
                <Shield className="h-12 w-12 text-primary/30 mx-auto mb-4" />
                <h3 className="font-semibold text-foreground mb-2">
                  No Warranties Yet
                </h3>
                <p className="text-muted-foreground mb-4 max-w-md mx-auto">
                  Store warranty documents, track expiration dates, and never miss a coverage deadline again.
                </p>
                <Button
                  onClick={() => {
                    setEditingWarranty(undefined);
                    setDialogOpen(true);
                  }}
                  variant="outline"
                  className="border-primary/30 hover:bg-primary/10"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Warranty
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      ) : viewMode === 'list' ? (
        /* List View */
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            {warrantiesByType.sortedTypes.map((type) => (
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
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                    <Shield className="h-4 w-4 text-primary" />
                    <span className="font-semibold text-foreground">
                      {type}
                    </span>
                    <Badge variant="secondary" className="ml-auto bg-primary/10 text-primary">
                      {warrantiesByType.grouped[type].length}
                    </Badge>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="pl-8 py-2 space-y-1">
                      {warrantiesByType.grouped[type].map((warranty) => {
                        const expired = isWarrantyExpired(warranty);
                        const expiringSoon = isWarrantyExpiringSoon(warranty);
                        const linkedName = getLinkedItemName(warranty);
                        
                        return (
                          <button
                            key={warranty.id}
                            onClick={() => setViewingWarranty(warranty)}
                            className="flex items-center gap-2 w-full p-2 rounded-lg text-left hover:bg-primary/5 transition-colors group"
                          >
                            <span className={`text-muted-foreground group-hover:text-primary font-medium ${expired ? 'line-through opacity-60' : ''}`}>
                              {warranty.name}
                            </span>
                            {linkedName && (
                              <span className="text-xs text-muted-foreground">
                                ({linkedName})
                              </span>
                            )}
                            {expired ? (
                              <Badge variant="destructive" className="ml-auto text-xs">Expired</Badge>
                            ) : expiringSoon ? (
                              <Badge variant="secondary" className="ml-auto text-xs bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                                Expiring Soon
                              </Badge>
                            ) : null}
                          </button>
                        );
                      })}
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
          {warrantiesByType.sortedTypes.map((type) => (
            <Card 
              key={type} 
              ref={(el) => { typeRefs.current[type] = el; }}
              className="bg-card border-border overflow-hidden"
            >
              <CardHeader className="pb-3 bg-gradient-to-r from-primary/10 to-transparent">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <div className="p-1.5 rounded-lg bg-primary/10">
                    <Shield className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-foreground">{type}</span>
                  <Badge variant="secondary" className="ml-auto bg-primary/10 text-primary">
                    {warrantiesByType.grouped[type].length} {warrantiesByType.grouped[type].length === 1 ? 'warranty' : 'warranties'}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {warrantiesByType.grouped[type].map((warranty) => (
                    <WarrantyCard
                      key={warranty.id}
                      warranty={warranty}
                      linkedItemName={getLinkedItemName(warranty)}
                      onClick={() => setViewingWarranty(warranty)}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialogs */}
      <WarrantyDialog
        isOpen={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setEditingWarranty(undefined);
        }}
        warranty={editingWarranty}
      />

      {viewingWarranty && (
        <WarrantyDetailDialog
          isOpen={!!viewingWarranty}
          onClose={() => setViewingWarranty(undefined)}
          warranty={viewingWarranty}
          onEdit={() => handleEditWarranty(viewingWarranty)}
          onDelete={() => setViewingWarranty(undefined)}
        />
      )}
    </section>
  );
}

interface WarrantyCardProps {
  warranty: Warranty;
  linkedItemName: string | null;
  onClick: () => void;
}

function WarrantyCard({ warranty, linkedItemName, onClick }: WarrantyCardProps) {
  const WarrantyIcon = getWarrantyIcon(warranty);
  const expired = isWarrantyExpired(warranty);
  const expiringSoon = isWarrantyExpiringSoon(warranty);
  const timeRemaining = formatWarrantyTimeRemaining(warranty);

  return (
    <button
      onClick={onClick}
      className={`group relative flex flex-col p-4 rounded-xl border-2 bg-gradient-to-br from-card to-muted/30 hover:shadow-md transition-all duration-200 text-left ${
        expired 
          ? 'border-destructive/30 opacity-75' 
          : warranty.isLifetime
            ? 'border-blue-300 dark:border-blue-700 hover:border-blue-400 dark:hover:border-blue-600'
            : expiringSoon 
              ? 'border-amber-300 dark:border-amber-700' 
              : 'border-border hover:border-primary/50'
      }`}
    >
      {/* Icon & Status */}
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2 rounded-lg transition-colors ${
          expired 
            ? 'bg-destructive/10' 
            : warranty.isLifetime
              ? 'bg-blue-100 dark:bg-blue-900/30 group-hover:bg-blue-200 dark:group-hover:bg-blue-900/50'
              : expiringSoon 
                ? 'bg-amber-100 dark:bg-amber-900/30' 
                : 'bg-primary/10 group-hover:bg-primary/20'
        }`}>
          <WarrantyIcon className={`h-5 w-5 ${
            expired 
              ? 'text-destructive' 
              : warranty.isLifetime
                ? 'text-blue-600 dark:text-blue-400'
                : expiringSoon 
                  ? 'text-amber-600 dark:text-amber-400' 
                  : 'text-primary'
          }`} />
        </div>
        {expired ? (
          <Badge variant="destructive" className="text-xs">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Expired
          </Badge>
        ) : warranty.isLifetime ? (
          <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Lifetime
          </Badge>
        ) : expiringSoon ? (
          <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
            <Clock className="h-3 w-3 mr-1" />
            Expiring
          </Badge>
        ) : (
          <Badge variant="secondary" className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Active
          </Badge>
        )}
      </div>

      {/* Name */}
      <h3 className={`font-semibold mb-1 line-clamp-2 transition-colors ${
        expired 
          ? 'text-muted-foreground line-through' 
          : 'text-foreground group-hover:text-primary'
      }`}>
        {warranty.name}
      </h3>

      {/* Linked Item */}
      {linkedItemName && (
        <p className="text-sm text-muted-foreground flex items-center gap-1.5 mb-2">
          {warranty.linkedType === 'appliance' && <Package className="h-3.5 w-3.5" />}
          {warranty.linkedType === 'vehicle' && <Car className="h-3.5 w-3.5" />}
          {warranty.linkedType === 'home_feature' && <Home className="h-3.5 w-3.5" />}
          {warranty.linkedType === 'custom' && <Tag className="h-3.5 w-3.5" />}
          <span className="truncate">{linkedItemName}</span>
        </p>
      )}

      {/* Company */}
      {(warranty.companyId || warranty.companyName) && (
        <p className="text-sm text-muted-foreground flex items-center gap-1.5 mb-2">
          <Building className="h-3.5 w-3.5" />
          <span className="truncate">{warranty.companyName}</span>
        </p>
      )}

      {/* Extended Warranty Badge */}
      {warranty.hasExtendedWarranty && (
        <Badge variant="outline" className="w-fit text-xs mb-2">
          <ShieldPlus className="h-3 w-3 mr-1" />
          Extended
        </Badge>
      )}

      {/* Time Remaining */}
      <p className={`text-xs flex items-center gap-1.5 mt-auto pt-2 border-t border-slate-100 dark:border-slate-700 ${
        expired 
          ? 'text-destructive' 
          : warranty.isLifetime
            ? 'text-blue-600 dark:text-blue-400'
            : expiringSoon 
              ? 'text-amber-600 dark:text-amber-400' 
              : 'text-muted-foreground'
      }`}>
        <Calendar className="h-3 w-3" />
        <span>{timeRemaining}</span>
      </p>

      {/* Hover indicator */}
      <div className="absolute inset-0 rounded-xl ring-2 ring-primary ring-opacity-0 group-hover:ring-opacity-20 transition-all pointer-events-none" />
    </button>
  );
}
