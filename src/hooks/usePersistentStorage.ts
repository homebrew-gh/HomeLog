import { useEffect, useCallback, useState } from 'react';

/**
 * Key for logout on close preference
 */
export const LOGOUT_ON_CLOSE_KEY = 'homelog:logout-on-close';

/**
 * Storage keys that are safe to persist (non-sensitive data)
 * These contain only preferences and cached data, not secrets
 */
export const SAFE_STORAGE_KEYS = {
  // App configuration
  APP_CONFIG: 'nostr:app-config',
  
  // UI preferences
  WIDGET_ORDER: 'homelog-widget-order',
  PWA_PROMPT_SEEN: 'homelog-install-prompt-seen',
  
  // Encryption settings (just toggles, not actual encrypted data)
  ENCRYPTION_SETTINGS: 'homelog-encryption-settings',
  CATEGORY_RELAY_CONFIG: 'homelog-category-relay-config',
  PRIVATE_RELAYS: 'homelog-private-relays',
  CACHING_RELAY: 'homelog-caching-relay',
  
  // Persistent storage preference
  PERSISTENT_STORAGE_PREF: 'homelog:persistent-storage-preference',
  
  // Logout on close preference
  LOGOUT_ON_CLOSE: LOGOUT_ON_CLOSE_KEY,
} as const;

/**
 * Storage keys that contain potentially sensitive data
 * These are still stored but users should be aware of them
 */
export const SENSITIVE_STORAGE_KEYS = {
  // NWC contains wallet connection strings
  NWC_CONNECTIONS: 'nwc-connections',
  NWC_ACTIVE_CONNECTION: 'nwc-active-connection',
  
  // Login state
  NOSTR_LOGIN: 'nostr:login',
} as const;

/**
 * IndexedDB databases used by the app
 */
export const INDEXED_DB_DATABASES = {
  // Event cache - contains encrypted Nostr events
  EVENT_CACHE: 'homelog-event-cache',
  
  // DM message store - contains encrypted DMs
  DM_MESSAGES: 'homelog-dm-messages',
} as const;

interface PersistentStorageState {
  isSupported: boolean;
  isPersisted: boolean;
  isChecking: boolean;
  usage: number;
  quota: number;
}

/**
 * Hook to manage browser persistent storage
 * 
 * Automatically requests persistent storage if the user has enabled the preference.
 * This protects cached data from automatic browser cleanup.
 */
export function usePersistentStorage() {
  const [state, setState] = useState<PersistentStorageState>({
    isSupported: true,
    isPersisted: false,
    isChecking: true,
    usage: 0,
    quota: 0,
  });

  // Check storage status
  const checkStatus = useCallback(async () => {
    if (!navigator.storage || !navigator.storage.persist) {
      setState(prev => ({ ...prev, isSupported: false, isChecking: false }));
      return;
    }

    try {
      const [persisted, estimate] = await Promise.all([
        navigator.storage.persisted(),
        navigator.storage.estimate(),
      ]);

      setState({
        isSupported: true,
        isPersisted: persisted,
        isChecking: false,
        usage: estimate.usage || 0,
        quota: estimate.quota || 0,
      });
    } catch (error) {
      console.error('[PersistentStorage] Failed to check status:', error);
      setState(prev => ({ ...prev, isSupported: false, isChecking: false }));
    }
  }, []);

  // Request persistent storage
  const requestPersistence = useCallback(async (): Promise<boolean> => {
    if (!navigator.storage || !navigator.storage.persist) {
      return false;
    }

    try {
      const granted = await navigator.storage.persist();
      
      if (granted) {
        setState(prev => ({ ...prev, isPersisted: true }));
        console.log('[PersistentStorage] Persistent storage granted');
      } else {
        console.log('[PersistentStorage] Persistent storage denied');
      }
      
      return granted;
    } catch (error) {
      console.error('[PersistentStorage] Failed to request persistence:', error);
      return false;
    }
  }, []);

  // Check and auto-request persistence based on user preference
  useEffect(() => {
    const init = async () => {
      await checkStatus();
      
      // Check if user has enabled persistent storage preference
      try {
        const prefValue = localStorage.getItem(SAFE_STORAGE_KEYS.PERSISTENT_STORAGE_PREF);
        const prefEnabled = prefValue ? JSON.parse(prefValue) === true : false;
        
        if (prefEnabled && navigator.storage?.persist) {
          const alreadyPersisted = await navigator.storage.persisted();
          
          if (!alreadyPersisted) {
            // Try to request persistence
            await requestPersistence();
          }
        }
      } catch (error) {
        console.error('[PersistentStorage] Failed to check preference:', error);
      }
    };

    init();
  }, [checkStatus, requestPersistence]);

  return {
    ...state,
    checkStatus,
    requestPersistence,
  };
}

/**
 * Get a list of localStorage keys currently in use by the app
 */
export function getAppLocalStorageKeys(): string[] {
  const keys: string[] = [];
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key) {
      // Filter to only include keys that look like they belong to our app
      if (
        key.startsWith('homelog') ||
        key.startsWith('nostr:') ||
        key.startsWith('nwc-')
      ) {
        keys.push(key);
      }
    }
  }
  
  return keys;
}

/**
 * Categorize a storage key as safe or sensitive
 */
export function categorizeStorageKey(key: string): 'safe' | 'sensitive' | 'unknown' {
  // Check safe keys
  const safeValues = Object.values(SAFE_STORAGE_KEYS);
  if (safeValues.includes(key as typeof safeValues[number])) {
    return 'safe';
  }
  
  // Check sensitive keys
  const sensitiveValues = Object.values(SENSITIVE_STORAGE_KEYS);
  if (sensitiveValues.includes(key as typeof sensitiveValues[number])) {
    return 'sensitive';
  }
  
  return 'unknown';
}

/**
 * Format bytes to human readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
