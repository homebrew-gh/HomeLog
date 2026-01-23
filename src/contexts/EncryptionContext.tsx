import { createContext, useContext, useCallback, type ReactNode } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';

/**
 * Data categories that can be encrypted
 */
export type EncryptableCategory = 
  | 'appliances'
  | 'vehicles'
  | 'maintenance'
  | 'subscriptions'
  | 'warranties'
  | 'contractors'
  | 'projects';

/**
 * Per-category relay settings
 * Maps relay URL to whether it's enabled for that category
 */
export type CategoryRelaySettings = Record<string, boolean>;

/**
 * Encryption settings for each category
 */
export interface EncryptionSettings {
  appliances: boolean;
  vehicles: boolean;
  maintenance: boolean;
  subscriptions: boolean;
  warranties: boolean;
  contractors: boolean;
  projects: boolean;
}

/**
 * Per-category relay configuration
 * Each category can have different relays enabled/disabled
 */
export interface CategoryRelayConfig {
  appliances: CategoryRelaySettings;
  vehicles: CategoryRelaySettings;
  maintenance: CategoryRelaySettings;
  subscriptions: CategoryRelaySettings;
  warranties: CategoryRelaySettings;
  contractors: CategoryRelaySettings;
  projects: CategoryRelaySettings;
}

/**
 * Private relay URLs marked by user
 */
export type PrivateRelayList = string[];

/**
 * Default encryption settings
 * - Appliances, vehicles, warranties, subscriptions, maintenance: encrypted by default (private data)
 * - Contractors, projects: plaintext by default (shareable in the future)
 */
const DEFAULT_ENCRYPTION_SETTINGS: EncryptionSettings = {
  appliances: true,
  vehicles: true,
  maintenance: true,
  subscriptions: true,
  warranties: true,
  contractors: false,
  projects: false,
};

const DEFAULT_CATEGORY_RELAY_CONFIG: CategoryRelayConfig = {
  appliances: {},
  vehicles: {},
  maintenance: {},
  subscriptions: {},
  warranties: {},
  contractors: {},
  projects: {},
};

/**
 * Category metadata for display
 */
export const CATEGORY_INFO: Record<EncryptableCategory, { 
  label: string; 
  description: string;
  recommendEncryption: boolean;
}> = {
  appliances: {
    label: 'Appliances',
    description: 'Home appliances and equipment details',
    recommendEncryption: true,
  },
  vehicles: {
    label: 'Vehicles',
    description: 'Vehicle information including VINs, license plates, and insurance',
    recommendEncryption: true,
  },
  maintenance: {
    label: 'Maintenance',
    description: 'Maintenance schedules and completion records',
    recommendEncryption: true,
  },
  subscriptions: {
    label: 'Subscriptions',
    description: 'Recurring subscriptions and payment information',
    recommendEncryption: true,
  },
  warranties: {
    label: 'Warranties',
    description: 'Warranty information and expiration dates',
    recommendEncryption: true,
  },
  contractors: {
    label: 'Contractors/Services',
    description: 'Service provider contacts - keep unencrypted for future sharing',
    recommendEncryption: false,
  },
  projects: {
    label: 'Projects',
    description: 'Home improvement projects - keep unencrypted for future sharing',
    recommendEncryption: false,
  },
};

interface EncryptionContextType {
  settings: EncryptionSettings;
  categoryRelayConfig: CategoryRelayConfig;
  privateRelays: PrivateRelayList;
  isEncryptionEnabled: (category: EncryptableCategory) => boolean;
  setEncryptionEnabled: (category: EncryptableCategory, enabled: boolean) => void;
  setAllEncryption: (enabled: boolean) => void;
  resetToDefaults: () => void;
  // Relay settings per category
  isRelayEnabledForCategory: (category: EncryptableCategory, relayUrl: string) => boolean;
  setRelayEnabledForCategory: (category: EncryptableCategory, relayUrl: string, enabled: boolean) => void;
  getEnabledRelaysForCategory: (category: EncryptableCategory, allRelays: string[]) => string[];
  // Private relay management
  isPrivateRelay: (relayUrl: string) => boolean;
  setPrivateRelay: (relayUrl: string, isPrivate: boolean) => void;
}

/**
 * Default context value used when outside the provider
 * This allows hooks to work gracefully even if the provider is not yet mounted
 */
const defaultContextValue: EncryptionContextType = {
  settings: DEFAULT_ENCRYPTION_SETTINGS,
  categoryRelayConfig: DEFAULT_CATEGORY_RELAY_CONFIG,
  privateRelays: [],
  isEncryptionEnabled: (category: EncryptableCategory) => DEFAULT_ENCRYPTION_SETTINGS[category],
  setEncryptionEnabled: () => {},
  setAllEncryption: () => {},
  resetToDefaults: () => {},
  isRelayEnabledForCategory: () => true,
  setRelayEnabledForCategory: () => {},
  getEnabledRelaysForCategory: (_, allRelays) => allRelays,
  isPrivateRelay: () => false,
  setPrivateRelay: () => {},
};

const EncryptionContext = createContext<EncryptionContextType>(defaultContextValue);

export function EncryptionProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useLocalStorage<EncryptionSettings>(
    'homelog-encryption-settings',
    DEFAULT_ENCRYPTION_SETTINGS
  );

  const [categoryRelayConfig, setCategoryRelayConfig] = useLocalStorage<CategoryRelayConfig>(
    'homelog-category-relay-config',
    DEFAULT_CATEGORY_RELAY_CONFIG
  );

  const [privateRelays, setPrivateRelays] = useLocalStorage<PrivateRelayList>(
    'homelog-private-relays',
    []
  );

  const isEncryptionEnabled = useCallback((category: EncryptableCategory): boolean => {
    return settings[category] ?? DEFAULT_ENCRYPTION_SETTINGS[category];
  }, [settings]);

  const setEncryptionEnabled = useCallback((category: EncryptableCategory, enabled: boolean) => {
    setSettings(prev => ({
      ...prev,
      [category]: enabled,
    }));
  }, [setSettings]);

  const setAllEncryption = useCallback((enabled: boolean) => {
    setSettings({
      appliances: enabled,
      vehicles: enabled,
      maintenance: enabled,
      subscriptions: enabled,
      warranties: enabled,
      contractors: enabled,
      projects: enabled,
    });
  }, [setSettings]);

  const resetToDefaults = useCallback(() => {
    setSettings(DEFAULT_ENCRYPTION_SETTINGS);
  }, [setSettings]);

  // Check if a specific relay is enabled for a category
  // Default is true (enabled) if not explicitly set
  const isRelayEnabledForCategory = useCallback((category: EncryptableCategory, relayUrl: string): boolean => {
    const categoryConfig = categoryRelayConfig[category];
    if (categoryConfig && relayUrl in categoryConfig) {
      return categoryConfig[relayUrl];
    }
    // Default: all relays are enabled
    return true;
  }, [categoryRelayConfig]);

  // Set whether a relay is enabled for a category
  const setRelayEnabledForCategory = useCallback((category: EncryptableCategory, relayUrl: string, enabled: boolean) => {
    setCategoryRelayConfig(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [relayUrl]: enabled,
      },
    }));
  }, [setCategoryRelayConfig]);

  // Get list of enabled relays for a category, sorted with private relays first
  const getEnabledRelaysForCategory = useCallback((category: EncryptableCategory, allRelays: string[]): string[] => {
    const enabledRelays = allRelays.filter(url => isRelayEnabledForCategory(category, url));
    
    // Sort with private relays first
    return enabledRelays.sort((a, b) => {
      const aIsPrivate = privateRelays.includes(a);
      const bIsPrivate = privateRelays.includes(b);
      if (aIsPrivate && !bIsPrivate) return -1;
      if (!aIsPrivate && bIsPrivate) return 1;
      return 0;
    });
  }, [isRelayEnabledForCategory, privateRelays]);

  // Check if a relay is marked as private
  const isPrivateRelay = useCallback((relayUrl: string): boolean => {
    return privateRelays.includes(relayUrl);
  }, [privateRelays]);

  // Set whether a relay is private
  const setPrivateRelay = useCallback((relayUrl: string, isPrivate: boolean) => {
    setPrivateRelays(prev => {
      if (isPrivate) {
        return prev.includes(relayUrl) ? prev : [...prev, relayUrl];
      } else {
        return prev.filter(url => url !== relayUrl);
      }
    });
  }, [setPrivateRelays]);

  return (
    <EncryptionContext.Provider
      value={{
        settings,
        categoryRelayConfig,
        privateRelays,
        isEncryptionEnabled,
        setEncryptionEnabled,
        setAllEncryption,
        resetToDefaults,
        isRelayEnabledForCategory,
        setRelayEnabledForCategory,
        getEnabledRelaysForCategory,
        isPrivateRelay,
        setPrivateRelay,
      }}
    >
      {children}
    </EncryptionContext.Provider>
  );
}

export function useEncryptionSettings() {
  const context = useContext(EncryptionContext);
  // Context will always have a value due to the default value set in createContext
  return context;
}
