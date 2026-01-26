import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import { useCurrentUser } from './useCurrentUser';
import { useEffect, useState, useRef } from 'react';
import { 
  APPLIANCE_KIND, 
  VEHICLE_KIND, 
  MAINTENANCE_KIND, 
  COMPANY_KIND, 
  SUBSCRIPTION_KIND,
  WARRANTY_KIND,
  MAINTENANCE_COMPLETION_KIND,
} from '@/lib/types';
import { cacheEvents, getCachedEvents } from '@/lib/eventCache';

// Timeout for new users - if no data is found quickly, assume new user
const NEW_USER_FAST_TIMEOUT_MS = 3000;

// Cache result type for reuse
interface CacheCheckResult {
  appliances: number;
  vehicles: number;
  maintenance: number;
  companies: number;
  subscriptions: number;
  warranties: number;
  completions: number;
  hasAny: boolean;
}

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
  const queryClient = useQueryClient();
  const hasInvalidated = useRef(false);
  
  // Track whether we've checked the cache (this happens instantly before relay sync)
  const [cacheChecked, setCacheChecked] = useState(false);
  const [cacheResult, setCacheResult] = useState<CacheCheckResult | null>(null);
  
  // Reset invalidation flag when user changes
  useEffect(() => {
    hasInvalidated.current = false;
  }, [user?.pubkey]);

  // Check cache status immediately when user becomes available
  useEffect(() => {
    if (!user?.pubkey) {
      setCacheChecked(false);
      setCacheResult(null);
      return;
    }
    
    // Check cache instantly (IndexedDB is very fast)
    const checkCache = async () => {
      const [cachedAppliances, cachedVehicles, cachedMaintenance, cachedCompanies, cachedSubscriptions, cachedWarranties, cachedCompletions] = await Promise.all([
        getCachedEvents([APPLIANCE_KIND], user.pubkey),
        getCachedEvents([VEHICLE_KIND], user.pubkey),
        getCachedEvents([MAINTENANCE_KIND], user.pubkey),
        getCachedEvents([COMPANY_KIND], user.pubkey),
        getCachedEvents([SUBSCRIPTION_KIND], user.pubkey),
        getCachedEvents([WARRANTY_KIND], user.pubkey),
        getCachedEvents([MAINTENANCE_COMPLETION_KIND], user.pubkey),
      ]);
      
      const result: CacheCheckResult = {
        appliances: cachedAppliances.length,
        vehicles: cachedVehicles.length,
        maintenance: cachedMaintenance.length,
        companies: cachedCompanies.length,
        subscriptions: cachedSubscriptions.length,
        warranties: cachedWarranties.length,
        completions: cachedCompletions.length,
        hasAny: cachedAppliances.length > 0 ||
          cachedVehicles.length > 0 ||
          cachedMaintenance.length > 0 ||
          cachedCompanies.length > 0 ||
          cachedSubscriptions.length > 0 ||
          cachedWarranties.length > 0 ||
          cachedCompletions.length > 0,
      };
      
      setCacheResult(result);
      setCacheChecked(true);
    };
    
    checkCache();
  }, [user?.pubkey]);

  // Main sync query - fetches all data types in one efficient request
  const { data: syncStatus, isLoading: isSyncing } = useQuery({
    queryKey: ['data-sync-status', user?.pubkey, cacheResult?.hasAny],
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
            warranties: { synced: false, count: 0 },
            completions: { synced: false, count: 0 },
          }
        };
      }

      // Reuse cache check result from state instead of re-reading IndexedDB
      const hasAnyCachedData = cacheResult?.hasAny ?? false;

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
            { kinds: [WARRANTY_KIND], authors: [user.pubkey] },
            { kinds: [MAINTENANCE_COMPLETION_KIND], authors: [user.pubkey] },
            { kinds: [5], authors: [user.pubkey] }, // Deletion events
          ],
          { signal: AbortSignal.any([signal, AbortSignal.timeout(timeoutMs)]) }
        );

        // Cache all events for other hooks to use
        if (events.length > 0) {
          await cacheEvents(events);
          
          // Invalidate all data queries so they re-read from the now-populated cache
          // when they next become active (i.e., when the dashboard renders)
          // Using invalidateQueries instead of refetchQueries because the queries
          // might not be active yet (dashboard hasn't rendered during loading)
          if (!hasInvalidated.current) {
            hasInvalidated.current = true;
            queryClient.invalidateQueries({ queryKey: ['appliances'] });
            queryClient.invalidateQueries({ queryKey: ['vehicles'] });
            queryClient.invalidateQueries({ queryKey: ['maintenance'] });
            queryClient.invalidateQueries({ queryKey: ['companies'] });
            queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
            queryClient.invalidateQueries({ queryKey: ['warranties'] });
            queryClient.invalidateQueries({ queryKey: ['maintenance-completions'] });
          }
        }

        // Count events by type (excluding deletion events)
        const applianceCount = events.filter(e => e.kind === APPLIANCE_KIND).length;
        const vehicleCount = events.filter(e => e.kind === VEHICLE_KIND).length;
        const maintenanceCount = events.filter(e => e.kind === MAINTENANCE_KIND).length;
        const companyCount = events.filter(e => e.kind === COMPANY_KIND).length;
        const subscriptionCount = events.filter(e => e.kind === SUBSCRIPTION_KIND).length;
        const warrantyCount = events.filter(e => e.kind === WARRANTY_KIND).length;
        const completionCount = events.filter(e => e.kind === MAINTENANCE_COMPLETION_KIND).length;

        return {
          synced: true,
          hasAnyData: events.length > 0,
          categories: {
            appliances: { synced: true, count: applianceCount },
            vehicles: { synced: true, count: vehicleCount },
            maintenance: { synced: true, count: maintenanceCount },
            companies: { synced: true, count: companyCount },
            subscriptions: { synced: true, count: subscriptionCount },
            warranties: { synced: true, count: warrantyCount },
            completions: { synced: true, count: completionCount },
          }
        };
      } catch {
        // If sync fails but we have cached data, consider it "synced" with cache
        if (hasAnyCachedData && cacheResult) {
          return {
            synced: true,
            hasAnyData: true,
            categories: {
              appliances: { synced: true, count: cacheResult.appliances },
              vehicles: { synced: true, count: cacheResult.vehicles },
              maintenance: { synced: true, count: cacheResult.maintenance },
              companies: { synced: true, count: cacheResult.companies },
              subscriptions: { synced: true, count: cacheResult.subscriptions },
              warranties: { synced: true, count: cacheResult.warranties },
              completions: { synced: true, count: cacheResult.completions },
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
            warranties: { synced: true, count: 0 },
            completions: { synced: true, count: 0 },
          }
        };
      }
    },
    enabled: !!user?.pubkey && cacheChecked, // Only run after cache check completes
    staleTime: 0, // Always fetch fresh - don't use cached sync status
    gcTime: 0, // Don't keep old sync results in memory
    retry: 1,
  });

  return {
    isSyncing: !syncStatus?.synced && isSyncing,
    isSynced: syncStatus?.synced ?? false,
    hasAnyData: syncStatus?.hasAnyData ?? false,
    // These are available immediately after cache check (before relay sync)
    cacheChecked,
    hasCachedData: cacheResult?.hasAny ?? false,
    categories: syncStatus?.categories ?? {
      appliances: { synced: false, count: 0 },
      vehicles: { synced: false, count: 0 },
      maintenance: { synced: false, count: 0 },
      companies: { synced: false, count: 0 },
      subscriptions: { synced: false, count: 0 },
      warranties: { synced: false, count: 0 },
      completions: { synced: false, count: 0 },
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
