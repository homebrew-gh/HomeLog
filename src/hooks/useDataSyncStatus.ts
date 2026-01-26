import { useQuery } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import { useCurrentUser } from './useCurrentUser';
import { useCallback, useEffect, useRef, useState } from 'react';
import { 
  APPLIANCE_KIND, 
  VEHICLE_KIND, 
  MAINTENANCE_KIND, 
  COMPANY_KIND, 
  SUBSCRIPTION_KIND 
} from '@/lib/types';
import { cacheEvents, getCachedEvents } from '@/lib/eventCache';

// Timeout for new users - if no data is found quickly, assume new user
const NEW_USER_FAST_TIMEOUT_MS = 3000;

/**
 * Hook to track data synchronization status across all data types.
 * 
 * This hook performs initial sync with relays and tracks progress.
 * It returns whether sync is complete and the sync progress.
 * 
 * For new users with no cached data, uses a faster timeout to avoid
 * long waits when there's nothing to fetch from relays.
 */
export function useDataSyncStatus() {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const syncStarted = useRef(false);
  
  // Track whether we've checked the cache (this happens instantly before relay sync)
  const [cacheChecked, setCacheChecked] = useState(false);
  const [hasCachedData, setHasCachedData] = useState(false);
  
  // Check cache status immediately when user becomes available
  useEffect(() => {
    if (!user?.pubkey) {
      setCacheChecked(false);
      setHasCachedData(false);
      return;
    }
    
    // Check cache instantly (IndexedDB is very fast)
    const checkCache = async () => {
      const cachedAppliances = await getCachedEvents([APPLIANCE_KIND], user.pubkey);
      const cachedVehicles = await getCachedEvents([VEHICLE_KIND], user.pubkey);
      const cachedMaintenance = await getCachedEvents([MAINTENANCE_KIND], user.pubkey);
      const cachedCompanies = await getCachedEvents([COMPANY_KIND], user.pubkey);
      const cachedSubscriptions = await getCachedEvents([SUBSCRIPTION_KIND], user.pubkey);
      
      const hasAny = 
        cachedAppliances.length > 0 ||
        cachedVehicles.length > 0 ||
        cachedMaintenance.length > 0 ||
        cachedCompanies.length > 0 ||
        cachedSubscriptions.length > 0;
      
      setHasCachedData(hasAny);
      setCacheChecked(true);
    };
    
    checkCache();
  }, [user?.pubkey]);

  // Main sync query - fetches all data types in one efficient request
  const { data: syncStatus, isLoading: isSyncing, isFetched } = useQuery({
    queryKey: ['data-sync-status', user?.pubkey, hasCachedData],
    queryFn: async ({ signal }) => {
      if (!user?.pubkey) {
        return { 
          synced: false, 
          hasAnyData: false,
          hadCachedData: false,
          categories: {
            appliances: { synced: false, count: 0 },
            vehicles: { synced: false, count: 0 },
            maintenance: { synced: false, count: 0 },
            companies: { synced: false, count: 0 },
            subscriptions: { synced: false, count: 0 },
          }
        };
      }

      // First, check if we have any cached data (instant)
      const cachedAppliances = await getCachedEvents([APPLIANCE_KIND], user.pubkey);
      const cachedVehicles = await getCachedEvents([VEHICLE_KIND], user.pubkey);
      const cachedMaintenance = await getCachedEvents([MAINTENANCE_KIND], user.pubkey);
      const cachedCompanies = await getCachedEvents([COMPANY_KIND], user.pubkey);
      const cachedSubscriptions = await getCachedEvents([SUBSCRIPTION_KIND], user.pubkey);
      
      const hasAnyCachedData = 
        cachedAppliances.length > 0 ||
        cachedVehicles.length > 0 ||
        cachedMaintenance.length > 0 ||
        cachedCompanies.length > 0 ||
        cachedSubscriptions.length > 0;

      // If we have cached data, we can show it while syncing continues
      // But still perform sync to get fresh data
      
      // Use a shorter timeout for new users (no cache) to avoid long waits
      // when there's nothing to fetch from relays
      const timeoutMs = hasAnyCachedData ? 20000 : NEW_USER_FAST_TIMEOUT_MS;

      try {
        // Fetch all data types in one query for efficiency
        const events = await nostr.query(
          [
            { kinds: [APPLIANCE_KIND], authors: [user.pubkey] },
            { kinds: [VEHICLE_KIND], authors: [user.pubkey] },
            { kinds: [MAINTENANCE_KIND], authors: [user.pubkey] },
            { kinds: [COMPANY_KIND], authors: [user.pubkey] },
            { kinds: [SUBSCRIPTION_KIND], authors: [user.pubkey] },
            { kinds: [5], authors: [user.pubkey] }, // Deletion events
          ],
          { signal: AbortSignal.any([signal, AbortSignal.timeout(timeoutMs)]) }
        );

        console.log('[useDataSyncStatus] Sync complete, received', events.length, 'events (timeout was', timeoutMs, 'ms)');

        // Cache all events for other hooks to use
        if (events.length > 0) {
          await cacheEvents(events);
        }

        // Count events by type (excluding deletion events)
        const applianceCount = events.filter(e => e.kind === APPLIANCE_KIND).length;
        const vehicleCount = events.filter(e => e.kind === VEHICLE_KIND).length;
        const maintenanceCount = events.filter(e => e.kind === MAINTENANCE_KIND).length;
        const companyCount = events.filter(e => e.kind === COMPANY_KIND).length;
        const subscriptionCount = events.filter(e => e.kind === SUBSCRIPTION_KIND).length;

        return {
          synced: true,
          hasAnyData: events.length > 0,
          categories: {
            appliances: { synced: true, count: applianceCount },
            vehicles: { synced: true, count: vehicleCount },
            maintenance: { synced: true, count: maintenanceCount },
            companies: { synced: true, count: companyCount },
            subscriptions: { synced: true, count: subscriptionCount },
          }
        };
      } catch (error) {
        console.error('[useDataSyncStatus] Sync failed:', error);
        
        // If sync fails but we have cached data, consider it "synced" with cache
        if (hasAnyCachedData) {
          return {
            synced: true,
            hasAnyData: true,
            categories: {
              appliances: { synced: true, count: cachedAppliances.length },
              vehicles: { synced: true, count: cachedVehicles.length },
              maintenance: { synced: true, count: cachedMaintenance.length },
              companies: { synced: true, count: cachedCompanies.length },
              subscriptions: { synced: true, count: cachedSubscriptions.length },
            }
          };
        }
        
        // No cache and sync failed - still mark as synced to avoid infinite loading
        return {
          synced: true,
          hasAnyData: false,
          categories: {
            appliances: { synced: true, count: 0 },
            vehicles: { synced: true, count: 0 },
            maintenance: { synced: true, count: 0 },
            companies: { synced: true, count: 0 },
            subscriptions: { synced: true, count: 0 },
          }
        };
      }
    },
    enabled: !!user?.pubkey,
    staleTime: 60000, // Consider synced for 1 minute
    gcTime: Infinity,
    retry: 1,
  });

  return {
    isSyncing: !syncStatus?.synced && isSyncing,
    isSynced: syncStatus?.synced ?? false,
    hasAnyData: syncStatus?.hasAnyData ?? false,
    // These are available immediately after cache check (before relay sync)
    cacheChecked,
    hasCachedData,
    categories: syncStatus?.categories ?? {
      appliances: { synced: false, count: 0 },
      vehicles: { synced: false, count: 0 },
      maintenance: { synced: false, count: 0 },
      companies: { synced: false, count: 0 },
      subscriptions: { synced: false, count: 0 },
    },
  };
}

/**
 * Hook to check if initial data sync is in progress.
 * Use this to show loading indicators while data is being fetched.
 */
export function useIsInitialSyncing() {
  const { isSyncing, isSynced } = useDataSyncStatus();
  return isSyncing && !isSynced;
}
