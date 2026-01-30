import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import { useCurrentUser } from './useCurrentUser';
import { useAppContext } from './useAppContext';
import { useEffect, useState, useRef } from 'react';
import { 
  APPLIANCE_KIND, 
  VEHICLE_KIND, 
  MAINTENANCE_KIND, 
  COMPANY_KIND, 
  SUBSCRIPTION_KIND,
  WARRANTY_KIND,
  MAINTENANCE_COMPLETION_KIND,
  PET_KIND,
  PROJECT_KIND,
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
  pets: number;
  projects: number;
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
  const { config } = useAppContext();
  const queryClient = useQueryClient();
  const hasInvalidated = useRef(false);
  
  // Track whether we've checked the cache (this happens instantly before relay sync)
  const [cacheChecked, setCacheChecked] = useState(false);
  const [cacheResult, setCacheResult] = useState<CacheCheckResult | null>(null);
  
  // Reset invalidation flag when user or relays change
  useEffect(() => {
    hasInvalidated.current = false;
  }, [user?.pubkey, config.relayMetadata.updatedAt]);

  // Check cache status immediately when user becomes available
  useEffect(() => {
    if (!user?.pubkey) {
      setCacheChecked(false);
      setCacheResult(null);
      return;
    }
    
    // Check cache instantly (IndexedDB is very fast)
    const checkCache = async () => {
      console.log('[DataSync] Checking IndexedDB cache for pubkey:', user.pubkey);
      
      const [cachedAppliances, cachedVehicles, cachedMaintenance, cachedCompanies, cachedSubscriptions, cachedWarranties, cachedCompletions, cachedPets, cachedProjects] = await Promise.all([
        getCachedEvents([APPLIANCE_KIND], user.pubkey),
        getCachedEvents([VEHICLE_KIND], user.pubkey),
        getCachedEvents([MAINTENANCE_KIND], user.pubkey),
        getCachedEvents([COMPANY_KIND], user.pubkey),
        getCachedEvents([SUBSCRIPTION_KIND], user.pubkey),
        getCachedEvents([WARRANTY_KIND], user.pubkey),
        getCachedEvents([MAINTENANCE_COMPLETION_KIND], user.pubkey),
        getCachedEvents([PET_KIND], user.pubkey),
        getCachedEvents([PROJECT_KIND], user.pubkey),
      ]);
      
      const result: CacheCheckResult = {
        appliances: cachedAppliances.length,
        vehicles: cachedVehicles.length,
        maintenance: cachedMaintenance.length,
        companies: cachedCompanies.length,
        subscriptions: cachedSubscriptions.length,
        warranties: cachedWarranties.length,
        completions: cachedCompletions.length,
        pets: cachedPets.length,
        projects: cachedProjects.length,
        hasAny: cachedAppliances.length > 0 ||
          cachedVehicles.length > 0 ||
          cachedMaintenance.length > 0 ||
          cachedCompanies.length > 0 ||
          cachedSubscriptions.length > 0 ||
          cachedWarranties.length > 0 ||
          cachedCompletions.length > 0 ||
          cachedPets.length > 0 ||
          cachedProjects.length > 0,
      };
      
      console.log('[DataSync] Cache check result:', result);
      setCacheResult(result);
      setCacheChecked(true);
    };
    
    checkCache();
  }, [user?.pubkey]);

  // Main sync query - fetches all data types in one efficient request
  // Include relay updatedAt in query key so we re-fetch when relays change
  const { data: syncStatus, isLoading: isSyncing } = useQuery({
    queryKey: ['data-sync-status', user?.pubkey, config.relayMetadata.updatedAt],
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
            pets: { synced: false, count: 0 },
            projects: { synced: false, count: 0 },
          }
        };
      }

      // Small delay to allow relay connections to establish after relay list changes
      await new Promise(resolve => setTimeout(resolve, 500));

      // Reuse cache check result from state instead of re-reading IndexedDB
      const hasAnyCachedData = cacheResult?.hasAny ?? false;

      // Use a shorter timeout for new users (no cache) to avoid long waits
      // when there's nothing to fetch from relays
      const timeoutMs = hasAnyCachedData ? 20000 : NEW_USER_FAST_TIMEOUT_MS;

      try {
        console.log('[DataSync] Starting relay query for pubkey:', user.pubkey);
        console.log('[DataSync] Timeout:', timeoutMs, 'ms, Has cached data:', hasAnyCachedData);
        
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
            { kinds: [PET_KIND], authors: [user.pubkey] },
            { kinds: [PROJECT_KIND], authors: [user.pubkey] },
            { kinds: [5], authors: [user.pubkey] }, // Deletion events
          ],
          { signal: AbortSignal.any([signal, AbortSignal.timeout(timeoutMs)]) }
        );

        console.log('[DataSync] Query complete. Events found:', events.length);
        console.log('[DataSync] Events by kind:', {
          appliances: events.filter(e => e.kind === APPLIANCE_KIND).length,
          vehicles: events.filter(e => e.kind === VEHICLE_KIND).length,
          maintenance: events.filter(e => e.kind === MAINTENANCE_KIND).length,
          companies: events.filter(e => e.kind === COMPANY_KIND).length,
          subscriptions: events.filter(e => e.kind === SUBSCRIPTION_KIND).length,
          warranties: events.filter(e => e.kind === WARRANTY_KIND).length,
          completions: events.filter(e => e.kind === MAINTENANCE_COMPLETION_KIND).length,
          projects: events.filter(e => e.kind === PROJECT_KIND).length,
          pets: events.filter(e => e.kind === PET_KIND).length,
          deletions: events.filter(e => e.kind === 5).length,
        });

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
            queryClient.invalidateQueries({ queryKey: ['pets'] });
            queryClient.invalidateQueries({ queryKey: ['projects'] });
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
        const petCount = events.filter(e => e.kind === PET_KIND).length;
        const projectCount = events.filter(e => e.kind === PROJECT_KIND).length;

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
            pets: { synced: true, count: petCount },
            projects: { synced: true, count: projectCount },
          }
        };
      } catch (error) {
        console.error('[DataSync] Relay query failed:', error);
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
              pets: { synced: true, count: cacheResult.pets },
              projects: { synced: true, count: cacheResult.projects },
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
            pets: { synced: true, count: 0 },
            projects: { synced: true, count: 0 },
          }
        };
      }
    },
    enabled: !!user?.pubkey && cacheChecked, // Only run after cache check completes
    staleTime: 30000, // Re-fetch after 30 seconds to catch relay changes
    gcTime: Infinity, // Keep in memory for the session
    refetchOnWindowFocus: false,
    retry: 1,
  });

  return {
    // Syncing if query is loading OR query hasn't even started yet (waiting for cache check)
    isSyncing: isSyncing || (!syncStatus?.synced && !cacheChecked),
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
      pets: { synced: false, count: 0 },
      projects: { synced: false, count: 0 },
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
