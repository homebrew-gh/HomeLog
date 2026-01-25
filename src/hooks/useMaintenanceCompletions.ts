import { useNostr } from '@nostrify/react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { NostrEvent } from '@nostrify/nostrify';
import { useEffect, useRef } from 'react';

import { useCurrentUser } from './useCurrentUser';
import { useNostrPublish } from './useNostrPublish';
import { MAINTENANCE_COMPLETION_KIND, MAINTENANCE_KIND, type MaintenanceCompletion } from '@/lib/types';
import { cacheEvents, getCachedEvents, deleteCachedEventById } from '@/lib/eventCache';

// Helper to get tag value
function getTagValue(event: NostrEvent, tagName: string): string | undefined {
  return event.tags.find(([name]) => name === tagName)?.[1];
}

// Parse a Nostr event into a MaintenanceCompletion object
function parseCompletion(event: NostrEvent): MaintenanceCompletion | null {
  const id = event.id;
  const completedDate = getTagValue(event, 'completed_date');
  const mileageAtCompletion = getTagValue(event, 'mileage_at_completion');
  const notes = getTagValue(event, 'notes');
  
  // Get maintenance reference from 'a' tag
  const aTag = event.tags.find(([name]) => name === 'a')?.[1];
  const maintenanceId = aTag?.split(':')[2]; // Format: kind:pubkey:d-tag
  
  if (!id || !completedDate || !maintenanceId) return null;

  return {
    id,
    maintenanceId,
    completedDate,
    mileageAtCompletion,
    notes,
    pubkey: event.pubkey,
    createdAt: event.created_at,
  };
}

// Extract deleted completion IDs from kind 5 events
function getDeletedCompletionIds(deletionEvents: NostrEvent[]): Set<string> {
  const deletedIds = new Set<string>();
  
  for (const event of deletionEvents) {
    for (const tag of event.tags) {
      if (tag[0] === 'e') {
        deletedIds.add(tag[1]);
      }
    }
  }
  
  return deletedIds;
}

// Parse events into maintenance completions
function parseEventsToCompletions(events: NostrEvent[]): MaintenanceCompletion[] {
  // Separate completion events from deletion events
  const completionEvents = events.filter(e => e.kind === MAINTENANCE_COMPLETION_KIND);
  const deletionEvents = events.filter(e => e.kind === 5);
  
  // Get the set of deleted completion IDs
  const deletedIds = getDeletedCompletionIds(deletionEvents);

  const completions: MaintenanceCompletion[] = [];
  for (const event of completionEvents) {
    const completion = parseCompletion(event);
    // Only include completions that haven't been deleted
    if (completion && !deletedIds.has(completion.id)) {
      completions.push(completion);
    }
  }

  // Sort by completed date (newest first)
  return completions.sort((a, b) => {
    // Parse MM/DD/YYYY dates for comparison
    const parseDate = (dateStr: string) => {
      const parts = dateStr.split('/');
      if (parts.length !== 3) return 0;
      return new Date(parseInt(parts[2]), parseInt(parts[0]) - 1, parseInt(parts[1])).getTime();
    };
    return parseDate(b.completedDate) - parseDate(a.completedDate);
  });
}

export function useMaintenanceCompletions() {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const queryClient = useQueryClient();
  const isSyncing = useRef(false);

  // Main query - loads from cache first
  const query = useQuery({
    queryKey: ['maintenance-completions', user?.pubkey],
    queryFn: async () => {
      if (!user?.pubkey) return [];

      console.log('[useMaintenanceCompletions] Loading from cache for pubkey:', user.pubkey);

      // Load from cache first (instant)
      const cachedEvents = await getCachedEvents([MAINTENANCE_COMPLETION_KIND, 5], user.pubkey);
      
      if (cachedEvents.length > 0) {
        console.log('[useMaintenanceCompletions] Found cached events:', cachedEvents.length);
        const completions = parseEventsToCompletions(cachedEvents);
        return completions;
      }

      console.log('[useMaintenanceCompletions] No cache, waiting for relay sync...');
      return [];
    },
    enabled: !!user?.pubkey,
    staleTime: Infinity,
  });

  // Background sync with relays
  useEffect(() => {
    if (!user?.pubkey || isSyncing.current) return;

    const syncWithRelays = async () => {
      isSyncing.current = true;
      console.log('[useMaintenanceCompletions] Starting background relay sync...');

      try {
        const signal = AbortSignal.timeout(15000);
        
        const events = await nostr.query(
          [
            { kinds: [MAINTENANCE_COMPLETION_KIND], authors: [user.pubkey] },
            { kinds: [5], authors: [user.pubkey] },
          ],
          { signal }
        );

        console.log('[useMaintenanceCompletions] Relay sync received events:', events.length);

        if (events.length > 0) {
          await cacheEvents(events);
        }

        const completions = parseEventsToCompletions(events);
        queryClient.setQueryData(['maintenance-completions', user.pubkey], completions);
        
        console.log('[useMaintenanceCompletions] Background sync complete, completions:', completions.length);
      } catch (error) {
        console.error('[useMaintenanceCompletions] Background sync failed:', error);
      } finally {
        isSyncing.current = false;
      }
    };

    const timer = setTimeout(syncWithRelays, 100);
    return () => clearTimeout(timer);
  }, [user?.pubkey, nostr, queryClient]);

  return query;
}

export function useCompletionsByMaintenance(maintenanceId: string | undefined) {
  const { data: completions } = useMaintenanceCompletions();
  if (!maintenanceId) return [];
  return completions?.filter(c => c.maintenanceId === maintenanceId) || [];
}

export function useMaintenanceCompletionActions() {
  const { user } = useCurrentUser();
  const { mutateAsync: publishEvent } = useNostrPublish();
  const queryClient = useQueryClient();

  const createCompletion = async (
    maintenanceId: string, 
    completedDate: string, 
    mileageAtCompletion?: string,
    notes?: string
  ) => {
    if (!user) throw new Error('Must be logged in');

    const tags: string[][] = [
      ['a', `${MAINTENANCE_KIND}:${user.pubkey}:${maintenanceId}`, '', 'maintenance'],
      ['alt', `Maintenance completed on ${completedDate}`],
      ['completed_date', completedDate],
    ];

    // Add optional mileage tag
    if (mileageAtCompletion) {
      tags.push(['mileage_at_completion', mileageAtCompletion]);
    }

    // Add optional notes tag
    if (notes) {
      tags.push(['notes', notes]);
    }

    const event = await publishEvent({
      kind: MAINTENANCE_COMPLETION_KIND,
      content: '',
      tags,
    });

    if (event) {
      await cacheEvents([event]);
    }

    // Small delay to allow the event to propagate
    await new Promise(resolve => setTimeout(resolve, 500));

    await queryClient.refetchQueries({ queryKey: ['maintenance-completions'] });
  };

  const deleteCompletion = async (id: string) => {
    if (!user) throw new Error('Must be logged in');

    const event = await publishEvent({
      kind: 5,
      content: 'Deleted maintenance completion',
      tags: [
        ['e', id],
      ],
    });

    if (event) {
      await cacheEvents([event]);
      await deleteCachedEventById(id);
    }

    await new Promise(resolve => setTimeout(resolve, 500));
    await queryClient.refetchQueries({ queryKey: ['maintenance-completions'] });
  };

  return { createCompletion, deleteCompletion };
}
