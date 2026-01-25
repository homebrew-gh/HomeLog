import { useMemo, useState, useRef, useEffect, useCallback } from 'react';
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
  Check,
  UserCheck,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useAppliances } from '@/hooks/useAppliances';
import { useVehicles } from '@/hooks/useVehicles';
import { useContractors } from '@/hooks/useContractors';
import { useMaintenance, useApplianceMaintenance, useVehicleMaintenance, calculateNextDueDate, formatDueDate, isOverdue, isDueSoon } from '@/hooks/useMaintenance';
import { useMaintenanceCompletions } from '@/hooks/useMaintenanceCompletions';
import { useTabPreferences, type TabId } from '@/hooks/useTabPreferences';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useHomeLogFriends } from '@/hooks/useHomeLogFriends';
import { useAuthor } from '@/hooks/useAuthor';
import { genUserName } from '@/lib/genUserName';
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

// Widget types for dashboard - each active tab can have one or more widgets
type WidgetId = 
  | 'appliances'
  | 'vehicles' 
  | 'contractors'
  | 'home-maintenance'
  | 'vehicle-maintenance'
  | 'subscriptions'
  | 'warranties'
  | 'projects';

// Widget configuration - defines size and which tab it belongs to
interface WidgetConfig {
  id: WidgetId;
  tabId: TabId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  // Widget size: 1 = single column, 2 = double column (full width on md+)
  colSpan: 1 | 2;
}

const WIDGET_CONFIGS: WidgetConfig[] = [
  { id: 'appliances', tabId: 'appliances', label: 'Appliances', icon: Package, colSpan: 1 },
  { id: 'vehicles', tabId: 'vehicles', label: 'Vehicles', icon: Car, colSpan: 1 },
  { id: 'contractors', tabId: 'contractors', label: 'Contractors & Services', icon: Users, colSpan: 1 },
  { id: 'home-maintenance', tabId: 'maintenance', label: 'Home Maintenance', icon: Home, colSpan: 1 },
  { id: 'vehicle-maintenance', tabId: 'maintenance', label: 'Vehicle Maintenance', icon: Car, colSpan: 1 },
  { id: 'subscriptions', tabId: 'subscriptions', label: 'Subscriptions', icon: CreditCard, colSpan: 1 },
  { id: 'warranties', tabId: 'warranties', label: 'Warranties', icon: Shield, colSpan: 1 },
  { id: 'projects', tabId: 'projects', label: 'Projects', icon: FolderKanban, colSpan: 1 },
];

const getWidgetConfig = (widgetId: WidgetId): WidgetConfig | undefined => {
  return WIDGET_CONFIGS.find(w => w.id === widgetId);
};

interface HomeTabProps {
  onNavigateToTab: (tabId: TabId, scrollTarget?: string) => void;
  onAddTab: () => void;
}

export function HomeTab({ onNavigateToTab, onAddTab }: HomeTabProps) {
  const { preferences } = useTabPreferences();
  const { data: appliances = [], isLoading: isLoadingAppliances } = useAppliances();
  const { data: vehicles = [], isLoading: isLoadingVehicles } = useVehicles();
  const { data: contractors = [], isLoading: isLoadingContractors } = useContractors();
  const { data: maintenance = [], isLoading: isLoadingMaintenance } = useMaintenance();
  const { data: completions = [] } = useMaintenanceCompletions();
  const applianceMaintenance = useApplianceMaintenance();
  const vehicleMaintenance = useVehicleMaintenance();
  
  // Discover friends using HomeLog
  const { friends: homeLogFriends, isLoading: isLoadingFriends } = useHomeLogFriends();

  // Edit mode for reordering dashboard cards
  const [isEditMode, setIsEditMode] = useState(false);
  const [draggedWidget, setDraggedWidget] = useState<WidgetId | null>(null);
  const [dragOverWidget, setDragOverWidget] = useState<WidgetId | null>(null);
  const [dragPosition, setDragPosition] = useState<{ x: number; y: number } | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [draggedWidgetSize, setDraggedWidgetSize] = useState<{ width: number; height: number } | null>(null);
  const widgetRefs = useRef<Map<WidgetId, HTMLDivElement>>(new Map());
  
  // Widget order state - stored separately from tab order
  const [widgetOrder, setWidgetOrder] = useLocalStorage<WidgetId[]>('homelog-widget-order', []);
  
  // Generate random animation parameters for each widget (persist across renders)
  // This creates the iOS-style "fake randomness" effect
  const [animationParams] = useState<Map<WidgetId, { delay: number; duration: number }>>(() => {
    const params = new Map<WidgetId, { delay: number; duration: number }>();
    const allWidgets: WidgetId[] = ['appliances', 'vehicles', 'contractors', 'home-maintenance', 'vehicle-maintenance', 'subscriptions', 'warranties', 'projects'];
    allWidgets.forEach(widget => {
      // Random negative delay (-0.06s to -0.94s) to offset animation start
      // Random duration (0.275s to 0.41s) for slight speed variation (25% slower than original)
      params.set(widget, {
        delay: -(Math.random() * 0.88 + 0.06), // -0.06s to -0.94s
        duration: Math.random() * 0.135 + 0.275, // 0.275s to 0.41s
      });
    });
    return params;
  });

  const hasActiveTabs = preferences.activeTabs.length > 0;

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

  // Get ordered list of active widgets based on active tabs
  const activeWidgets = useMemo((): WidgetId[] => {
    // Get all widgets for active tabs
    const widgetsFromTabs: WidgetId[] = [];
    preferences.activeTabs.forEach(tabId => {
      if (tabId === 'maintenance') {
        // Maintenance tab has two widgets
        widgetsFromTabs.push('home-maintenance', 'vehicle-maintenance');
      } else {
        widgetsFromTabs.push(tabId as WidgetId);
      }
    });
    
    // If we have a stored order, use it but filter to only active widgets
    if (widgetOrder.length > 0) {
      const orderedWidgets = widgetOrder.filter(w => widgetsFromTabs.includes(w));
      // Add any new widgets not in the stored order
      const missingWidgets = widgetsFromTabs.filter(w => !widgetOrder.includes(w));
      return [...orderedWidgets, ...missingWidgets];
    }
    
    return widgetsFromTabs;
  }, [preferences.activeTabs, widgetOrder]);

  // Auto-scroll configuration
  const SCROLL_ZONE_SIZE = 80; // pixels from edge to trigger scroll
  const SCROLL_SPEED_SLOW = 2; // pixels per frame (slow, deliberate)
  const SCROLL_SPEED_FAST = 5; // pixels per frame when closer to edge
  const autoScrollRef = useRef<number | null>(null);
  const currentPointerY = useRef<number>(0);

  // Auto-scroll function that runs in animation frame loop
  const performAutoScroll = useCallback(() => {
    const viewportHeight = window.innerHeight;
    const y = currentPointerY.current;
    
    let scrollAmount = 0;
    
    // Check if near top edge - scroll up
    if (y < SCROLL_ZONE_SIZE) {
      const intensity = 1 - (y / SCROLL_ZONE_SIZE); // 0 to 1, higher when closer to edge
      scrollAmount = -(SCROLL_SPEED_SLOW + (SCROLL_SPEED_FAST - SCROLL_SPEED_SLOW) * intensity);
    }
    // Check if near bottom edge - scroll down
    else if (y > viewportHeight - SCROLL_ZONE_SIZE) {
      const intensity = 1 - ((viewportHeight - y) / SCROLL_ZONE_SIZE); // 0 to 1, higher when closer to edge
      scrollAmount = SCROLL_SPEED_SLOW + (SCROLL_SPEED_FAST - SCROLL_SPEED_SLOW) * intensity;
    }
    
    if (scrollAmount !== 0) {
      window.scrollBy(0, scrollAmount);
    }
    
    // Continue the loop if we're still dragging
    if (draggedWidget) {
      autoScrollRef.current = requestAnimationFrame(performAutoScroll);
    }
  }, [draggedWidget]);

  // Start auto-scroll loop when dragging begins
  useEffect(() => {
    if (draggedWidget) {
      autoScrollRef.current = requestAnimationFrame(performAutoScroll);
    }
    
    return () => {
      if (autoScrollRef.current) {
        cancelAnimationFrame(autoScrollRef.current);
        autoScrollRef.current = null;
      }
    };
  }, [draggedWidget, performAutoScroll]);

  // Shared drag start logic for both mouse and touch
  const startDrag = useCallback((clientX: number, clientY: number, widgetId: WidgetId) => {
    const widgetElement = widgetRefs.current.get(widgetId);
    if (!widgetElement) return;
    
    const rect = widgetElement.getBoundingClientRect();
    
    // Calculate offset from pointer to widget's top-left corner
    setDragOffset({
      x: clientX - rect.left,
      y: clientY - rect.top
    });
    
    // Store the widget's size for the floating element
    setDraggedWidgetSize({
      width: rect.width,
      height: rect.height
    });
    
    setDraggedWidget(widgetId);
    setDragPosition({ x: clientX, y: clientY });
    currentPointerY.current = clientY;
  }, []);

  // Shared drag move logic for both mouse and touch
  const moveDrag = useCallback((clientX: number, clientY: number) => {
    if (!draggedWidget) return;
    
    setDragPosition({ x: clientX, y: clientY });
    currentPointerY.current = clientY; // Update for auto-scroll
    
    // Find which widget we're hovering over
    let foundTarget: WidgetId | null = null;
    widgetRefs.current.forEach((element, widgetId) => {
      if (widgetId === draggedWidget) return;
      
      const rect = element.getBoundingClientRect();
      
      // Check if pointer is within the widget bounds
      if (
        clientX >= rect.left &&
        clientX <= rect.right &&
        clientY >= rect.top &&
        clientY <= rect.bottom
      ) {
        foundTarget = widgetId;
      }
    });
    
    setDragOverWidget(foundTarget);
  }, [draggedWidget]);

  // Shared drag end logic for both mouse and touch
  const endDrag = useCallback(() => {
    if (!draggedWidget) return;
    
    // Stop auto-scroll
    if (autoScrollRef.current) {
      cancelAnimationFrame(autoScrollRef.current);
      autoScrollRef.current = null;
    }
    
    // If we're over a drop target, perform the swap
    if (dragOverWidget && draggedWidget !== dragOverWidget) {
      const currentOrder = [...activeWidgets];
      const draggedIndex = currentOrder.indexOf(draggedWidget);
      const targetIndex = currentOrder.indexOf(dragOverWidget);

      if (draggedIndex !== -1 && targetIndex !== -1) {
        // Remove dragged item and insert at target position
        currentOrder.splice(draggedIndex, 1);
        currentOrder.splice(targetIndex, 0, draggedWidget);
        setWidgetOrder(currentOrder);
      }
    }
    
    // Reset drag state
    setDraggedWidget(null);
    setDragOverWidget(null);
    setDragPosition(null);
    setDraggedWidgetSize(null);
  }, [draggedWidget, dragOverWidget, activeWidgets, setWidgetOrder]);

  // Mouse-based drag and drop handlers
  const handleMouseDown = useCallback((e: React.MouseEvent, widgetId: WidgetId) => {
    if (!isEditMode) return;
    startDrag(e.clientX, e.clientY, widgetId);
    e.preventDefault();
  }, [isEditMode, startDrag]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    moveDrag(e.clientX, e.clientY);
  }, [moveDrag]);

  const handleMouseUp = useCallback(() => {
    endDrag();
  }, [endDrag]);

  // Touch-based drag and drop handlers for mobile
  const handleTouchStart = useCallback((e: React.TouchEvent, widgetId: WidgetId) => {
    if (!isEditMode) return;
    
    const touch = e.touches[0];
    if (!touch) return;
    
    startDrag(touch.clientX, touch.clientY, widgetId);
    
    // Prevent scrolling while dragging
    e.preventDefault();
  }, [isEditMode, startDrag]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!draggedWidget) return;
    
    const touch = e.touches[0];
    if (!touch) return;
    
    moveDrag(touch.clientX, touch.clientY);
    
    // Prevent scrolling while dragging
    e.preventDefault();
  }, [draggedWidget, moveDrag]);

  const handleTouchEnd = useCallback(() => {
    endDrag();
  }, [endDrag]);

  // Add and remove global mouse event listeners
  useEffect(() => {
    if (draggedWidget) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      // Prevent text selection while dragging
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'grabbing';
    }
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [draggedWidget, handleMouseMove, handleMouseUp]);

  // Add and remove global touch event listeners
  useEffect(() => {
    if (draggedWidget) {
      // Use passive: false to allow preventDefault on touchmove
      // This prevents native scrolling so our auto-scroll can take over
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleTouchEnd);
      document.addEventListener('touchcancel', handleTouchEnd);
      // Note: We don't set overflow:hidden anymore - auto-scroll handles scrolling
    }
    
    return () => {
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [draggedWidget, handleTouchMove, handleTouchEnd]);

  // Move widget up in the order (for mobile button controls)
  const moveWidgetUp = useCallback((widgetId: WidgetId) => {
    const currentOrder = [...activeWidgets];
    const currentIndex = currentOrder.indexOf(widgetId);
    
    if (currentIndex > 0) {
      // Swap with the previous widget
      [currentOrder[currentIndex - 1], currentOrder[currentIndex]] = 
        [currentOrder[currentIndex], currentOrder[currentIndex - 1]];
      setWidgetOrder(currentOrder);
    }
  }, [activeWidgets, setWidgetOrder]);

  // Move widget down in the order (for mobile button controls)
  const moveWidgetDown = useCallback((widgetId: WidgetId) => {
    const currentOrder = [...activeWidgets];
    const currentIndex = currentOrder.indexOf(widgetId);
    
    if (currentIndex < currentOrder.length - 1) {
      // Swap with the next widget
      [currentOrder[currentIndex], currentOrder[currentIndex + 1]] = 
        [currentOrder[currentIndex + 1], currentOrder[currentIndex]];
      setWidgetOrder(currentOrder);
    }
  }, [activeWidgets, setWidgetOrder]);

  // Get animation styles for a specific widget (iOS-style random parameters)
  const getAnimationStyle = (widgetId: WidgetId): React.CSSProperties => {
    const params = animationParams.get(widgetId) ?? { delay: -0.3, duration: 0.25 };
    return {
      animationDelay: `${params.delay}s`,
      animationDuration: `${params.duration}s`,
    };
  };
  
  // Get the appropriate wiggle class based on widget index (alternating even/odd)
  const getWiggleClass = (index: number): string => {
    return index % 2 === 0 ? 'animate-wiggle-card-even' : 'animate-wiggle-card-odd';
  };

  return (
    <section className="space-y-6 relative">
      {/* Floating Reorder/Done Button - fixed in right margin near top */}
      {hasActiveTabs && activeWidgets.length > 1 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsEditMode(!isEditMode)}
          className={cn(
            "fixed right-4 top-40 z-40 gap-1.5 px-3 py-2 h-auto rounded-lg shadow-lg",
            isEditMode
              ? "bg-rose-600 text-white hover:bg-rose-700 border border-rose-700"
              : "bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-sky-50 dark:hover:bg-slate-700 hover:text-sky-600 dark:hover:text-sky-400 border border-slate-200 dark:border-slate-700"
          )}
        >
          {isEditMode ? (
            <>
              <Check className="h-4 w-4" />
              <span className="text-sm font-medium">Done</span>
            </>
          ) : (
            <Pencil className="h-4 w-4" />
          )}
        </Button>
      )}

      {/* Welcome / Dashboard Header */}
      <div className="flex items-center justify-center py-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center justify-center gap-2">
            <Home className="h-6 w-6 text-sky-600 dark:text-sky-400" />
            Dashboard
          </h2>
          <p className="text-muted-foreground mt-1">
            Overview of your home management
          </p>
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

{/* Dashboard widgets - uniform grid of draggable cards */}
      {hasActiveTabs && (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 items-start">
          {activeWidgets.map((widgetId, index) => {
            const config = getWidgetConfig(widgetId);
            if (!config) return null;
            
            const isDragging = draggedWidget === widgetId;
            const isDragOver = dragOverWidget === widgetId;
            
            // Render widget content based on type
            const renderWidgetContent = () => {
              switch (widgetId) {
                case 'appliances':
                  return (
                    <WidgetCard
                      title="Appliances"
                      icon={Package}
                      onClick={() => !isEditMode && onNavigateToTab('appliances')}
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
                                  e.stopPropagation();
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
                    </WidgetCard>
                  );
                  
                case 'vehicles':
                  return (
                    <WidgetCard
                      title="Vehicles"
                      icon={Car}
                      onClick={() => !isEditMode && onNavigateToTab('vehicles')}
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
                                  e.stopPropagation();
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
                    </WidgetCard>
                  );
                  
                case 'contractors':
                  return (
                    <WidgetCard
                      title="Contractors & Services"
                      icon={Users}
                      onClick={() => !isEditMode && onNavigateToTab('contractors')}
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
                                  e.stopPropagation();
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
                    </WidgetCard>
                  );
                  
                case 'home-maintenance':
                  return (
                    <WidgetCard
                      title="Home Maintenance"
                      icon={Home}
                      onClick={() => !isEditMode && onNavigateToTab('maintenance', 'home-maintenance')}
                      isLoading={isLoadingMaintenance}
                      clickable={!isEditMode}
                      badge={upcomingHomeMaintenance.filter(m => m.isOverdue).length > 0 ? {
                        text: `${upcomingHomeMaintenance.filter(m => m.isOverdue).length} overdue`,
                        variant: 'destructive' as const,
                      } : undefined}
                    >
                      {upcomingHomeMaintenance.length === 0 ? (
                        <p className="text-muted-foreground text-sm">No home maintenance tasks</p>
                      ) : (
                        <div className="space-y-2">
                          {upcomingHomeMaintenance.slice(0, 3).map(({ maint, dueDate, isOverdue: itemOverdue, isDueSoon: itemDueSoon, appliance }) => (
                            <div
                              key={maint.id}
                              className={cn(
                                "flex items-center justify-between text-sm p-2 rounded-lg",
                                itemOverdue 
                                  ? 'bg-red-50 dark:bg-red-900/30' 
                                  : itemDueSoon 
                                    ? 'bg-amber-50 dark:bg-amber-900/30' 
                                    : 'bg-slate-50 dark:bg-slate-700/30'
                              )}
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
                                <p className={cn(
                                  "text-xs font-medium",
                                  itemOverdue
                                    ? 'text-red-600 dark:text-red-400'
                                    : itemDueSoon
                                      ? 'text-amber-600 dark:text-amber-400'
                                      : 'text-slate-600 dark:text-slate-300'
                                )}>
                                  {formatDueDate(dueDate)}
                                </p>
                              </div>
                            </div>
                          ))}
                          {upcomingHomeMaintenance.length > 3 && (
                            <p className="text-xs text-muted-foreground text-center">
                              +{upcomingHomeMaintenance.length - 3} more tasks
                            </p>
                          )}
                        </div>
                      )}
                    </WidgetCard>
                  );
                  
                case 'vehicle-maintenance':
                  return (
                    <WidgetCard
                      title="Vehicle Maintenance"
                      icon={Car}
                      onClick={() => !isEditMode && onNavigateToTab('maintenance', 'vehicle-maintenance')}
                      isLoading={isLoadingMaintenance || isLoadingVehicles}
                      clickable={!isEditMode}
                      badge={upcomingVehicleMaintenance.filter(m => m.isOverdue).length > 0 ? {
                        text: `${upcomingVehicleMaintenance.filter(m => m.isOverdue).length} overdue`,
                        variant: 'destructive' as const,
                      } : undefined}
                    >
                      {upcomingVehicleMaintenance.length === 0 ? (
                        <p className="text-muted-foreground text-sm">No vehicle maintenance tasks</p>
                      ) : (
                        <div className="space-y-2">
                          {upcomingVehicleMaintenance.slice(0, 3).map(({ maint, dueDate, isOverdue: vehOverdue, isDueSoon: vehDueSoon, vehicle }) => (
                            <div
                              key={maint.id}
                              className={cn(
                                "flex items-center justify-between text-sm p-2 rounded-lg",
                                vehOverdue 
                                  ? 'bg-red-50 dark:bg-red-900/30' 
                                  : vehDueSoon 
                                    ? 'bg-amber-50 dark:bg-amber-900/30' 
                                    : 'bg-slate-50 dark:bg-slate-700/30'
                              )}
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
                                <p className={cn(
                                  "text-xs font-medium",
                                  vehOverdue
                                    ? 'text-red-600 dark:text-red-400'
                                    : vehDueSoon
                                      ? 'text-amber-600 dark:text-amber-400'
                                      : 'text-slate-600 dark:text-slate-300'
                                )}>
                                  {formatDueDate(dueDate)}
                                </p>
                              </div>
                            </div>
                          ))}
                          {upcomingVehicleMaintenance.length > 3 && (
                            <p className="text-xs text-muted-foreground text-center">
                              +{upcomingVehicleMaintenance.length - 3} more tasks
                            </p>
                          )}
                        </div>
                      )}
                    </WidgetCard>
                  );
                  
                // Coming soon widgets
                case 'subscriptions':
                case 'warranties':
                case 'projects':
                  return (
                    <WidgetCard
                      title={config.label}
                      icon={config.icon}
                      onClick={() => !isEditMode && onNavigateToTab(config.tabId)}
                      clickable={!isEditMode}
                    >
                      <div className="flex items-center gap-2 text-muted-foreground text-sm">
                        <Badge variant="secondary" className="text-xs">Coming Soon</Badge>
                      </div>
                    </WidgetCard>
                  );
                  
                default:
                  return null;
              }
            };
            
            return (
              <div
                key={widgetId}
                ref={(el) => {
                  if (el) {
                    widgetRefs.current.set(widgetId, el);
                  } else {
                    widgetRefs.current.delete(widgetId);
                  }
                }}
                className={cn(
                  "relative",
                  isDragging && "dashboard-card-placeholder",
                  isDragOver && "dashboard-card-drop-target",
                  isEditMode && !isDragging && getWiggleClass(index),
                  isEditMode && !isDragging && "cursor-grab",
                  isEditMode && "touch-none" // Prevent default touch actions in edit mode
                )}
                style={isEditMode && !isDragging ? getAnimationStyle(widgetId) : undefined}
                onMouseDown={(e) => handleMouseDown(e, widgetId)}
                onTouchStart={(e) => handleTouchStart(e, widgetId)}
              >
                {/* Edit mode overlay with drag handle and up/down buttons */}
                {isEditMode && (
                  <div className="absolute top-2 right-2 z-10 flex items-center gap-1">
                    {/* Up/Down buttons - more visible on mobile */}
                    <div className="flex flex-col gap-0.5 md:hidden">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          moveWidgetUp(widgetId);
                        }}
                        disabled={index === 0}
                        className={cn(
                          "p-1 rounded-md transition-colors",
                          index === 0
                            ? "bg-slate-100 dark:bg-slate-800 text-slate-300 dark:text-slate-600"
                            : "bg-sky-100 dark:bg-sky-900 text-sky-600 dark:text-sky-400 active:bg-sky-200 dark:active:bg-sky-800"
                        )}
                      >
                        <ChevronUp className="h-4 w-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          moveWidgetDown(widgetId);
                        }}
                        disabled={index === activeWidgets.length - 1}
                        className={cn(
                          "p-1 rounded-md transition-colors",
                          index === activeWidgets.length - 1
                            ? "bg-slate-100 dark:bg-slate-800 text-slate-300 dark:text-slate-600"
                            : "bg-sky-100 dark:bg-sky-900 text-sky-600 dark:text-sky-400 active:bg-sky-200 dark:active:bg-sky-800"
                        )}
                      >
                        <ChevronDown className="h-4 w-4" />
                      </button>
                    </div>
                    {/* Drag handle - always visible */}
                    <div className="p-1.5 rounded-lg bg-sky-100 dark:bg-sky-900">
                      <GripVertical className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                    </div>
                  </div>
                )}
                {renderWidgetContent()}
              </div>
            );
          })}
        </div>
      )}

      {/* Friends using HomeLog */}
      {hasActiveTabs && (
        <FriendsUsingHomeLog 
          friends={homeLogFriends} 
          isLoading={isLoadingFriends} 
        />
      )}

      {/* Floating dragged widget that follows cursor */}
      {draggedWidget && dragPosition && draggedWidgetSize && (
        <div
          className="dashboard-card-dragging rounded-xl bg-white dark:bg-slate-800 border border-sky-200 dark:border-slate-700 overflow-hidden"
          style={{
            left: dragPosition.x - dragOffset.x,
            top: dragPosition.y - dragOffset.y,
            width: draggedWidgetSize.width,
            height: draggedWidgetSize.height,
          }}
        >
          {/* Clone of the widget content */}
          <div className="p-4 h-full flex flex-col">
            <div className="flex items-center gap-2 mb-2">
              {(() => {
                const config = getWidgetConfig(draggedWidget);
                if (!config) return null;
                const IconComponent = config.icon;
                return (
                  <>
                    <IconComponent className="h-5 w-5 text-sky-600 dark:text-sky-400" />
                    <span className="font-semibold text-slate-800 dark:text-slate-100">
                      {config.label}
                    </span>
                  </>
                );
              })()}
            </div>
            <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
              <GripVertical className="h-6 w-6 opacity-50" />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

interface WidgetCardProps {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  isLoading?: boolean;
  badge?: { text: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' };
  clickable?: boolean;
  children: React.ReactNode;
}

function WidgetCard({ title, icon: Icon, onClick, isLoading, badge, clickable = true, children }: WidgetCardProps) {
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

// Component to display a single friend's avatar with tooltip
function FriendAvatar({ pubkey }: { pubkey: string }) {
  const author = useAuthor(pubkey);
  const metadata = author.data?.metadata;
  
  const displayName = metadata?.name || metadata?.display_name || genUserName(pubkey);
  const picture = metadata?.picture;
  const shortPubkey = pubkey.slice(0, 8) + '...';
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="relative">
            <Avatar className="h-10 w-10 border-2 border-white dark:border-slate-800 shadow-sm hover:scale-110 transition-transform cursor-pointer">
              {picture ? (
                <AvatarImage src={picture} alt={displayName} />
              ) : null}
              <AvatarFallback className="bg-sky-100 dark:bg-sky-900 text-sky-700 dark:text-sky-300 text-xs">
                {displayName.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="font-medium">{displayName}</p>
          <p className="text-xs text-muted-foreground">{shortPubkey}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Friends using HomeLog section
interface FriendsUsingHomeLogProps {
  friends: { pubkey: string; eventCount: number }[];
  isLoading: boolean;
}

function FriendsUsingHomeLog({ friends, isLoading }: FriendsUsingHomeLogProps) {
  if (isLoading) {
    return (
      <Card className="bg-white dark:bg-slate-800 border-sky-200 dark:border-slate-700">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <UserCheck className="h-5 w-5 text-sky-600 dark:text-sky-400" />
            <span>Friends Using Home Log</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Skeleton className="h-10 w-10 rounded-full" />
            <Skeleton className="h-10 w-10 rounded-full" />
            <Skeleton className="h-10 w-10 rounded-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (friends.length === 0) {
    return (
      <Card className="bg-white dark:bg-slate-800 border-sky-200 dark:border-slate-700">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <UserCheck className="h-5 w-5 text-sky-600 dark:text-sky-400" />
            <span>Friends Using Home Log</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            None of your follows are using Home Log yet. Share it with friends!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white dark:bg-slate-800 border-sky-200 dark:border-slate-700">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <UserCheck className="h-5 w-5 text-sky-600 dark:text-sky-400" />
          <span>Friends Using Home Log</span>
          <Badge variant="secondary" className="text-xs">
            {friends.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-1">
          {friends.slice(0, 12).map((friend) => (
            <FriendAvatar key={friend.pubkey} pubkey={friend.pubkey} />
          ))}
          {friends.length > 12 && (
            <div className="flex items-center justify-center h-10 w-10 rounded-full bg-sky-100 dark:bg-sky-900 text-sky-700 dark:text-sky-300 text-xs font-medium">
              +{friends.length - 12}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
