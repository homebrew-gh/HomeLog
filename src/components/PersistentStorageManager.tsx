import { useEffect, useRef } from 'react';
import { SAFE_STORAGE_KEYS } from '@/hooks/usePersistentStorage';
import { logger } from '@/lib/logger';

/**
 * PersistentStorageManager
 * 
 * This component runs once on app startup and automatically requests
 * persistent storage if the user has previously enabled the preference.
 * 
 * Persistent storage protects the following from automatic browser cleanup:
 * - IndexedDB: Event cache, DM message cache
 * - localStorage: App preferences, widget order, encryption settings
 * 
 * This does NOT store any sensitive data like private keys.
 * All actual user data is encrypted and stored on Nostr relays.
 */
export function PersistentStorageManager() {
  const hasInitialized = useRef(false);

  useEffect(() => {
    // Only run once
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const initPersistentStorage = async () => {
      // Check if Storage API is available
      if (!navigator.storage || !navigator.storage.persist) {
        logger.log('[PersistentStorage] Storage API not available');
        return;
      }

      try {
        // Check if already persisted
        const alreadyPersisted = await navigator.storage.persisted();
        
        if (alreadyPersisted) {
          logger.log('[PersistentStorage] Storage is already persistent');
          return;
        }

        // Check user preference
        const prefValue = localStorage.getItem(SAFE_STORAGE_KEYS.PERSISTENT_STORAGE_PREF);
        const userWantsPersistence = prefValue ? JSON.parse(prefValue) === true : false;

        if (!userWantsPersistence) {
          logger.log('[PersistentStorage] User has not enabled persistent storage');
          return;
        }

        // Request persistent storage
        logger.log('[PersistentStorage] Requesting persistent storage...');
        const granted = await navigator.storage.persist();

        if (granted) {
          logger.log('[PersistentStorage] Persistent storage granted');
        } else {
          logger.log('[PersistentStorage] Persistent storage request denied by browser');
        }
      } catch (error) {
        logger.error('[PersistentStorage] Error initializing:', error);
      }
    };

    // Run after a short delay to not block initial render
    const timer = setTimeout(initPersistentStorage, 1000);
    
    return () => clearTimeout(timer);
  }, []);

  // This component doesn't render anything
  return null;
}
