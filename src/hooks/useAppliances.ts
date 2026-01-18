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

export function useAppliances() {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();

  return useQuery({
    queryKey: ['appliances', user?.pubkey],
    queryFn: async (c) => {
      if (!user?.pubkey) return [];
      
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(5000)]);
      const events = await nostr.query(
        [{ kinds: [APPLIANCE_KIND], authors: [user.pubkey] }],
        { signal }
      );

      const appliances: Appliance[] = [];
      for (const event of events) {
        const appliance = parseAppliance(event);
        if (appliance) {
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

    await queryClient.invalidateQueries({ queryKey: ['appliances'] });
    await queryClient.invalidateQueries({ queryKey: ['maintenance'] });
  };

  return { createAppliance, updateAppliance, deleteAppliance };
}
