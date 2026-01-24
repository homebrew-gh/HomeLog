import { createContext, useContext, useEffect, useRef, useCallback, type ReactNode } from 'react';
import { useNostr } from '@nostrify/react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNostrPublish } from '@/hooks/useNostrPublish';

// NIP-78: Application-specific data
const APP_DATA_KIND = 30078;
const APP_IDENTIFIER = 'homelog/preferences';

export type TabId = 
  | 'home'
  | 'appliances'
  | 'maintenance'
  | 'vehicles'
  | 'subscriptions'
  | 'warranties'
  | 'contractors'
  | 'projects';

export interface TabDefinition {
  id: TabId;
  label: string;
  icon: string;
  description: string;
}

export const AVAILABLE_TABS: TabDefinition[] = [
  { id: 'appliances', label: 'Appliances', icon: 'Package', description: 'Track home appliances and equipment' },
  { id: 'maintenance', label: 'Maintenance', icon: 'Wrench', description: 'Schedule and track maintenance tasks' },
  { id: 'vehicles', label: 'Vehicles', icon: 'Car', description: 'Manage vehicle information and maintenance' },
  { id: 'subscriptions', label: 'Subscriptions', icon: 'CreditCard', description: 'Track recurring subscriptions and payments' },
  { id: 'warranties', label: 'Warranties', icon: 'Shield', description: 'Store warranty information and expiration dates' },
  { id: 'contractors', label: 'Contractors/Services', icon: 'Users', description: 'Keep contact info for service providers' },
  { id: 'projects', label: 'Projects', icon: 'FolderKanban', description: 'Plan and track home improvement projects' },
];

export interface BlossomServer {
  url: string;
  enabled: boolean;
  /** Whether this server is trusted for sensitive/private uploads (receipts, documents, etc.) */
  isPrivate: boolean;
}

// Default server is public - users must configure a private server for sensitive uploads
export const DEFAULT_BLOSSOM_SERVERS: BlossomServer[] = [
  { url: 'https://blossom.primal.net/', enabled: true, isPrivate: false },
];

export interface UserPreferences {
  // Tab preferences
  activeTabs: TabId[];
  activeTab: TabId;
  // Dashboard card order (separate from tab order in navigation)
  dashboardCardOrder: TabId[];
  // View preferences
  appliancesViewMode: 'list' | 'card';
  vehiclesViewMode: 'list' | 'card';
  contractorsViewMode: 'list' | 'card';
  // Custom rooms
  customRooms: string[];
  // Hidden default rooms (allows users to "delete" default rooms)
  hiddenDefaultRooms: string[];
  // Custom vehicle types
  customVehicleTypes: string[];
  // Hidden default vehicle types
  hiddenDefaultVehicleTypes: string[];
  // Custom contractor/service types
  customContractorTypes: string[];
  // Hidden default contractor types
  hiddenDefaultContractorTypes: string[];
  // Blossom media servers
  blossomServers: BlossomServer[];
  // Version for future migrations
  version: number;
}

const DEFAULT_PREFERENCES: UserPreferences = {
  activeTabs: [],
  activeTab: 'home',
  dashboardCardOrder: [],
  appliancesViewMode: 'card',
  vehiclesViewMode: 'card',
  contractorsViewMode: 'card',
  customRooms: [],
  hiddenDefaultRooms: [],
  customVehicleTypes: [],
  hiddenDefaultVehicleTypes: [],
  customContractorTypes: [],
  hiddenDefaultContractorTypes: [],
  blossomServers: DEFAULT_BLOSSOM_SERVERS,
  version: 1,
};

interface UserPreferencesContextType {
  preferences: UserPreferences;
  isLoading: boolean;
  isSyncing: boolean;
  // Tab actions
  addTab: (tabId: TabId) => void;
  addTabs: (tabIds: TabId[]) => void;
  removeTab: (tabId: TabId) => void;
  setActiveTab: (tabId: TabId) => void;
  reorderTabs: (newOrder: TabId[]) => void;
  getTabDefinition: (tabId: TabId) => TabDefinition | undefined;
  getAvailableTabs: () => TabDefinition[];
  // Dashboard card actions
  reorderDashboardCards: (newOrder: TabId[]) => void;
  getDashboardCardOrder: () => TabId[];
  // View mode actions
  setAppliancesViewMode: (mode: 'list' | 'card') => void;
  setVehiclesViewMode: (mode: 'list' | 'card') => void;
  setContractorsViewMode: (mode: 'list' | 'card') => void;
  // Room actions
  addCustomRoom: (room: string) => void;
  removeCustomRoom: (room: string) => void;
  hideDefaultRoom: (room: string) => void;
  restoreDefaultRoom: (room: string) => void;
  // Vehicle type actions
  addCustomVehicleType: (type: string) => void;
  removeCustomVehicleType: (type: string) => void;
  hideDefaultVehicleType: (type: string) => void;
  restoreDefaultVehicleType: (type: string) => void;
  // Contractor type actions
  addCustomContractorType: (type: string) => void;
  removeCustomContractorType: (type: string) => void;
  hideDefaultContractorType: (type: string) => void;
  restoreDefaultContractorType: (type: string) => void;
  // Blossom server actions
  addBlossomServer: (url: string, isPrivate?: boolean) => void;
  removeBlossomServer: (url: string) => void;
  toggleBlossomServer: (url: string) => void;
  toggleBlossomServerPrivate: (url: string) => void;
  reorderBlossomServers: (servers: BlossomServer[]) => void;
  getEnabledBlossomServers: () => string[];
  getPrivateBlossomServers: () => string[];
  hasPrivateBlossomServer: () => boolean;
}

const UserPreferencesContext = createContext<UserPreferencesContextType | null>(null);

export function UserPreferencesProvider({ children }: { children: ReactNode }) {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const { mutateAsync: publishEvent } = useNostrPublish();
  const queryClient = useQueryClient();
  
  // Local storage for immediate persistence
  const [localPreferences, setLocalPreferences] = useLocalStorage<UserPreferences>(
    'homelog-user-preferences',
    DEFAULT_PREFERENCES
  );

  // Track if we've synced from remote on this session
  const hasSyncedFromRemote = useRef(false);
  const lastSyncedPubkey = useRef<string | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch preferences from Nostr
  const { data: remotePreferences, isLoading: isLoadingRemote, isFetched } = useQuery({
    queryKey: ['user-preferences', user?.pubkey],
    queryFn: async (c) => {
      if (!user?.pubkey) return null;

      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(5000)]);

      const events = await nostr.query(
        [
          {
            kinds: [APP_DATA_KIND],
            authors: [user.pubkey],
            '#d': [APP_IDENTIFIER],
            limit: 1,
          },
        ],
        { signal }
      );

      if (events.length === 0) {
        return null;
      }

      try {
        const preferences = JSON.parse(events[0].content) as UserPreferences;
        return preferences;
      } catch (error) {
        console.warn('Failed to parse user preferences from Nostr:', error);
        return null;
      }
    },
    enabled: !!user?.pubkey,
    staleTime: 60000,
  });

  // Sync remote preferences to local on login
  useEffect(() => {
    if (!user?.pubkey) {
      // User logged out, reset sync state
      hasSyncedFromRemote.current = false;
      lastSyncedPubkey.current = null;
      return;
    }

    // Check if we need to sync (new user or different user)
    if (lastSyncedPubkey.current !== user.pubkey) {
      hasSyncedFromRemote.current = false;
      lastSyncedPubkey.current = user.pubkey;
    }

    // If we have remote preferences and haven't synced yet, use them
    if (isFetched && !hasSyncedFromRemote.current) {
      if (remotePreferences) {
        console.log('Syncing preferences from Nostr relay');
        setLocalPreferences(remotePreferences);
      }
      hasSyncedFromRemote.current = true;
    }
  }, [user?.pubkey, remotePreferences, isFetched, setLocalPreferences]);

  // Save preferences to Nostr (debounced)
  const saveToNostr = useCallback(
    async (preferences: UserPreferences) => {
      if (!user) return;

      // Clear any pending save
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      // Debounce saves to avoid spamming relays
      saveTimeoutRef.current = setTimeout(async () => {
        try {
          await publishEvent({
            kind: APP_DATA_KIND,
            content: JSON.stringify(preferences),
            tags: [
              ['d', APP_IDENTIFIER],
              ['alt', 'Home Log user preferences'],
            ],
          });
          console.log('Preferences saved to Nostr relay');
        } catch (error) {
          console.error('Failed to save preferences to Nostr:', error);
        }
      }, 2000); // 2 second debounce
    },
    [user, publishEvent]
  );

  // Update preferences (both local and remote)
  const updatePreferences = useCallback(
    (updater: (prev: UserPreferences) => UserPreferences) => {
      setLocalPreferences((prev) => {
        const newPrefs = updater(prev);
        // Save to Nostr if user is logged in
        if (user) {
          saveToNostr(newPrefs);
        }
        return newPrefs;
      });
    },
    [setLocalPreferences, saveToNostr, user]
  );

  // Tab actions
  const addTab = useCallback((tabId: TabId) => {
    if (tabId === 'home') return;
    updatePreferences((prev) => {
      if (prev.activeTabs.includes(tabId)) return prev;
      return {
        ...prev,
        activeTabs: [...prev.activeTabs, tabId],
        activeTab: tabId,
      };
    });
  }, [updatePreferences]);

  const addTabs = useCallback((tabIds: TabId[]) => {
    updatePreferences((prev) => {
      const newTabs = tabIds.filter(
        id => id !== 'home' && !prev.activeTabs.includes(id)
      );
      if (newTabs.length === 0) return prev;
      return {
        ...prev,
        activeTabs: [...prev.activeTabs, ...newTabs],
        activeTab: newTabs[0],
      };
    });
  }, [updatePreferences]);

  const removeTab = useCallback((tabId: TabId) => {
    if (tabId === 'home') return;
    updatePreferences((prev) => ({
      ...prev,
      activeTabs: prev.activeTabs.filter(id => id !== tabId),
      activeTab: prev.activeTab === tabId ? 'home' : prev.activeTab,
    }));
  }, [updatePreferences]);

  const setActiveTab = useCallback((tabId: TabId) => {
    updatePreferences((prev) => ({
      ...prev,
      activeTab: tabId,
    }));
  }, [updatePreferences]);

  const reorderTabs = useCallback((newOrder: TabId[]) => {
    const filteredOrder = newOrder.filter(id => id !== 'home');
    updatePreferences((prev) => ({
      ...prev,
      activeTabs: filteredOrder,
    }));
  }, [updatePreferences]);

  const getTabDefinition = useCallback((tabId: TabId): TabDefinition | undefined => {
    if (tabId === 'home') {
      return { id: 'home', label: 'Home', icon: 'Home', description: 'Overview of all your tracked items' };
    }
    return AVAILABLE_TABS.find(tab => tab.id === tabId);
  }, []);

  const getAvailableTabs = useCallback((): TabDefinition[] => {
    return AVAILABLE_TABS.filter(tab => !localPreferences.activeTabs.includes(tab.id));
  }, [localPreferences.activeTabs]);

  // Dashboard card actions
  const reorderDashboardCards = useCallback((newOrder: TabId[]) => {
    const filteredOrder = newOrder.filter(id => id !== 'home');
    updatePreferences((prev) => ({
      ...prev,
      dashboardCardOrder: filteredOrder,
    }));
  }, [updatePreferences]);

  // Get the dashboard card order - returns activeTabs filtered by dashboardCardOrder if set,
  // otherwise returns activeTabs in their default order
  const getDashboardCardOrder = useCallback((): TabId[] => {
    const activeTabs = localPreferences.activeTabs || [];
    const dashboardOrder = localPreferences.dashboardCardOrder || [];
    
    if (dashboardOrder.length === 0) {
      // No custom order set, use activeTabs order
      return activeTabs;
    }
    
    // Filter dashboardOrder to only include currently active tabs
    const orderedTabs = dashboardOrder.filter(id => activeTabs.includes(id));
    
    // Add any active tabs not in dashboardOrder at the end
    const missingTabs = activeTabs.filter(id => !dashboardOrder.includes(id));
    
    return [...orderedTabs, ...missingTabs];
  }, [localPreferences.activeTabs, localPreferences.dashboardCardOrder]);

  // View mode actions
  const setAppliancesViewMode = useCallback((mode: 'list' | 'card') => {
    updatePreferences((prev) => ({
      ...prev,
      appliancesViewMode: mode,
    }));
  }, [updatePreferences]);

  const setVehiclesViewMode = useCallback((mode: 'list' | 'card') => {
    updatePreferences((prev) => ({
      ...prev,
      vehiclesViewMode: mode,
    }));
  }, [updatePreferences]);

  const setContractorsViewMode = useCallback((mode: 'list' | 'card') => {
    updatePreferences((prev) => ({
      ...prev,
      contractorsViewMode: mode,
    }));
  }, [updatePreferences]);

  // Room actions
  const addCustomRoom = useCallback((room: string) => {
    updatePreferences((prev) => {
      const currentCustomRooms = prev.customRooms || [];
      const currentHiddenRooms = prev.hiddenDefaultRooms || [];
      if (currentCustomRooms.includes(room)) return prev;
      return {
        ...prev,
        customRooms: [...currentCustomRooms, room],
        // If adding a room that was a hidden default, remove it from hidden
        hiddenDefaultRooms: currentHiddenRooms.filter(r => r !== room),
      };
    });
  }, [updatePreferences]);

  const removeCustomRoom = useCallback((room: string) => {
    updatePreferences((prev) => ({
      ...prev,
      customRooms: (prev.customRooms || []).filter(r => r !== room),
    }));
  }, [updatePreferences]);

  const hideDefaultRoom = useCallback((room: string) => {
    updatePreferences((prev) => {
      const currentHiddenRooms = prev.hiddenDefaultRooms || [];
      if (currentHiddenRooms.includes(room)) return prev;
      return {
        ...prev,
        hiddenDefaultRooms: [...currentHiddenRooms, room],
      };
    });
  }, [updatePreferences]);

  const restoreDefaultRoom = useCallback((room: string) => {
    updatePreferences((prev) => ({
      ...prev,
      hiddenDefaultRooms: (prev.hiddenDefaultRooms || []).filter(r => r !== room),
    }));
  }, [updatePreferences]);

  // Vehicle type actions
  const addCustomVehicleType = useCallback((type: string) => {
    updatePreferences((prev) => {
      const currentCustomTypes = prev.customVehicleTypes || [];
      const currentHiddenTypes = prev.hiddenDefaultVehicleTypes || [];
      if (currentCustomTypes.includes(type)) return prev;
      return {
        ...prev,
        customVehicleTypes: [...currentCustomTypes, type],
        // If adding a type that was a hidden default, remove it from hidden
        hiddenDefaultVehicleTypes: currentHiddenTypes.filter(t => t !== type),
      };
    });
  }, [updatePreferences]);

  const removeCustomVehicleType = useCallback((type: string) => {
    updatePreferences((prev) => ({
      ...prev,
      customVehicleTypes: (prev.customVehicleTypes || []).filter(t => t !== type),
    }));
  }, [updatePreferences]);

  const hideDefaultVehicleType = useCallback((type: string) => {
    updatePreferences((prev) => {
      const currentHiddenTypes = prev.hiddenDefaultVehicleTypes || [];
      if (currentHiddenTypes.includes(type)) return prev;
      return {
        ...prev,
        hiddenDefaultVehicleTypes: [...currentHiddenTypes, type],
      };
    });
  }, [updatePreferences]);

  const restoreDefaultVehicleType = useCallback((type: string) => {
    updatePreferences((prev) => ({
      ...prev,
      hiddenDefaultVehicleTypes: (prev.hiddenDefaultVehicleTypes || []).filter(t => t !== type),
    }));
  }, [updatePreferences]);

  // Contractor type actions
  const addCustomContractorType = useCallback((type: string) => {
    updatePreferences((prev) => {
      const currentCustomTypes = prev.customContractorTypes || [];
      const currentHiddenTypes = prev.hiddenDefaultContractorTypes || [];
      if (currentCustomTypes.includes(type)) return prev;
      return {
        ...prev,
        customContractorTypes: [...currentCustomTypes, type],
        // If adding a type that was a hidden default, remove it from hidden
        hiddenDefaultContractorTypes: currentHiddenTypes.filter(t => t !== type),
      };
    });
  }, [updatePreferences]);

  const removeCustomContractorType = useCallback((type: string) => {
    updatePreferences((prev) => ({
      ...prev,
      customContractorTypes: (prev.customContractorTypes || []).filter(t => t !== type),
    }));
  }, [updatePreferences]);

  const hideDefaultContractorType = useCallback((type: string) => {
    updatePreferences((prev) => {
      const currentHiddenTypes = prev.hiddenDefaultContractorTypes || [];
      if (currentHiddenTypes.includes(type)) return prev;
      return {
        ...prev,
        hiddenDefaultContractorTypes: [...currentHiddenTypes, type],
      };
    });
  }, [updatePreferences]);

  const restoreDefaultContractorType = useCallback((type: string) => {
    updatePreferences((prev) => ({
      ...prev,
      hiddenDefaultContractorTypes: (prev.hiddenDefaultContractorTypes || []).filter(t => t !== type),
    }));
  }, [updatePreferences]);

  // Blossom server actions
  const normalizeBlossomUrl = (url: string): string => {
    let normalized = url.trim();
    // Ensure https:// prefix
    if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
      normalized = `https://${normalized}`;
    }
    // Ensure trailing slash
    if (!normalized.endsWith('/')) {
      normalized = `${normalized}/`;
    }
    return normalized;
  };

  const addBlossomServer = useCallback((url: string, isPrivate: boolean = false) => {
    const normalized = normalizeBlossomUrl(url);
    updatePreferences((prev) => {
      const currentServers = prev.blossomServers || DEFAULT_BLOSSOM_SERVERS;
      if (currentServers.some(s => s.url === normalized)) return prev;
      return {
        ...prev,
        blossomServers: [...currentServers, { url: normalized, enabled: true, isPrivate }],
      };
    });
  }, [updatePreferences]);

  const removeBlossomServer = useCallback((url: string) => {
    updatePreferences((prev) => ({
      ...prev,
      blossomServers: (prev.blossomServers || DEFAULT_BLOSSOM_SERVERS).filter(s => s.url !== url),
    }));
  }, [updatePreferences]);

  const toggleBlossomServer = useCallback((url: string) => {
    updatePreferences((prev) => ({
      ...prev,
      blossomServers: (prev.blossomServers || DEFAULT_BLOSSOM_SERVERS).map(s =>
        s.url === url ? { ...s, enabled: !s.enabled } : s
      ),
    }));
  }, [updatePreferences]);

  const toggleBlossomServerPrivate = useCallback((url: string) => {
    updatePreferences((prev) => ({
      ...prev,
      blossomServers: (prev.blossomServers || DEFAULT_BLOSSOM_SERVERS).map(s =>
        s.url === url ? { ...s, isPrivate: !s.isPrivate } : s
      ),
    }));
  }, [updatePreferences]);

  const reorderBlossomServers = useCallback((servers: BlossomServer[]) => {
    updatePreferences((prev) => ({
      ...prev,
      blossomServers: servers,
    }));
  }, [updatePreferences]);

  const getEnabledBlossomServers = useCallback((): string[] => {
    const servers = localPreferences.blossomServers || DEFAULT_BLOSSOM_SERVERS;
    return servers.filter(s => s.enabled).map(s => s.url);
  }, [localPreferences.blossomServers]);

  const getPrivateBlossomServers = useCallback((): string[] => {
    const servers = localPreferences.blossomServers || DEFAULT_BLOSSOM_SERVERS;
    return servers.filter(s => s.enabled && s.isPrivate).map(s => s.url);
  }, [localPreferences.blossomServers]);

  const hasPrivateBlossomServer = useCallback((): boolean => {
    const servers = localPreferences.blossomServers || DEFAULT_BLOSSOM_SERVERS;
    return servers.some(s => s.enabled && s.isPrivate);
  }, [localPreferences.blossomServers]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Normalize preferences to ensure all fields have default values
  // Also migrate old blossom servers that don't have isPrivate flag
  const normalizedBlossomServers = (localPreferences.blossomServers || DEFAULT_BLOSSOM_SERVERS).map(s => ({
    ...s,
    isPrivate: s.isPrivate ?? false, // Default to false for servers without the flag
  }));

  const normalizedPreferences: UserPreferences = {
    activeTabs: localPreferences.activeTabs || [],
    activeTab: localPreferences.activeTab || 'home',
    dashboardCardOrder: localPreferences.dashboardCardOrder || [],
    appliancesViewMode: localPreferences.appliancesViewMode || 'card',
    vehiclesViewMode: localPreferences.vehiclesViewMode || 'card',
    contractorsViewMode: localPreferences.contractorsViewMode || 'card',
    customRooms: localPreferences.customRooms || [],
    hiddenDefaultRooms: localPreferences.hiddenDefaultRooms || [],
    customVehicleTypes: localPreferences.customVehicleTypes || [],
    hiddenDefaultVehicleTypes: localPreferences.hiddenDefaultVehicleTypes || [],
    customContractorTypes: localPreferences.customContractorTypes || [],
    hiddenDefaultContractorTypes: localPreferences.hiddenDefaultContractorTypes || [],
    blossomServers: normalizedBlossomServers,
    version: localPreferences.version || 1,
  };

  return (
    <UserPreferencesContext.Provider
      value={{
        preferences: normalizedPreferences,
        isLoading: isLoadingRemote && !hasSyncedFromRemote.current,
        isSyncing: !!saveTimeoutRef.current,
        addTab,
        addTabs,
        removeTab,
        setActiveTab,
        reorderTabs,
        getTabDefinition,
        getAvailableTabs,
        reorderDashboardCards,
        getDashboardCardOrder,
        setAppliancesViewMode,
        setVehiclesViewMode,
        setContractorsViewMode,
        addCustomRoom,
        removeCustomRoom,
        hideDefaultRoom,
        restoreDefaultRoom,
        addCustomVehicleType,
        removeCustomVehicleType,
        hideDefaultVehicleType,
        restoreDefaultVehicleType,
        addCustomContractorType,
        removeCustomContractorType,
        hideDefaultContractorType,
        restoreDefaultContractorType,
        addBlossomServer,
        removeBlossomServer,
        toggleBlossomServer,
        toggleBlossomServerPrivate,
        reorderBlossomServers,
        getEnabledBlossomServers,
        getPrivateBlossomServers,
        hasPrivateBlossomServer,
      }}
    >
      {children}
    </UserPreferencesContext.Provider>
  );
}

export function useUserPreferences() {
  const context = useContext(UserPreferencesContext);
  if (!context) {
    throw new Error('useUserPreferences must be used within a UserPreferencesProvider');
  }
  return context;
}

// Alias for backward compatibility with useTabPreferences
export function useTabPreferences() {
  return useUserPreferences();
}
