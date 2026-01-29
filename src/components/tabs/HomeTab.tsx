/**
 * HomeTab - Dashboard/Home Tab
 * 
 * NOTE: The "My Stuff" widget (previously "Appliances") uses "appliance" 
 * terminology in the code/data model for backwards compatibility.
 * 
 * UI Label: "My Stuff"
 * Code/Data: "appliance" / "appliances"
 */
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
  PawPrint,
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
  DollarSign,
  CheckCircle2,
  Tag,
  EyeOff,
  Eye
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
import { useCompanies } from '@/hooks/useCompanies';
import { useSubscriptions } from '@/hooks/useSubscriptions';
import { useWarranties, useExpiringWarranties, isWarrantyExpired, isWarrantyExpiringSoon, formatWarrantyTimeRemaining, parseWarrantyEndDate } from '@/hooks/useWarranties';
import { useMaintenance, useApplianceMaintenance, useVehicleMaintenance, calculateNextDueDate, formatDueDate, isOverdue, isDueSoon } from '@/hooks/useMaintenance';
import { useMaintenanceCompletions } from '@/hooks/useMaintenanceCompletions';
import { useTabPreferences, type TabId } from '@/hooks/useTabPreferences';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useCypherLogFriends } from '@/hooks/useCypherLogFriends';
import { useAuthor } from '@/hooks/useAuthor';
import { useDataSyncStatus } from '@/hooks/useDataSyncStatus';
import { useCurrency } from '@/hooks/useCurrency';
import { genUserName } from '@/lib/genUserName';
import { parseCurrencyAmount, formatCurrency, convertCurrency } from '@/lib/currency';
import { usePets } from '@/hooks/usePets';
import type { MaintenanceSchedule, Warranty } from '@/lib/types';

const TAB_ICONS: Record<TabId, React.ComponentType<{ className?: string }>> = {
  home: Home,
  appliances: Package,
  maintenance: Wrench,
  vehicles: Car,
  subscriptions: CreditCard,
  warranties: Shield,
  companies: Users,
  projects: FolderKanban,
  pets: PawPrint,
};

// Widget types for dashboard - each active tab can have one or more widgets
type WidgetId = 
  | 'appliances'
  | 'vehicles' 
  | 'companies'
  | 'home-maintenance'
  | 'vehicle-maintenance'
  | 'subscriptions'
  | 'warranties'
  | 'projects'
  | 'pets';

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
  { id: 'appliances', tabId: 'appliances', label: 'My Stuff', icon: Package, colSpan: 1 },
  { id: 'vehicles', tabId: 'vehicles', label: 'Vehicles', icon: Car, colSpan: 1 },
  { id: 'companies', tabId: 'companies', label: 'Companies & Services', icon: Users, colSpan: 1 },
  { id: 'home-maintenance', tabId: 'maintenance', label: 'Upcoming Home Maintenance', icon: Home, colSpan: 1 },
  { id: 'vehicle-maintenance', tabId: 'maintenance', label: 'Upcoming Vehicle Maintenance', icon: Car, colSpan: 1 },
  { id: 'subscriptions', tabId: 'subscriptions', label: 'Subscriptions', icon: CreditCard, colSpan: 1 },
  { id: 'warranties', tabId: 'warranties', label: 'Warranties', icon: Shield, colSpan: 1 },
  { id: 'projects', tabId: 'projects', label: 'Projects', icon: FolderKanban, colSpan: 1 },
  { id: 'pets', tabId: 'pets', label: 'Pets & Animals', icon: PawPrint, colSpan: 1 },
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
  const { data: companies = [], isLoading: isLoadingCompanies } = useCompanies();
  const { data: subscriptions = [], isLoading: isLoadingSubscriptions } = useSubscriptions();
  const { data: warranties = [], isLoading: isLoadingWarranties } = useWarranties();
  const { data: pets = [], isLoading: isLoadingPets } = usePets();
  const expiringWarranties = useExpiringWarranties(365); // Get warranties expiring within a year
  const { data: maintenance = [], isLoading: isLoadingMaintenance } = useMaintenance();
  const { data: completions = [] } = useMaintenanceCompletions();
  const applianceMaintenance = useApplianceMaintenance();
  const vehicleMaintenance = useVehicleMaintenance();
  
  // Track data sync status for showing loading states
  const { isSyncing: isDataSyncing, isSynced: isDataSynced, categories: syncCategories } = useDataSyncStatus();
  
  // Currency preferences
  const { entryCurrency, displayCurrency, hasRates, rates } = useCurrency();
  
  // Show loading if:
  // 1. TanStack query is loading, OR
  // 2. Data sync is in progress AND we have no data yet AND sync hasn't completed
  const showAppliancesLoading = isLoadingAppliances || (isDataSyncing && appliances.length === 0 && !syncCategories.appliances.synced);
  const showVehiclesLoading = isLoadingVehicles || (isDataSyncing && vehicles.length === 0 && !syncCategories.vehicles.synced);
  const showCompaniesLoading = isLoadingCompanies || (isDataSyncing && companies.length === 0 && !syncCategories.companies.synced);
  const showSubscriptionsLoading = isLoadingSubscriptions || (isDataSyncing && subscriptions.length === 0 && !syncCategories.subscriptions.synced);
  const showMaintenanceLoading = isLoadingMaintenance || (isDataSyncing && maintenance.length === 0 && !syncCategories.maintenance.synced);
  const showWarrantiesLoading = isLoadingWarranties || (isDataSyncing && warranties.length === 0 && !syncCategories.warranties?.synced);
  const showPetsLoading = isLoadingPets || (isDataSyncing && pets.length === 0 && !syncCategories.pets?.synced);
  
  // Discover friends using HomeLog
  const { friends: cypherLogFriends, isLoading: isLoadingFriends } = useCypherLogFriends();
  
  // Get next 3 warranties about to expire sorted by expiration date
  const nextExpiringWarranties = useMemo(() => {
    // Get all warranties with end dates, sorted by expiration
    const warrantiesWithDates = warranties
      .map(warranty => ({
        warranty,
        endDate: parseWarrantyEndDate(warranty),
        expired: isWarrantyExpired(warranty),
        expiringSoon: isWarrantyExpiringSoon(warranty),
      }))
      .filter(w => w.endDate !== null && !w.expired) // Exclude expired and those without dates
      .sort((a, b) => {
        if (!a.endDate) return 1;
        if (!b.endDate) return -1;
        return a.endDate.getTime() - b.endDate.getTime();
      });
    
    return warrantiesWithDates.slice(0, 3);
  }, [warranties]);
  
  // Get count of expired warranties
  const expiredWarrantiesCount = useMemo(() => {
    return warranties.filter(w => isWarrantyExpired(w)).length;
  }, [warranties]);
  
  // Helper to get warranty icon based on linked type
  const getWarrantyTypeIcon = (warranty: Warranty) => {
    if (warranty.linkedType === 'appliance') return Package;
    if (warranty.linkedType === 'vehicle') return Car;
    if (warranty.linkedType === 'home_feature') return Home;
    if (warranty.linkedType === 'custom') return Tag;
    return Shield;
  };
  
  // Get linked item name for warranty
  const getWarrantyLinkedItemName = (warranty: Warranty): string | null => {
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

  // Edit mode for reordering dashboard cards
  const [isEditMode, setIsEditMode] = useState(false);
  const [draggedWidget, setDraggedWidget] = useState<WidgetId | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null); // Index where the card will be inserted
  const [dragPosition, setDragPosition] = useState<{ x: number; y: number } | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [draggedWidgetSize, setDraggedWidgetSize] = useState<{ width: number; height: number } | null>(null);
  const widgetRefs = useRef<Map<WidgetId, HTMLDivElement>>(new Map());
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Long press state for touch drag (allows scrolling with quick swipes)
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const pendingDragWidgetRef = useRef<WidgetId | null>(null);
  const [isLongPressing, setIsLongPressing] = useState(false);
  const LONG_PRESS_DURATION = 300; // ms to hold before drag starts
  const LONG_PRESS_MOVE_THRESHOLD = 10; // px movement allowed during long press
  
  // Widget order state - stored separately from tab order
  const [widgetOrder, setWidgetOrder] = useLocalStorage<WidgetId[]>('cypherlog-widget-order', []);
  
  // Hidden widgets state - widgets user has chosen to hide
  const [hiddenWidgets, setHiddenWidgets] = useLocalStorage<WidgetId[]>('cypherlog-hidden-widgets', []);
  
  // Generate random animation parameters for each widget (persist across renders)
  // This creates the iOS-style "fake randomness" effect
  const [animationParams] = useState<Map<WidgetId, { delay: number; duration: number }>>(() => {
    const params = new Map<WidgetId, { delay: number; duration: number }>();
    const allWidgets: WidgetId[] = ['appliances', 'vehicles', 'companies', 'home-maintenance', 'vehicle-maintenance', 'subscriptions', 'warranties', 'projects', 'pets'];
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

  // Get home maintenance tasks due within 6 months, sorted by due date
  const upcomingHomeMaintenance = useMemo(() => {
    const sixMonthsFromNow = new Date();
    sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6);
    
    const tasks = applianceMaintenance.map(maint => {
      const appliance = appliances.find(a => a.id === maint.applianceId);
      return {
        ...getMaintenanceWithDueDate(maint, appliance?.purchaseDate),
        appliance,
      };
    });
    
    // Filter to only include tasks due within 6 months (or overdue), then sort
    return tasks
      .filter(task => {
        if (!task.dueDate) return false;
        // Include if overdue or within 6 months
        return task.dueDate <= sixMonthsFromNow;
      })
      .sort((a, b) => {
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return a.dueDate.getTime() - b.dueDate.getTime();
      })
      .slice(0, 5);
  }, [applianceMaintenance, appliances, completions]);

  // Get vehicle maintenance tasks due within 6 months, sorted by due date
  const upcomingVehicleMaintenance = useMemo(() => {
    const sixMonthsFromNow = new Date();
    sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6);
    
    const tasks = vehicleMaintenance.map(maint => {
      const vehicle = vehicles.find(v => v.id === maint.vehicleId);
      return {
        ...getMaintenanceWithDueDate(maint, vehicle?.purchaseDate),
        vehicle,
      };
    });
    
    // Filter to only include tasks due within 6 months (or overdue), then sort
    return tasks
      .filter(task => {
        if (!task.dueDate) return false;
        // Include if overdue or within 6 months
        return task.dueDate <= sixMonthsFromNow;
      })
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

// Get unique company types from companies
  const usedCompanyTypes = useMemo(() => {
    const types = new Set<string>();
    companies.forEach(company => {
      if (company.serviceType) {
        types.add(company.serviceType);
      }
    });
    return Array.from(types).sort((a, b) => {
      if (a === 'Uncategorized' || a === 'Other') return 1;
      if (b === 'Uncategorized' || b === 'Other') return -1;
      return a.localeCompare(b);
    });
  }, [companies]);

  // Get unique subscription types from subscriptions
  const usedSubscriptionTypes = useMemo(() => {
    const types = new Set<string>();
    subscriptions.forEach(sub => {
      if (sub.subscriptionType) {
        types.add(sub.subscriptionType);
      }
    });
    return Array.from(types).sort((a, b) => {
      if (a === 'Uncategorized' || a === 'Other') return 1;
      if (b === 'Uncategorized' || b === 'Other') return -1;
      return a.localeCompare(b);
    });
  }, [subscriptions]);

  // Get unique warranty types from warranties
  const usedWarrantyTypes = useMemo(() => {
    const types = new Set<string>();
    warranties.forEach(warranty => {
      if (warranty.warrantyType) {
        types.add(warranty.warrantyType);
      }
    });
    return Array.from(types).sort((a, b) => {
      if (a === 'Uncategorized' || a === 'Other') return 1;
      if (b === 'Uncategorized' || b === 'Other') return -1;
      return a.localeCompare(b);
    });
  }, [warranties]);

  // Get unique pet types from pets (filter out archived)
  const activePets = useMemo(() => pets.filter(p => !p.isArchived), [pets]);
  const usedPetTypes = useMemo(() => {
    const types = new Set<string>();
    activePets.forEach(pet => {
      if (pet.petType) {
        types.add(pet.petType);
      }
    });
    return Array.from(types).sort((a, b) => {
      if (a === 'Uncategorized' || a === 'Other') return 1;
      if (b === 'Uncategorized' || b === 'Other') return -1;
      return a.localeCompare(b);
    });
  }, [activePets]);

  // Calculate total monthly cost estimate for subscriptions with currency conversion
  const { totalMonthlyCost, formattedTotalMonthlyCost } = useMemo(() => {
    let total = 0;
    for (const sub of subscriptions) {
      // Extract numeric value from cost string
      const numericCost = parseCurrencyAmount(sub.cost);
      const subCurrency = sub.currency || entryCurrency;
      
      // Convert to display currency if rates are available
      let costInDisplayCurrency = numericCost;
      if (hasRates && subCurrency !== displayCurrency) {
        costInDisplayCurrency = convertCurrency(numericCost, subCurrency, displayCurrency, rates);
      }
      
      // Convert to monthly equivalent
      switch (sub.billingFrequency) {
        case 'weekly':
          total += costInDisplayCurrency * 4.33; // Average weeks per month
          break;
        case 'monthly':
          total += costInDisplayCurrency;
          break;
        case 'quarterly':
          total += costInDisplayCurrency / 3;
          break;
        case 'semi-annually':
          total += costInDisplayCurrency / 6;
          break;
        case 'annually':
          total += costInDisplayCurrency / 12;
          break;
        case 'one-time':
          // Don't add one-time costs to monthly
          break;
      }
    }
    return {
      totalMonthlyCost: total,
      formattedTotalMonthlyCost: formatCurrency(total, displayCurrency),
    };
  }, [subscriptions, entryCurrency, displayCurrency, hasRates, rates]);

  // Get ordered list of active widgets based on active tabs (excluding hidden)
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
    let orderedWidgets: WidgetId[];
    if (widgetOrder.length > 0) {
      orderedWidgets = widgetOrder.filter(w => widgetsFromTabs.includes(w));
      // Add any new widgets not in the stored order
      const missingWidgets = widgetsFromTabs.filter(w => !widgetOrder.includes(w));
      orderedWidgets = [...orderedWidgets, ...missingWidgets];
    } else {
      orderedWidgets = widgetsFromTabs;
    }
    
    // Filter out hidden widgets
    return orderedWidgets.filter(w => !hiddenWidgets.includes(w));
  }, [preferences.activeTabs, widgetOrder, hiddenWidgets]);

  // Get list of hidden widgets that could be shown (from active tabs)
  const hiddenActiveWidgets = useMemo((): WidgetId[] => {
    const widgetsFromTabs: WidgetId[] = [];
    preferences.activeTabs.forEach(tabId => {
      if (tabId === 'maintenance') {
        widgetsFromTabs.push('home-maintenance', 'vehicle-maintenance');
      } else {
        widgetsFromTabs.push(tabId as WidgetId);
      }
    });
    return hiddenWidgets.filter(w => widgetsFromTabs.includes(w));
  }, [preferences.activeTabs, hiddenWidgets]);

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
    
    // Find the best drop position based on cursor location
    const draggedIndex = activeWidgets.indexOf(draggedWidget);
    let bestDropIndex: number | null = null;
    let bestDistance = Infinity;
    
    // Check each widget to find the closest drop zone
    activeWidgets.forEach((widgetId, index) => {
      if (widgetId === draggedWidget) return;
      
      const element = widgetRefs.current.get(widgetId);
      if (!element) return;
      
      const rect = element.getBoundingClientRect();
      const midY = rect.top + rect.height / 2;
      
      // Check if cursor is above the midpoint of this card
      if (clientY < midY) {
        const distance = Math.abs(clientY - rect.top);
        if (distance < bestDistance) {
          bestDistance = distance;
          // If dragging from above, insert at this index; if from below, same index
          bestDropIndex = index;
        }
      } else {
        const distance = Math.abs(clientY - rect.bottom);
        if (distance < bestDistance) {
          bestDistance = distance;
          // Insert after this card
          bestDropIndex = index + 1;
        }
      }
    });
    
    // Adjust drop index if we're dragging from before the drop point
    if (bestDropIndex !== null && draggedIndex < bestDropIndex) {
      bestDropIndex = bestDropIndex - 1;
    }
    
    // Don't show drop indicator at the dragged item's current position
    if (bestDropIndex === draggedIndex) {
      bestDropIndex = null;
    }
    
    setDropIndex(bestDropIndex);
  }, [draggedWidget, activeWidgets]);

  // Shared drag end logic for both mouse and touch
  const endDrag = useCallback(() => {
    if (!draggedWidget) return;
    
    // Stop auto-scroll
    if (autoScrollRef.current) {
      cancelAnimationFrame(autoScrollRef.current);
      autoScrollRef.current = null;
    }
    
    // If we have a valid drop index, perform the reorder
    if (dropIndex !== null) {
      const currentOrder = [...activeWidgets];
      const draggedIndex = currentOrder.indexOf(draggedWidget);

      if (draggedIndex !== -1 && dropIndex !== draggedIndex) {
        // Remove dragged item
        currentOrder.splice(draggedIndex, 1);
        // Insert at new position (adjust if needed after removal)
        const insertIndex = dropIndex > draggedIndex ? dropIndex : dropIndex;
        currentOrder.splice(insertIndex, 0, draggedWidget);
        setWidgetOrder(currentOrder);
      }
    }
    
    // Reset drag state
    setDraggedWidget(null);
    setDropIndex(null);
    setDragPosition(null);
    setDraggedWidgetSize(null);
  }, [draggedWidget, dropIndex, activeWidgets, setWidgetOrder]);

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

  // Cancel any pending long press
  const cancelLongPress = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    touchStartPosRef.current = null;
    pendingDragWidgetRef.current = null;
    setIsLongPressing(false);
  }, []);

  // Touch-based drag and drop handlers for mobile
  // Uses long-press to initiate drag, allowing normal scrolling with quick swipes
  const handleTouchStart = useCallback((e: React.TouchEvent, widgetId: WidgetId) => {
    if (!isEditMode) return;
    
    const touch = e.touches[0];
    if (!touch) return;
    
    // Store touch start position and widget for potential long press
    touchStartPosRef.current = { x: touch.clientX, y: touch.clientY };
    pendingDragWidgetRef.current = widgetId;
    
    // Start long press timer
    longPressTimerRef.current = setTimeout(() => {
      // Long press detected - start dragging
      if (touchStartPosRef.current && pendingDragWidgetRef.current) {
        setIsLongPressing(false);
        startDrag(touchStartPosRef.current.x, touchStartPosRef.current.y, pendingDragWidgetRef.current);
      }
      longPressTimerRef.current = null;
    }, LONG_PRESS_DURATION);
    
    setIsLongPressing(true);
    
    // Don't prevent default here - allow scrolling until long press is confirmed
  }, [isEditMode, startDrag]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    const touch = e.touches[0];
    if (!touch) return;
    
    // If we're actively dragging, handle the drag
    if (draggedWidget) {
      moveDrag(touch.clientX, touch.clientY);
      // Prevent scrolling while dragging
      e.preventDefault();
      return;
    }
    
    // If we're waiting for long press, check if user moved too much (they want to scroll)
    if (touchStartPosRef.current && longPressTimerRef.current) {
      const dx = Math.abs(touch.clientX - touchStartPosRef.current.x);
      const dy = Math.abs(touch.clientY - touchStartPosRef.current.y);
      
      if (dx > LONG_PRESS_MOVE_THRESHOLD || dy > LONG_PRESS_MOVE_THRESHOLD) {
        // User moved too much - they want to scroll, cancel long press
        cancelLongPress();
      }
    }
  }, [draggedWidget, moveDrag, cancelLongPress]);

  const handleTouchEnd = useCallback(() => {
    // Cancel any pending long press
    cancelLongPress();
    // End any active drag
    endDrag();
  }, [cancelLongPress, endDrag]);

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
  // Listen when dragging OR when waiting for long press (to detect scroll attempts)
  useEffect(() => {
    const shouldListen = draggedWidget || isLongPressing;
    
    if (shouldListen) {
      // Use passive: false to allow preventDefault on touchmove when actively dragging
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleTouchEnd);
      document.addEventListener('touchcancel', handleTouchEnd);
    }
    
    return () => {
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [draggedWidget, isLongPressing, handleTouchMove, handleTouchEnd]);
  
  // Cleanup long press timer on unmount
  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
    };
  }, []);

  // Hide a widget
  const hideWidget = useCallback((widgetId: WidgetId) => {
    if (!hiddenWidgets.includes(widgetId)) {
      setHiddenWidgets([...hiddenWidgets, widgetId]);
    }
  }, [hiddenWidgets, setHiddenWidgets]);

  // Unhide a widget
  const unhideWidget = useCallback((widgetId: WidgetId) => {
    setHiddenWidgets(hiddenWidgets.filter(w => w !== widgetId));
  }, [hiddenWidgets, setHiddenWidgets]);

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
      {/* Show if: has tabs AND (more than 1 visible widget OR has hidden widgets to potentially restore) */}
      {hasActiveTabs && (activeWidgets.length > 1 || hiddenActiveWidgets.length > 0) && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsEditMode(!isEditMode)}
          className={cn(
            "fixed right-4 top-40 z-40 gap-1.5 px-3 py-2 h-auto rounded-lg shadow-lg",
            isEditMode
              ? "bg-rose-600 text-white hover:bg-rose-700 border border-rose-700"
              : "bg-card text-muted-foreground hover:bg-primary/10 hover:text-primary border border-border"
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
          <h2 className="text-2xl font-bold text-foreground flex items-center justify-center gap-2">
            <Home className="h-6 w-6 text-primary" />
            Dashboard
          </h2>
          <p className="text-muted-foreground mt-1">
            Overview of your Home
          </p>
        </div>
      </div>

      {/* No tabs added yet */}
      {!hasActiveTabs && (
        <Card className="bg-theme-gradient-card border-border">
          <CardContent className="py-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/20 mb-4">
              <Sparkles className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">
              Get Started
            </h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Add sections to start tracking your home appliances, vehicles, maintenance schedules, and more.
            </p>
            <Button
              onClick={onAddTab}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              Add Your First Section
            </Button>
          </CardContent>
        </Card>
      )}

{/* Dashboard widgets - masonry layout with consistent spacing */}
      {hasActiveTabs && (
        <div ref={containerRef} className="columns-1 md:columns-2 gap-4 space-y-4">
          {activeWidgets.map((widgetId, index) => {
            const draggedIndex = draggedWidget ? activeWidgets.indexOf(draggedWidget) : -1;
            // Show drop indicator before this card if dropIndex matches
            // Account for the removed dragged item when calculating display position
            const showDropBefore = dropIndex !== null && draggedWidget && (
              draggedIndex < index 
                ? dropIndex === index - 1 
                : dropIndex === index
            );
            const config = getWidgetConfig(widgetId);
            if (!config) return null;
            
            const isDragging = draggedWidget === widgetId;
            
            // Render widget content based on type
            const renderWidgetContent = () => {
              switch (widgetId) {
                case 'appliances':
                  return (
                    <WidgetCard
                      title="My Stuff"
                      icon={Package}
                      onClick={() => !isEditMode && onNavigateToTab('appliances')}
                      isLoading={showAppliancesLoading}
                      clickable={!isEditMode}
                    >
                      {appliances.length === 0 ? (
                        <p className="text-muted-foreground text-sm">No items tracked yet</p>
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
                                  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-primary/10 text-primary transition-colors",
                                  !isEditMode && "hover:bg-primary/20"
                                )}
                              >
                                <Home className="h-3.5 w-3.5" />
                                {room}
                                <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0 bg-primary/20">
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
                      isLoading={showVehiclesLoading}
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
                                  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-primary/10 text-primary transition-colors",
                                  !isEditMode && "hover:bg-primary/20"
                                )}
                              >
                                <Car className="h-3.5 w-3.5" />
                                {type}
                                <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0 bg-primary/20">
                                  {count}
                                </Badge>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </WidgetCard>
                  );
                  
                case 'companies':
                  return (
                    <WidgetCard
                      title="Companies & Services"
                      icon={Users}
                      onClick={() => !isEditMode && onNavigateToTab('companies')}
                      isLoading={showCompaniesLoading}
                      clickable={!isEditMode}
                    >
                      {companies.length === 0 ? (
                        <p className="text-muted-foreground text-sm">No companies added yet</p>
                      ) : usedCompanyTypes.length === 0 ? (
                        <p className="text-muted-foreground text-sm">No service types assigned yet</p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {usedCompanyTypes.slice(0, 6).map(type => {
                            const count = companies.filter(c => c.serviceType === type).length;
                            return (
                              <button
                                key={type}
                                onClick={(e) => {
                                  if (isEditMode) {
                                    e.stopPropagation();
                                    return;
                                  }
                                  e.stopPropagation();
                                  onNavigateToTab('companies', `type-${type}`);
                                }}
                                disabled={isEditMode}
                                className={cn(
                                  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-primary/10 text-primary transition-colors",
                                  !isEditMode && "hover:bg-primary/20"
                                )}
                              >
                                <Users className="h-3.5 w-3.5" />
                                {type}
                                <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0 bg-primary/20">
                                  {count}
                                </Badge>
                              </button>
                            );
                          })}
                          {usedCompanyTypes.length > 6 && (
                            <span className="text-sm text-muted-foreground self-center">
                              +{usedCompanyTypes.length - 6} more
                            </span>
                          )}
                        </div>
                      )}
                    </WidgetCard>
                  );
                  
                case 'home-maintenance':
                  return (
                    <WidgetCard
                      title="Upcoming Home Maintenance"
                      icon={Home}
                      onClick={() => !isEditMode && onNavigateToTab('maintenance', 'home-maintenance')}
                      isLoading={showMaintenanceLoading}
                      clickable={!isEditMode}
                      badge={upcomingHomeMaintenance.filter(m => m.isOverdue).length > 0 ? {
                        text: `${upcomingHomeMaintenance.filter(m => m.isOverdue).length} overdue`,
                        variant: 'destructive' as const,
                      } : undefined}
                    >
                      {upcomingHomeMaintenance.length === 0 ? (
                        <p className="text-muted-foreground text-sm">No maintenance needed in the next 6 months</p>
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
                                  {appliance?.model 
                                    ? (maint.homeFeature ? `${appliance.model} - ${maint.homeFeature}` : appliance.model)
                                    : (maint.homeFeature || 'Home')}
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
                      title="Upcoming Vehicle Maintenance"
                      icon={Car}
                      onClick={() => !isEditMode && onNavigateToTab('maintenance', 'vehicle-maintenance')}
                      isLoading={showMaintenanceLoading || showVehiclesLoading}
                      clickable={!isEditMode}
                      badge={upcomingVehicleMaintenance.filter(m => m.isOverdue).length > 0 ? {
                        text: `${upcomingVehicleMaintenance.filter(m => m.isOverdue).length} overdue`,
                        variant: 'destructive' as const,
                      } : undefined}
                    >
                      {upcomingVehicleMaintenance.length === 0 ? (
                        <p className="text-muted-foreground text-sm">No maintenance needed in the next 6 months</p>
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
                                  {vehicle?.name || 'Vehicle'}
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
                  
                case 'subscriptions':
                  return (
                    <WidgetCard
                      title="Subscriptions"
                      icon={CreditCard}
                      onClick={() => !isEditMode && onNavigateToTab('subscriptions')}
                      isLoading={showSubscriptionsLoading}
                      clickable={!isEditMode}
                    >
                      {subscriptions.length === 0 ? (
                        <p className="text-muted-foreground text-sm">No subscriptions tracked yet</p>
                      ) : (
                        <div className="space-y-3">
                          {/* Monthly Cost Summary at top */}
                          <div className="flex items-center gap-2 p-2 rounded-lg bg-primary/10">
                            <DollarSign className="h-4 w-4 text-primary" />
                            <span className="text-sm text-muted-foreground">Est. Monthly:</span>
                            <span className="font-bold text-primary ml-auto">{formattedTotalMonthlyCost}</span>
                          </div>
                          
                          {/* Subscription type buttons */}
                          {usedSubscriptionTypes.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {usedSubscriptionTypes.slice(0, 6).map(type => {
                                const count = subscriptions.filter(s => s.subscriptionType === type).length;
                                return (
                                  <button
                                    key={type}
                                    onClick={(e) => {
                                      if (isEditMode) {
                                        e.stopPropagation();
                                        return;
                                      }
                                      e.stopPropagation();
                                      onNavigateToTab('subscriptions', `type-${type}`);
                                    }}
                                    disabled={isEditMode}
                                    className={cn(
                                      "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-primary/10 text-primary transition-colors",
                                      !isEditMode && "hover:bg-primary/20"
                                    )}
                                  >
                                    <CreditCard className="h-3.5 w-3.5" />
                                    {type}
                                    <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0 bg-primary/20">
                                      {count}
                                    </Badge>
                                  </button>
                                );
                              })}
                              {usedSubscriptionTypes.length > 6 && (
                                <span className="text-sm text-muted-foreground self-center">
                                  +{usedSubscriptionTypes.length - 6} more
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </WidgetCard>
                  );

                case 'warranties':
                  return (
                    <WidgetCard
                      title="Warranties"
                      icon={Shield}
                      onClick={() => !isEditMode && onNavigateToTab('warranties')}
                      isLoading={showWarrantiesLoading}
                      clickable={!isEditMode}
                      badge={expiredWarrantiesCount > 0 ? {
                        text: `${expiredWarrantiesCount} expired`,
                        variant: 'destructive' as const,
                      } : undefined}
                    >
                      {warranties.length === 0 ? (
                        <p className="text-muted-foreground text-sm">No warranties tracked yet</p>
                      ) : (
                        <div className="space-y-3">
                          {/* Warranty status section */}
                          {nextExpiringWarranties.length === 0 ? (
                            <div className="flex items-center gap-2 p-2 rounded-lg bg-green-50 dark:bg-green-900/30">
                              <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                              <span className="text-sm text-green-700 dark:text-green-300">All warranties are far from expiring</span>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {nextExpiringWarranties.map(({ warranty, expiringSoon }) => {
                                const WarrantyIcon = getWarrantyTypeIcon(warranty);
                                const linkedName = getWarrantyLinkedItemName(warranty);
                                const timeRemaining = formatWarrantyTimeRemaining(warranty);
                                
                                return (
                                  <div
                                    key={warranty.id}
                                    className={cn(
                                      "flex items-center justify-between text-sm p-2 rounded-lg",
                                      expiringSoon 
                                        ? 'bg-amber-50 dark:bg-amber-900/30' 
                                        : 'bg-slate-50 dark:bg-slate-700/30'
                                    )}
                                  >
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                      <WarrantyIcon className={cn(
                                        "h-4 w-4 shrink-0",
                                        expiringSoon ? "text-amber-600 dark:text-amber-400" : "text-primary"
                                      )} />
                                      <div className="min-w-0">
                                        <p className="font-medium text-slate-700 dark:text-slate-200 truncate">
                                          {warranty.name}
                                        </p>
                                        {linkedName && (
                                          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                            {linkedName}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                    <div className="text-right shrink-0 ml-2">
                                      <p className={cn(
                                        "text-xs font-medium",
                                        expiringSoon
                                          ? 'text-amber-600 dark:text-amber-400'
                                          : 'text-slate-600 dark:text-slate-300'
                                      )}>
                                        {timeRemaining}
                                      </p>
                                    </div>
                                  </div>
                                );
                              })}
                              {warranties.length > 3 && (
                                <p className="text-xs text-muted-foreground text-center">
                                  +{warranties.length - 3} more warranties
                                </p>
                              )}
                            </div>
                          )}
                          
                          {/* Warranty type buttons */}
                          {usedWarrantyTypes.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {usedWarrantyTypes.slice(0, 6).map(type => {
                                const count = warranties.filter(w => w.warrantyType === type).length;
                                return (
                                  <button
                                    key={type}
                                    onClick={(e) => {
                                      if (isEditMode) {
                                        e.stopPropagation();
                                        return;
                                      }
                                      e.stopPropagation();
                                      onNavigateToTab('warranties', `type-${type}`);
                                    }}
                                    disabled={isEditMode}
                                    className={cn(
                                      "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-primary/10 text-primary transition-colors",
                                      !isEditMode && "hover:bg-primary/20"
                                    )}
                                  >
                                    <Shield className="h-3.5 w-3.5" />
                                    {type}
                                    <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0 bg-primary/20">
                                      {count}
                                    </Badge>
                                  </button>
                                );
                              })}
                              {usedWarrantyTypes.length > 6 && (
                                <span className="text-sm text-muted-foreground self-center">
                                  +{usedWarrantyTypes.length - 6} more
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </WidgetCard>
                  );

                case 'pets':
                  return (
                    <WidgetCard
                      title="Pets & Animals"
                      icon={PawPrint}
                      onClick={() => !isEditMode && onNavigateToTab('pets')}
                      isLoading={showPetsLoading}
                      clickable={!isEditMode}
                    >
                      {activePets.length === 0 ? (
                        <p className="text-muted-foreground text-sm">No pets added yet</p>
                      ) : usedPetTypes.length === 0 ? (
                        <p className="text-muted-foreground text-sm">No pet types assigned yet</p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {usedPetTypes.map(type => {
                            const count = activePets.filter(p => p.petType === type).length;
                            return (
                              <button
                                key={type}
                                onClick={(e) => {
                                  if (isEditMode) {
                                    e.stopPropagation();
                                    return;
                                  }
                                  e.stopPropagation();
                                  onNavigateToTab('pets', `type-${type}`);
                                }}
                                disabled={isEditMode}
                                className={cn(
                                  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-primary/10 text-primary transition-colors",
                                  !isEditMode && "hover:bg-primary/20"
                                )}
                              >
                                <PawPrint className="h-3.5 w-3.5" />
                                {type}
                                <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0 bg-primary/20">
                                  {count}
                                </Badge>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </WidgetCard>
                  );

                // Coming soon widgets
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
              <div key={widgetId} className="break-inside-avoid">
                {/* Drop indicator before this card */}
                {showDropBefore && (
                  <div className="h-1 bg-primary rounded-full mb-4 mx-2 animate-pulse" />
                )}
                <div
                  ref={(el) => {
                    if (el) {
                      widgetRefs.current.set(widgetId, el);
                    } else {
                      widgetRefs.current.delete(widgetId);
                    }
                  }}
                  className={cn(
                    "relative transition-transform",
                    isDragging && "dashboard-card-placeholder",
                    isEditMode && !isDragging && getWiggleClass(index),
                    isEditMode && !isDragging && "cursor-grab",
                    // Only use touch-none when actively dragging to allow scrolling otherwise
                    draggedWidget && "touch-none",
                    // Visual feedback when this widget is being long-pressed
                    isLongPressing && pendingDragWidgetRef.current === widgetId && "scale-[1.02] shadow-lg"
                  )}
                  style={isEditMode && !isDragging ? getAnimationStyle(widgetId) : undefined}
                  onMouseDown={(e) => handleMouseDown(e, widgetId)}
                  onTouchStart={(e) => handleTouchStart(e, widgetId)}
                >
                {/* Edit mode overlay with hide button and drag handle */}
                {isEditMode && (
                  <div className="absolute top-2 right-2 z-10 flex items-center gap-1">
                    {/* Hide button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        hideWidget(widgetId);
                      }}
                      className="p-1.5 rounded-lg bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 active:bg-rose-500/30 transition-colors"
                      title="Hide widget"
                    >
                      <EyeOff className="h-4 w-4" />
                    </button>
                    {/* Drag handle */}
                    <div className="p-1.5 rounded-lg bg-primary/10">
                      <GripVertical className="h-4 w-4 text-primary" />
                    </div>
                  </div>
                )}
                {renderWidgetContent()}
              </div>
              </div>
            );
          })}
          {/* Drop indicator at the end of the list */}
          {dropIndex !== null && draggedWidget && dropIndex === activeWidgets.length - 1 && activeWidgets.indexOf(draggedWidget) < activeWidgets.length - 1 && (
            <div className="break-inside-avoid">
              <div className="h-1 bg-primary rounded-full mx-2 animate-pulse" />
            </div>
          )}
        </div>
      )}

      {/* Hidden widgets section - only shown in edit mode when there are hidden widgets */}
      {isEditMode && hiddenActiveWidgets.length > 0 && (
        <Card className="bg-card/50 border-dashed border-2 border-muted-foreground/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <EyeOff className="h-4 w-4" />
              Hidden Widgets
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex flex-wrap gap-2">
              {hiddenActiveWidgets.map(widgetId => {
                const config = getWidgetConfig(widgetId);
                if (!config) return null;
                const IconComponent = config.icon;
                return (
                  <button
                    key={widgetId}
                    onClick={() => unhideWidget(widgetId)}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <IconComponent className="h-4 w-4" />
                    <span className="text-sm">{config.label}</span>
                    <Eye className="h-3.5 w-3.5 ml-1 text-primary" />
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Click a widget to show it again
            </p>
          </CardContent>
        </Card>
      )}

      {/* Friends using HomeLog */}
      {hasActiveTabs && (
        <FriendsUsingHomeLog 
          friends={cypherLogFriends} 
          isLoading={isLoadingFriends} 
        />
      )}

      {/* Floating dragged widget that follows cursor */}
      {draggedWidget && dragPosition && draggedWidgetSize && (
        <div
          className="dashboard-card-dragging rounded-xl bg-card border border-border overflow-hidden"
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
                    <IconComponent className="h-5 w-5 text-primary" />
                    <span className="font-semibold text-foreground">
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
      className={`bg-card border-border transition-shadow break-inside-avoid ${
        clickable ? 'cursor-pointer hover:shadow-md group' : ''
      }`}
      onClick={clickable ? onClick : undefined}
    >
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-base">
          <div className="flex items-center gap-2 min-w-0">
            <Icon className="h-5 w-5 text-primary flex-shrink-0" />
            <span className="truncate">{title}</span>
            {badge && (
              <Badge variant={badge.variant} className="text-xs flex-shrink-0">
                {badge.text}
              </Badge>
            )}
          </div>
          {clickable && (
            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0 ml-2" />
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {/* Skeleton that mimics the category pill buttons */}
            <div className="flex flex-wrap gap-2">
              <Skeleton className="h-8 w-24 rounded-full" />
              <Skeleton className="h-8 w-20 rounded-full" />
              <Skeleton className="h-8 w-28 rounded-full" />
            </div>
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
              <AvatarFallback className="bg-primary/10 text-primary text-xs">
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
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <UserCheck className="h-5 w-5 text-primary" />
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
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <UserCheck className="h-5 w-5 text-primary" />
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
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <UserCheck className="h-5 w-5 text-primary" />
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
            <div className="flex items-center justify-center h-10 w-10 rounded-full bg-primary/10 text-primary text-xs font-medium">
              +{friends.length - 12}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
