import { useNostr } from '@nostrify/react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { NostrEvent } from '@nostrify/nostrify';

import { useCurrentUser } from './useCurrentUser';
import { useNostrPublish } from './useNostrPublish';
import { MAINTENANCE_COMPLETION_KIND, MAINTENANCE_KIND, type MaintenanceCompletion } from '@/lib/types';

// Helper to get tag value
function getTagValue(event: NostrEvent, tagName: string): string | undefined {
  return event.tags.find(([name]) => name === tagName)?.[1];
}

// Parse a Nostr event into a MaintenanceCompletion object
function parseCompletion(event: NostrEvent): MaintenanceCompletion | null {
  const id = event.id;
  const completedDate = getTagValue(event, 'completed_date');
  
  // Get maintenance reference from 'a' tag
  const aTag = event.tags.find(([name]) => name === 'a')?.[1];
  const maintenanceId = aTag?.split(':')[2]; // Format: kind:pubkey:d-tag
  
  if (!id || !completedDate || !maintenanceId) return null;

  return {
    id,
    maintenanceId,
    completedDate,
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

export function useMaintenanceCompletions() {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();

  return useQuery({
    queryKey: ['maintenance-completions', user?.pubkey],
    queryFn: async (c) => {
      if (!user?.pubkey) return [];
      
      // Longer timeout for mobile/PWA mode where network might be slower
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(15000)]);
      
      // Query both completion events and deletion events
      const events = await nostr.query(
        [
          { kinds: [MAINTENANCE_COMPLETION_KIND], authors: [user.pubkey] },
          { kinds: [5], authors: [user.pubkey] },
        ],
        { signal }
      );

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
    },
    enabled: !!user?.pubkey,
  });
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

  const createCompletion = async (maintenanceId: string, completedDate: string) => {
    if (!user) throw new Error('Must be logged in');

    const tags: string[][] = [
      ['a', `${MAINTENANCE_KIND}:${user.pubkey}:${maintenanceId}`, '', 'maintenance'],
      ['alt', `Maintenance completed on ${completedDate}`],
      ['completed_date', completedDate],
    ];

    await publishEvent({
      kind: MAINTENANCE_COMPLETION_KIND,
      content: '',
      tags,
    });

    // Small delay to allow the event to propagate
    await new Promise(resolve => setTimeout(resolve, 500));

    await queryClient.refetchQueries({ queryKey: ['maintenance-completions'] });
  };

  const deleteCompletion = async (id: string) => {
    if (!user) throw new Error('Must be logged in');

    await publishEvent({
      kind: 5,
      content: 'Deleted maintenance completion',
      tags: [
        ['e', id],
      ],
    });

    await new Promise(resolve => setTimeout(resolve, 500));
    await queryClient.refetchQueries({ queryKey: ['maintenance-completions'] });
  };

  return { createCompletion, deleteCompletion };
}
