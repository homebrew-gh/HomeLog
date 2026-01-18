import { useNostr } from '@nostrify/react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { NostrEvent } from '@nostrify/nostrify';

import { useCurrentUser } from './useCurrentUser';
import { useNostrPublish } from './useNostrPublish';
import { APPLIANCE_KIND, type Appliance } from '@/lib/types';

// Helper to get tag value
function getTagValue(event: NostrEvent, tagName: string): string | undefined {
  return event.tags.find(([name]) => name === tagName)?.[1];
}

// Parse a Nostr event into an Appliance object
function parseAppliance(event: NostrEvent): Appliance | null {
  const id = getTagValue(event, 'd');
  const model = getTagValue(event, 'model');

  if (!id || !model) return null;

  return {
    id,
    model,
    manufacturer: getTagValue(event, 'manufacturer') || '',
    purchaseDate: getTagValue(event, 'purchase_date') || '',
    room: getTagValue(event, 'room') || '',
    receiptUrl: getTagValue(event, 'receipt_url'),
    manualUrl: getTagValue(event, 'manual_url'),
    pubkey: event.pubkey,
    createdAt: event.created_at,
  };
}

// Extract deleted appliance IDs from kind 5 events
function getDeletedApplianceIds(deletionEvents: NostrEvent[], pubkey: string): Set<string> {
  const deletedIds = new Set<string>();

  for (const event of deletionEvents) {
    for (const tag of event.tags) {
      if (tag[0] === 'a') {
        // Parse "kind:pubkey:d-tag" format
        const parts = tag[1].split(':');
        if (parts.length >= 3 && parts[0] === String(APPLIANCE_KIND) && parts[1] === pubkey) {
          deletedIds.add(parts[2]);
        }
      }
    }
  }

  return deletedIds;
}

export function useAppliances() {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();

  return useQuery({
    queryKey: ['appliances', user?.pubkey],
    queryFn: async (c) => {
      if (!user?.pubkey) return [];

      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(5000)]);

      // Query both appliance events and deletion events in one request
      const events = await nostr.query(
        [
          { kinds: [APPLIANCE_KIND], authors: [user.pubkey] },
          { kinds: [5], authors: [user.pubkey] },
        ],
        { signal }
      );

      // Separate appliance events from deletion events
      const applianceEvents = events.filter(e => e.kind === APPLIANCE_KIND);
      const deletionEvents = events.filter(e => e.kind === 5);

      // Get the set of deleted appliance IDs
      const deletedIds = getDeletedApplianceIds(deletionEvents, user.pubkey);

      const appliances: Appliance[] = [];
      for (const event of applianceEvents) {
        const appliance = parseAppliance(event);
        // Only include appliances that haven't been deleted
        if (appliance && !deletedIds.has(appliance.id)) {
          appliances.push(appliance);
        }
      }

      // Sort by creation date (newest first)
      return appliances.sort((a, b) => b.createdAt - a.createdAt);
    },
    enabled: !!user?.pubkey,
  });
}

export function useApplianceById(id: string | undefined) {
  const { data: appliances } = useAppliances();
  return appliances?.find(a => a.id === id);
}

export function useApplianceActions() {
  const { user } = useCurrentUser();
  const { mutateAsync: publishEvent } = useNostrPublish();
  const queryClient = useQueryClient();

  const createAppliance = async (data: Omit<Appliance, 'id' | 'pubkey' | 'createdAt'>) => {
    if (!user) throw new Error('Must be logged in');

    const id = crypto.randomUUID();
    const tags: string[][] = [
      ['d', id],
      ['alt', `Home appliance: ${data.model}`],
      ['model', data.model],
    ];

    if (data.manufacturer) tags.push(['manufacturer', data.manufacturer]);
    if (data.purchaseDate) tags.push(['purchase_date', data.purchaseDate]);
    if (data.room) tags.push(['room', data.room]);
    if (data.receiptUrl) tags.push(['receipt_url', data.receiptUrl]);
    if (data.manualUrl) tags.push(['manual_url', data.manualUrl]);

    await publishEvent({
      kind: APPLIANCE_KIND,
      content: '',
      tags,
    });

    // Invalidate the query to refresh the list
    await queryClient.invalidateQueries({ queryKey: ['appliances'] });

    return id;
  };

  const updateAppliance = async (id: string, data: Omit<Appliance, 'id' | 'pubkey' | 'createdAt'>) => {
    if (!user) throw new Error('Must be logged in');

    const tags: string[][] = [
      ['d', id],
      ['alt', `Home appliance: ${data.model}`],
      ['model', data.model],
    ];

    if (data.manufacturer) tags.push(['manufacturer', data.manufacturer]);
    if (data.purchaseDate) tags.push(['purchase_date', data.purchaseDate]);
    if (data.room) tags.push(['room', data.room]);
    if (data.receiptUrl) tags.push(['receipt_url', data.receiptUrl]);
    if (data.manualUrl) tags.push(['manual_url', data.manualUrl]);

    await publishEvent({
      kind: APPLIANCE_KIND,
      content: '',
      tags,
    });

    await queryClient.invalidateQueries({ queryKey: ['appliances'] });
  };

  const deleteAppliance = async (id: string) => {
    if (!user) throw new Error('Must be logged in');

    // Publish a deletion request (kind 5)
    await publishEvent({
      kind: 5,
      content: 'Deleted appliance',
      tags: [
        ['a', `${APPLIANCE_KIND}:${user.pubkey}:${id}`],
      ],
    });

    // Small delay to allow the deletion event to propagate to relays
    await new Promise(resolve => setTimeout(resolve, 500));

    // Force refetch to get updated data including the deletion event
    await queryClient.refetchQueries({ queryKey: ['appliances'] });
    await queryClient.refetchQueries({ queryKey: ['maintenance'] });
  };

  return { createAppliance, updateAppliance, deleteAppliance };
}
