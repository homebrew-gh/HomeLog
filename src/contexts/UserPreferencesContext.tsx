import { createContext, useContext, useEffect, useRef, useCallback, useState, type ReactNode } from 'react';
import { useNostr } from '@nostrify/react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { useAppContext } from '@/hooks/useAppContext';

// NIP-78: Application-specific data
const APP_DATA_KIND = 30078;
const APP_IDENTIFIER = 'cypherlog/preferences';

// Marker to identify encrypted blossomServers field
const ENCRYPTED_BLOSSOM_MARKER = 'nip44:';

export type TabId = 
  | 'home'
  | 'appliances'
  | 'maintenance'
  | 'vehicles'
  | 'subscriptions'
  | 'warranties'
  | 'companies'
  | 'projects'
  | 'pets';

export interface TabDefinition {
  id: TabId;
  label: string;
  icon: string;
  description: string;
}

export const AVAILABLE_TABS: TabDefinition[] = [
  { id: 'appliances', label: 'My Stuff', icon: 'Package', description: 'Track home appliances and equipment' },
  { id: 'maintenance', label: 'Maintenance', icon: 'Wrench', description: 'Schedule and track maintenance tasks' },
  { id: 'vehicles', label: 'Vehicles', icon: 'Car', description: 'Manage vehicle information and maintenance' },
  { id: 'subscriptions', label: 'Subscriptions', icon: 'CreditCard', description: 'Track recurring subscriptions and payments' },
  { id: 'warranties', label: 'Warranties', icon: 'Shield', description: 'Store warranty information and expiration dates' },
  { id: 'companies', label: 'Companies/Services', icon: 'Users', description: 'Keep contact info for service providers' },
  { id: 'projects', label: 'Projects', icon: 'FolderKanban', description: 'Plan and track home improvement projects' },
  { id: 'pets', label: 'Pets & Animals', icon: 'PawPrint', description: 'Track your pets and their care information' },
];

export interface BlossomServer {
  url: string;
  enabled: boolean;
  /** Whether this server is trusted for sensitive/private uploads (receipts, documents, etc.) */
  isPrivate: boolean;
}

export type ColorTheme = 'blue' | 'orange' | 'green' | 'red' | 'pink' | 'purple';

export const COLOR_THEMES: { id: ColorTheme; label: string; color: string }[] = [
  { id: 'blue', label: 'Sky Blue', color: 'hsl(199, 89%, 48%)' },
  { id: 'orange', label: 'Amber', color: 'hsl(25, 95%, 53%)' },
  { id: 'green', label: 'Emerald', color: 'hsl(160, 84%, 39%)' },
  { id: 'red', label: 'Rose', color: 'hsl(350, 89%, 60%)' },
  { id: 'pink', label: 'Fuchsia', color: 'hsl(292, 84%, 61%)' },
  { id: 'purple', label: 'Violet', color: 'hsl(263, 70%, 50%)' },
];

// Default server is public - users must configure a private server for sensitive uploads
export const DEFAULT_BLOSSOM_SERVERS: BlossomServer[] = [
  { url: 'https://blossom.primal.net/', enabled: true, isPrivate: false },
];

// Exchange rates storage type
export interface StoredExchangeRates {
  base: string;
  rates: Record<string, number>;
  timestamp: number;
  btcPrice?: number;
}

export interface UserPreferences {
  // Tab preferences
  activeTabs: TabId[];
  activeTab: TabId;
  // Dashboard card order (separate from tab order in navigation)
  dashboardCardOrder: TabId[];
  // View preferences
  appliancesViewMode: 'list' | 'card';
  vehiclesViewMode: 'list' | 'card';
  companiesViewMode: 'list' | 'card';
  subscriptionsViewMode: 'list' | 'card';
  // Color theme preference
  colorTheme: ColorTheme;
  // Currency preferences
  entryCurrency: string; // Currency used for data entry
  displayCurrency: string; // Currency used for display/viewing
  exchangeRates?: StoredExchangeRates; // Cached exchange rates
  // Custom rooms
  customRooms: string[];
  // Hidden default rooms (allows users to "delete" default rooms)
  hiddenDefaultRooms: string[];
  // Custom vehicle types
  customVehicleTypes: string[];
  // Hidden default vehicle types
  hiddenDefaultVehicleTypes: string[];
  // Custom company/service types
  customCompanyTypes: string[];
  // Hidden default company types
  hiddenDefaultCompanyTypes: string[];
  // Custom subscription types
  customSubscriptionTypes: string[];
  // Hidden default subscription types
  hiddenDefaultSubscriptionTypes: string[];
  // Custom home features
  customHomeFeatures: string[];
  // Hidden default home features
  hiddenDefaultHomeFeatures: string[];
  // Custom warranty types
  customWarrantyTypes: string[];
  // Hidden default warranty types
  hiddenDefaultWarrantyTypes: string[];
  // Custom pet types
  customPetTypes: string[];
  // Hidden default pet types
  hiddenDefaultPetTypes: string[];
  // Pets view mode
  petsViewMode: 'list' | 'card';
  // Projects view mode
  projectsViewMode: 'list' | 'card';
  // Blossom media servers
  blossomServers: BlossomServer[];
  // Version for future migrations
  version: number;
}

/**
 * Type for preferences as stored on Nostr (blossomServers may be encrypted string)
 */
interface StoredPreferences extends Omit<UserPreferences, 'blossomServers'> {
  blossomServers?: BlossomServer[] | string; // Can be array (legacy) or encrypted string
}

const DEFAULT_PREFERENCES: UserPreferences = {
  activeTabs: [],
  activeTab: 'home',
  dashboardCardOrder: [],
  appliancesViewMode: 'card',
  vehiclesViewMode: 'card',
  companiesViewMode: 'card',
  subscriptionsViewMode: 'card',
  colorTheme: 'purple',
  entryCurrency: 'USD',
  displayCurrency: 'USD',
  exchangeRates: undefined,
  customRooms: [],
  hiddenDefaultRooms: [],
  customVehicleTypes: [],
  hiddenDefaultVehicleTypes: [],
  customCompanyTypes: [],
  hiddenDefaultCompanyTypes: [],
  customSubscriptionTypes: [],
  hiddenDefaultSubscriptionTypes: [],
  customHomeFeatures: [],
  hiddenDefaultHomeFeatures: [],
  customWarrantyTypes: [],
  hiddenDefaultWarrantyTypes: [],
  customPetTypes: [],
  hiddenDefaultPetTypes: [],
  petsViewMode: 'card',
  projectsViewMode: 'card',
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
  setCompaniesViewMode: (mode: 'list' | 'card') => void;
  setSubscriptionsViewMode: (mode: 'list' | 'card') => void;
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
  // Company type actions
  addCustomCompanyType: (type: string) => void;
  removeCustomCompanyType: (type: string) => void;
  hideDefaultCompanyType: (type: string) => void;
  restoreDefaultCompanyType: (type: string) => void;
  // Subscription type actions
  addCustomSubscriptionType: (type: string) => void;
  removeCustomSubscriptionType: (type: string) => void;
  hideDefaultSubscriptionType: (type: string) => void;
  restoreDefaultSubscriptionType: (type: string) => void;
  // Home feature actions
  addCustomHomeFeature: (feature: string) => void;
  removeCustomHomeFeature: (feature: string) => void;
  hideDefaultHomeFeature: (feature: string) => void;
  restoreDefaultHomeFeature: (feature: string) => void;
  // Warranty type actions
  addCustomWarrantyType: (type: string) => void;
  removeCustomWarrantyType: (type: string) => void;
  hideDefaultWarrantyType: (type: string) => void;
  restoreDefaultWarrantyType: (type: string) => void;
  // Pet type actions
  addCustomPetType: (type: string) => void;
  removeCustomPetType: (type: string) => void;
  hideDefaultPetType: (type: string) => void;
  restoreDefaultPetType: (type: string) => void;
  // Pet view mode
  setPetsViewMode: (mode: 'list' | 'card') => void;
  // Project view mode
  setProjectsViewMode: (mode: 'list' | 'card') => void;
  // Blossom server actions
  addBlossomServer: (url: string, isPrivate?: boolean) => void;
  removeBlossomServer: (url: string) => void;
  toggleBlossomServer: (url: string) => void;
  toggleBlossomServerPrivate: (url: string) => void;
  reorderBlossomServers: (servers: BlossomServer[]) => void;
  getEnabledBlossomServers: () => string[];
  getPrivateBlossomServers: () => string[];
  hasPrivateBlossomServer: () => boolean;
  // Color theme actions
  setColorTheme: (theme: ColorTheme) => void;
  // Currency actions
  setEntryCurrency: (currency: string) => void;
  setDisplayCurrency: (currency: string) => void;
  setExchangeRates: (rates: StoredExchangeRates) => void;
}

const UserPreferencesContext = createContext<UserPreferencesContextType | null>(null);

export function UserPreferencesProvider({ children }: { children: ReactNode }) {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const { mutateAsync: publishEvent } = useNostrPublish();
  const queryClient = useQueryClient();
  const { config } = useAppContext();
  
  // Local storage for immediate persistence
  const [localPreferences, setLocalPreferences] = useLocalStorage<UserPreferences>(
    'cypherlog-user-preferences',
    DEFAULT_PREFERENCES
  );

  // Track the active tab separately as transient UI state
  // This prevents Nostr publishes on every tab switch
  // Always default to 'home' on initial load for consistent UX
  const [activeTab, setActiveTabState] = useState<TabId>('home');

  // Track if we've synced from remote on this session
  // Using state instead of ref so changes trigger re-render
  const [hasSyncedFromRemote, setHasSyncedFromRemote] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isPublishingRef = useRef(false);
  const lastTabChangeRef = useRef<number>(0);

  // Fetch preferences from Nostr (background sync)
  // Local storage is used as the primary source for instant loading
  // Include relay updatedAt in query key so we re-fetch when relays change
  const { data: remotePreferences, isLoading: isLoadingRemote, isFetched } = useQuery({
    queryKey: ['user-preferences', user?.pubkey, config.relayMetadata.updatedAt],
    queryFn: async (c) => {
      if (!user?.pubkey) return null;

      // Small delay to allow relay connections to establish after relay list changes
      // This ensures we query the new relays, not the old ones
      await new Promise(resolve => setTimeout(resolve, 500));

      // Use shorter timeout since we have local storage as fallback
      // This is a background sync, not blocking UI
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(5000)]);

      try {
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
          console.log('[UserPreferences] No remote preferences found');
          return null;
        }

        try {
          const storedPrefs = JSON.parse(events[0].content) as StoredPreferences;
          
          // Decrypt blossomServers if encrypted
          let blossomServers: BlossomServer[] = DEFAULT_BLOSSOM_SERVERS;
          
          if (storedPrefs.blossomServers) {
            if (typeof storedPrefs.blossomServers === 'string' && storedPrefs.blossomServers.startsWith(ENCRYPTED_BLOSSOM_MARKER)) {
              // Encrypted - try to decrypt
              if (user.signer.nip44) {
                try {
                  const encryptedData = storedPrefs.blossomServers.slice(ENCRYPTED_BLOSSOM_MARKER.length);
                  const decrypted = await user.signer.nip44.decrypt(user.pubkey, encryptedData);
                  blossomServers = JSON.parse(decrypted) as BlossomServer[];
                  console.log('[UserPreferences] Decrypted blossomServers from relay');
                } catch (decryptError) {
                  console.warn('[UserPreferences] Failed to decrypt blossomServers:', decryptError);
                  // Fall back to defaults
                }
              } else {
                console.warn('[UserPreferences] Cannot decrypt blossomServers - no NIP-44 support');
              }
            } else if (Array.isArray(storedPrefs.blossomServers)) {
              // Legacy unencrypted format
              blossomServers = storedPrefs.blossomServers;
              console.log('[UserPreferences] Loaded unencrypted blossomServers (legacy)');
            }
          }
          
          // Reconstruct full preferences
          const preferences: UserPreferences = {
            ...storedPrefs,
            blossomServers,
          } as UserPreferences;
          
          console.log('[UserPreferences] Loaded preferences from relay');
          return preferences;
        } catch (error) {
          console.warn('Failed to parse user preferences from Nostr:', error);
          return null;
        }
      } catch (error) {
        console.warn('[UserPreferences] Relay fetch failed, using local storage:', error);
        return null;
      }
    },
    enabled: !!user?.pubkey,
    staleTime: 60000,
    // Don't block on this - local storage is our primary source
    retry: 1,
  });

  // Track the last sync state
  const lastSyncedPubkeyRef = useRef<string | null>(null);
  const lastSyncedRelayTimestamp = useRef<number>(0);

  // Reset sync state when user or relays change
  useEffect(() => {
    if (!user?.pubkey) {
      // User logged out, reset sync state
      setHasSyncedFromRemote(false);
      lastSyncedPubkeyRef.current = null;
      lastSyncedRelayTimestamp.current = 0;
      return;
    }

    // Check if we need to reset sync state (new user or different relays)
    const userChanged = lastSyncedPubkeyRef.current !== user.pubkey;
    const relaysChanged = lastSyncedRelayTimestamp.current !== config.relayMetadata.updatedAt && lastSyncedRelayTimestamp.current !== 0;
    
    if (userChanged || relaysChanged) {
      setHasSyncedFromRemote(false);
    }
    
    lastSyncedPubkeyRef.current = user.pubkey;
    lastSyncedRelayTimestamp.current = config.relayMetadata.updatedAt;
  }, [user?.pubkey, config.relayMetadata.updatedAt]);

  // Apply remote preferences when fetched (but don't change activeTab - always start on home)
  // Only apply remote preferences if local storage is empty/default (no tabs configured)
  // This prevents overwriting local changes that haven't been synced to Nostr yet
  useEffect(() => {
    if (isFetched && !hasSyncedFromRemote && user?.pubkey) {
      if (remotePreferences) {
        const hasLocalTabs = localPreferences.activeTabs && localPreferences.activeTabs.length > 0;
        const hasRemoteTabs = remotePreferences.activeTabs && remotePreferences.activeTabs.length > 0;
        
        if (!hasLocalTabs && hasRemoteTabs) {
          // No local tabs but remote has tabs - this is a new browser/device, sync from remote
          console.log('[UserPreferences] Syncing preferences from Nostr relay (new browser/device)');
          console.log('[UserPreferences] Active tabs from relay:', remotePreferences.activeTabs);
          setLocalPreferences(remotePreferences);
        } else if (hasLocalTabs) {
          // Local storage has tabs - don't overwrite with potentially stale remote data
          // The local changes will be synced to Nostr when saveToNostr runs
          console.log('[UserPreferences] Local preferences exist, not overwriting with remote');
          console.log('[UserPreferences] Local tabs:', localPreferences.activeTabs);
          console.log('[UserPreferences] Remote tabs:', remotePreferences.activeTabs);
        }
      }
      setHasSyncedFromRemote(true);
    }
  }, [isFetched, hasSyncedFromRemote, remotePreferences, setLocalPreferences, user?.pubkey, localPreferences.activeTabs]);

  // Save preferences to Nostr (debounced)
  const saveToNostr = useCallback(
    async (preferences: UserPreferences) => {
      if (!user) return;
      
      // Prevent concurrent publishes
      if (isPublishingRef.current) {
        return;
      }

      // Clear any pending save
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      // Debounce saves to avoid spamming relays
      saveTimeoutRef.current = setTimeout(async () => {
        if (isPublishingRef.current) return;
        isPublishingRef.current = true;
        
        try {
          // Exclude transient UI state (activeTab) and large cached data (exchangeRates) from Nostr sync
          // activeTab is transient UI state that doesn't need to be synced across devices
          // exchangeRates are cached API data that can be re-fetched on any device
          const { activeTab: _activeTab, exchangeRates: _exchangeRates, blossomServers, ...restPrefs } = preferences;
          
          // Prepare preferences for storage
          const prefsToSync: StoredPreferences = { ...restPrefs };
          
          // Encrypt blossomServers if user has NIP-44 support and there are servers to encrypt
          if (blossomServers && blossomServers.length > 0) {
            if (user.signer.nip44) {
              try {
                const encryptedServers = await user.signer.nip44.encrypt(
                  user.pubkey,
                  JSON.stringify(blossomServers)
                );
                prefsToSync.blossomServers = ENCRYPTED_BLOSSOM_MARKER + encryptedServers;
                console.log('[UserPreferences] Encrypted blossomServers for relay storage');
              } catch (encryptError) {
                console.warn('[UserPreferences] Failed to encrypt blossomServers, storing unencrypted:', encryptError);
                prefsToSync.blossomServers = blossomServers;
              }
            } else {
              // No NIP-44 support, store unencrypted (legacy)
              console.log('[UserPreferences] No NIP-44 support, storing blossomServers unencrypted');
              prefsToSync.blossomServers = blossomServers;
            }
          }
          
          await publishEvent({
            kind: APP_DATA_KIND,
            content: JSON.stringify(prefsToSync),
            tags: [
              ['d', APP_IDENTIFIER],
              ['alt', 'Cypher Log user preferences'],
            ],
          });
          console.log('Preferences saved to Nostr relay');
        } catch (error) {
          console.error('Failed to save preferences to Nostr:', error);
        } finally {
          isPublishingRef.current = false;
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
    // Update the local activeTab state
    setActiveTabState(tabId);
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
    const firstNewTab = tabIds.find(id => id !== 'home');
    if (firstNewTab) {
      setActiveTabState(firstNewTab);
    }
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
    // If removing the currently active tab, switch to home
    if (activeTab === tabId) {
      setActiveTabState('home');
    }
    updatePreferences((prev) => ({
      ...prev,
      activeTabs: prev.activeTabs.filter(id => id !== tabId),
      activeTab: prev.activeTab === tabId ? 'home' : prev.activeTab,
    }));
  }, [updatePreferences, activeTab]);

  const setActiveTab = useCallback((tabId: TabId) => {
    // Throttle tab changes to prevent rapid switching from causing issues
    // 300ms gives enough time for the previous tab's queries to settle
    const now = Date.now();
    if (now - lastTabChangeRef.current < 300) {
      return; // Ignore if less than 300ms since last change
    }
    lastTabChangeRef.current = now;
    
    // Only update local React state - don't persist to localStorage or Nostr
    // This is transient UI state that doesn't need any persistence
    setActiveTabState(tabId);
  }, []);

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

  const setCompaniesViewMode = useCallback((mode: 'list' | 'card') => {
    updatePreferences((prev) => ({
      ...prev,
      companiesViewMode: mode,
    }));
  }, [updatePreferences]);

  const setSubscriptionsViewMode = useCallback((mode: 'list' | 'card') => {
    updatePreferences((prev) => ({
      ...prev,
      subscriptionsViewMode: mode,
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

  // Company type actions
  const addCustomCompanyType = useCallback((type: string) => {
    updatePreferences((prev) => {
      const currentCustomTypes = prev.customCompanyTypes || [];
      const currentHiddenTypes = prev.hiddenDefaultCompanyTypes || [];
      if (currentCustomTypes.includes(type)) return prev;
      return {
        ...prev,
        customCompanyTypes: [...currentCustomTypes, type],
        // If adding a type that was a hidden default, remove it from hidden
        hiddenDefaultCompanyTypes: currentHiddenTypes.filter(t => t !== type),
      };
    });
  }, [updatePreferences]);

  const removeCustomCompanyType = useCallback((type: string) => {
    updatePreferences((prev) => ({
      ...prev,
      customCompanyTypes: (prev.customCompanyTypes || []).filter(t => t !== type),
    }));
  }, [updatePreferences]);

  const hideDefaultCompanyType = useCallback((type: string) => {
    updatePreferences((prev) => {
      const currentHiddenTypes = prev.hiddenDefaultCompanyTypes || [];
      if (currentHiddenTypes.includes(type)) return prev;
      return {
        ...prev,
        hiddenDefaultCompanyTypes: [...currentHiddenTypes, type],
      };
    });
  }, [updatePreferences]);

  const restoreDefaultCompanyType = useCallback((type: string) => {
    updatePreferences((prev) => ({
      ...prev,
      hiddenDefaultCompanyTypes: (prev.hiddenDefaultCompanyTypes || []).filter(t => t !== type),
    }));
  }, [updatePreferences]);

  // Subscription type actions
  const addCustomSubscriptionType = useCallback((type: string) => {
    updatePreferences((prev) => {
      const currentCustomTypes = prev.customSubscriptionTypes || [];
      const currentHiddenTypes = prev.hiddenDefaultSubscriptionTypes || [];
      if (currentCustomTypes.includes(type)) return prev;
      return {
        ...prev,
        customSubscriptionTypes: [...currentCustomTypes, type],
        // If adding a type that was a hidden default, remove it from hidden
        hiddenDefaultSubscriptionTypes: currentHiddenTypes.filter(t => t !== type),
      };
    });
  }, [updatePreferences]);

  const removeCustomSubscriptionType = useCallback((type: string) => {
    updatePreferences((prev) => ({
      ...prev,
      customSubscriptionTypes: (prev.customSubscriptionTypes || []).filter(t => t !== type),
    }));
  }, [updatePreferences]);

  const hideDefaultSubscriptionType = useCallback((type: string) => {
    updatePreferences((prev) => {
      const currentHiddenTypes = prev.hiddenDefaultSubscriptionTypes || [];
      if (currentHiddenTypes.includes(type)) return prev;
      return {
        ...prev,
        hiddenDefaultSubscriptionTypes: [...currentHiddenTypes, type],
      };
    });
  }, [updatePreferences]);

  const restoreDefaultSubscriptionType = useCallback((type: string) => {
    updatePreferences((prev) => ({
      ...prev,
      hiddenDefaultSubscriptionTypes: (prev.hiddenDefaultSubscriptionTypes || []).filter(t => t !== type),
    }));
  }, [updatePreferences]);

  // Home feature actions
  const addCustomHomeFeature = useCallback((feature: string) => {
    updatePreferences((prev) => {
      const currentCustomFeatures = prev.customHomeFeatures || [];
      const currentHiddenFeatures = prev.hiddenDefaultHomeFeatures || [];
      if (currentCustomFeatures.includes(feature)) return prev;
      return {
        ...prev,
        customHomeFeatures: [...currentCustomFeatures, feature],
        // If adding a feature that was a hidden default, remove it from hidden
        hiddenDefaultHomeFeatures: currentHiddenFeatures.filter(f => f !== feature),
      };
    });
  }, [updatePreferences]);

  const removeCustomHomeFeature = useCallback((feature: string) => {
    updatePreferences((prev) => ({
      ...prev,
      customHomeFeatures: (prev.customHomeFeatures || []).filter(f => f !== feature),
    }));
  }, [updatePreferences]);

  const hideDefaultHomeFeature = useCallback((feature: string) => {
    updatePreferences((prev) => {
      const currentHiddenFeatures = prev.hiddenDefaultHomeFeatures || [];
      if (currentHiddenFeatures.includes(feature)) return prev;
      return {
        ...prev,
        hiddenDefaultHomeFeatures: [...currentHiddenFeatures, feature],
      };
    });
  }, [updatePreferences]);

  const restoreDefaultHomeFeature = useCallback((feature: string) => {
    updatePreferences((prev) => ({
      ...prev,
      hiddenDefaultHomeFeatures: (prev.hiddenDefaultHomeFeatures || []).filter(f => f !== feature),
    }));
  }, [updatePreferences]);

  // Warranty type actions
  const addCustomWarrantyType = useCallback((type: string) => {
    updatePreferences((prev) => {
      const currentCustomTypes = prev.customWarrantyTypes || [];
      const currentHiddenTypes = prev.hiddenDefaultWarrantyTypes || [];
      if (currentCustomTypes.includes(type)) return prev;
      return {
        ...prev,
        customWarrantyTypes: [...currentCustomTypes, type],
        // If adding a type that was a hidden default, remove it from hidden
        hiddenDefaultWarrantyTypes: currentHiddenTypes.filter(t => t !== type),
      };
    });
  }, [updatePreferences]);

  const removeCustomWarrantyType = useCallback((type: string) => {
    updatePreferences((prev) => ({
      ...prev,
      customWarrantyTypes: (prev.customWarrantyTypes || []).filter(t => t !== type),
    }));
  }, [updatePreferences]);

  const hideDefaultWarrantyType = useCallback((type: string) => {
    updatePreferences((prev) => {
      const currentHiddenTypes = prev.hiddenDefaultWarrantyTypes || [];
      if (currentHiddenTypes.includes(type)) return prev;
      return {
        ...prev,
        hiddenDefaultWarrantyTypes: [...currentHiddenTypes, type],
      };
    });
  }, [updatePreferences]);

  const restoreDefaultWarrantyType = useCallback((type: string) => {
    updatePreferences((prev) => ({
      ...prev,
      hiddenDefaultWarrantyTypes: (prev.hiddenDefaultWarrantyTypes || []).filter(t => t !== type),
    }));
  }, [updatePreferences]);

  // Pet type actions
  const addCustomPetType = useCallback((type: string) => {
    updatePreferences((prev) => {
      const currentCustomTypes = prev.customPetTypes || [];
      const currentHiddenTypes = prev.hiddenDefaultPetTypes || [];
      if (currentCustomTypes.includes(type)) return prev;
      return {
        ...prev,
        customPetTypes: [...currentCustomTypes, type],
        // If adding a type that was a hidden default, remove it from hidden
        hiddenDefaultPetTypes: currentHiddenTypes.filter(t => t !== type),
      };
    });
  }, [updatePreferences]);

  const removeCustomPetType = useCallback((type: string) => {
    updatePreferences((prev) => ({
      ...prev,
      customPetTypes: (prev.customPetTypes || []).filter(t => t !== type),
    }));
  }, [updatePreferences]);

  const hideDefaultPetType = useCallback((type: string) => {
    updatePreferences((prev) => {
      const currentHiddenTypes = prev.hiddenDefaultPetTypes || [];
      if (currentHiddenTypes.includes(type)) return prev;
      return {
        ...prev,
        hiddenDefaultPetTypes: [...currentHiddenTypes, type],
      };
    });
  }, [updatePreferences]);

  const restoreDefaultPetType = useCallback((type: string) => {
    updatePreferences((prev) => ({
      ...prev,
      hiddenDefaultPetTypes: (prev.hiddenDefaultPetTypes || []).filter(t => t !== type),
    }));
  }, [updatePreferences]);

  // Pet view mode
  const setPetsViewMode = useCallback((mode: 'list' | 'card') => {
    updatePreferences((prev) => ({
      ...prev,
      petsViewMode: mode,
    }));
  }, [updatePreferences]);

  // Project view mode
  const setProjectsViewMode = useCallback((mode: 'list' | 'card') => {
    updatePreferences((prev) => ({
      ...prev,
      projectsViewMode: mode,
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

  // Color theme action
  const setColorTheme = useCallback((theme: ColorTheme) => {
    updatePreferences((prev) => ({
      ...prev,
      colorTheme: theme,
    }));
  }, [updatePreferences]);

  // Currency actions
  const setEntryCurrency = useCallback((currency: string) => {
    updatePreferences((prev) => ({
      ...prev,
      entryCurrency: currency,
    }));
  }, [updatePreferences]);

  const setDisplayCurrency = useCallback((currency: string) => {
    updatePreferences((prev) => ({
      ...prev,
      displayCurrency: currency,
    }));
  }, [updatePreferences]);

  const setExchangeRates = useCallback((rates: StoredExchangeRates) => {
    updatePreferences((prev) => ({
      ...prev,
      exchangeRates: rates,
    }));
  }, [updatePreferences]);

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
    activeTab: activeTab,
    dashboardCardOrder: localPreferences.dashboardCardOrder || [],
    appliancesViewMode: localPreferences.appliancesViewMode || 'card',
    vehiclesViewMode: localPreferences.vehiclesViewMode || 'card',
    companiesViewMode: localPreferences.companiesViewMode || 'card',
    subscriptionsViewMode: localPreferences.subscriptionsViewMode || 'card',
    colorTheme: localPreferences.colorTheme || 'purple',
    entryCurrency: localPreferences.entryCurrency || 'USD',
    displayCurrency: localPreferences.displayCurrency || 'USD',
    exchangeRates: localPreferences.exchangeRates,
    customRooms: localPreferences.customRooms || [],
    hiddenDefaultRooms: localPreferences.hiddenDefaultRooms || [],
    customVehicleTypes: localPreferences.customVehicleTypes || [],
    hiddenDefaultVehicleTypes: localPreferences.hiddenDefaultVehicleTypes || [],
    customCompanyTypes: localPreferences.customCompanyTypes || [],
    hiddenDefaultCompanyTypes: localPreferences.hiddenDefaultCompanyTypes || [],
    customSubscriptionTypes: localPreferences.customSubscriptionTypes || [],
    hiddenDefaultSubscriptionTypes: localPreferences.hiddenDefaultSubscriptionTypes || [],
    customHomeFeatures: localPreferences.customHomeFeatures || [],
    hiddenDefaultHomeFeatures: localPreferences.hiddenDefaultHomeFeatures || [],
    customWarrantyTypes: localPreferences.customWarrantyTypes || [],
    hiddenDefaultWarrantyTypes: localPreferences.hiddenDefaultWarrantyTypes || [],
    customPetTypes: localPreferences.customPetTypes || [],
    hiddenDefaultPetTypes: localPreferences.hiddenDefaultPetTypes || [],
    petsViewMode: localPreferences.petsViewMode || 'card',
    projectsViewMode: localPreferences.projectsViewMode || 'card',
    blossomServers: normalizedBlossomServers,
    version: localPreferences.version || 1,
  };

  // For returning users with cleared browser cache:
  // We need to wait for Nostr sync to complete before showing the dashboard.
  // "hasLocalData" means the user has actually customized their preferences
  // (not just using defaults), OR we've already synced from remote.
  const hasRealLocalData = localPreferences.activeTabs.length > 0;
  
  // Loading if:
  // 1. User is logged in, AND
  // 2. No local tabs (needs to fetch from remote), AND
  // 3. Haven't synced from remote yet
  const needsRemoteSync = !!user?.pubkey && !hasRealLocalData;
  const isActuallyLoading = needsRemoteSync && !hasSyncedFromRemote;

  return (
    <UserPreferencesContext.Provider
      value={{
        preferences: normalizedPreferences,
        isLoading: isActuallyLoading,
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
        setCompaniesViewMode,
        setSubscriptionsViewMode,
        addCustomRoom,
        removeCustomRoom,
        hideDefaultRoom,
        restoreDefaultRoom,
        addCustomVehicleType,
        removeCustomVehicleType,
        hideDefaultVehicleType,
        restoreDefaultVehicleType,
        addCustomCompanyType,
        removeCustomCompanyType,
        hideDefaultCompanyType,
        restoreDefaultCompanyType,
        addCustomSubscriptionType,
        removeCustomSubscriptionType,
        hideDefaultSubscriptionType,
        restoreDefaultSubscriptionType,
        addCustomHomeFeature,
        removeCustomHomeFeature,
        hideDefaultHomeFeature,
        restoreDefaultHomeFeature,
        addCustomWarrantyType,
        removeCustomWarrantyType,
        hideDefaultWarrantyType,
        restoreDefaultWarrantyType,
        addCustomPetType,
        removeCustomPetType,
        hideDefaultPetType,
        restoreDefaultPetType,
        setPetsViewMode,
        setProjectsViewMode,
        addBlossomServer,
        removeBlossomServer,
        toggleBlossomServer,
        toggleBlossomServerPrivate,
        reorderBlossomServers,
        getEnabledBlossomServers,
        getPrivateBlossomServers,
        hasPrivateBlossomServer,
        setColorTheme,
        setEntryCurrency,
        setDisplayCurrency,
        setExchangeRates,
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
