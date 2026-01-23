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
  isEncryptionEnabled: (category: EncryptableCategory) => boolean;
  setEncryptionEnabled: (category: EncryptableCategory, enabled: boolean) => void;
  setAllEncryption: (enabled: boolean) => void;
  resetToDefaults: () => void;
}

/**
 * Default context value used when outside the provider
 * This allows hooks to work gracefully even if the provider is not yet mounted
 */
const defaultContextValue: EncryptionContextType = {
  settings: DEFAULT_ENCRYPTION_SETTINGS,
  isEncryptionEnabled: (category: EncryptableCategory) => DEFAULT_ENCRYPTION_SETTINGS[category],
  setEncryptionEnabled: () => {},
  setAllEncryption: () => {},
  resetToDefaults: () => {},
};

const EncryptionContext = createContext<EncryptionContextType>(defaultContextValue);

export function EncryptionProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useLocalStorage<EncryptionSettings>(
    'homelog-encryption-settings',
    DEFAULT_ENCRYPTION_SETTINGS
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

  return (
    <EncryptionContext.Provider
      value={{
        settings,
        isEncryptionEnabled,
        setEncryptionEnabled,
        setAllEncryption,
        resetToDefaults,
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
