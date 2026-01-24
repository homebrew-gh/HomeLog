import { useNostr } from '@nostrify/react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { NostrEvent } from '@nostrify/nostrify';

import { useCurrentUser } from './useCurrentUser';
import { useNostrPublish } from './useNostrPublish';
import { useEncryption } from './useEncryption';
import { useEncryptionSettings } from '@/contexts/EncryptionContext';
import { APPLIANCE_KIND, type Appliance } from '@/lib/types';

// Encrypted content marker
const ENCRYPTED_MARKER = 'nip44:';

// Helper to get tag value
function getTagValue(event: NostrEvent, tagName: string): string | undefined {
  return event.tags.find(([name]) => name === tagName)?.[1];
}

// Data stored in encrypted content
interface ApplianceData {
  model: string;
  manufacturer: string;
  purchaseDate: string;
  room: string;
  receiptUrl?: string;
  manualUrl?: string;
}

// Parse a Nostr event into an Appliance object (plaintext version)
function parseAppliancePlaintext(event: NostrEvent): Appliance | null {
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

// Parse encrypted appliance from content
async function parseApplianceEncrypted(
  event: NostrEvent,
  decryptFn: (content: string) => Promise<ApplianceData>
): Promise<Appliance | null> {
  const id = getTagValue(event, 'd');
  if (!id) return null;

  try {
    const data = await decryptFn(event.content);
    return {
      id,
      model: data.model,
      manufacturer: data.manufacturer || '',
      purchaseDate: data.purchaseDate || '',
      room: data.room || '',
      receiptUrl: data.receiptUrl,
      manualUrl: data.manualUrl,
      pubkey: event.pubkey,
      createdAt: event.created_at,
    };
  } catch (error) {
    console.error('[Appliances] Failed to decrypt appliance:', id, error);
    return null;
  }
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
  const { decryptForCategory } = useEncryption();

  return useQuery({
    queryKey: ['appliances', user?.pubkey],
    queryFn: async (c) => {
      if (!user?.pubkey) {
        console.log('[useAppliances] No user pubkey, returning empty array');
        return [];
      }

      console.log('[useAppliances] Fetching appliances for pubkey:', user.pubkey);

      // Longer timeout for mobile/PWA mode where network might be slower
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(15000)]);

      // Query both appliance events and deletion events in one request
      let events;
      try {
        events = await nostr.query(
          [
            { kinds: [APPLIANCE_KIND], authors: [user.pubkey] },
            { kinds: [5], authors: [user.pubkey] },
          ],
          { signal }
        );
        console.log('[useAppliances] Received events:', events.length);
      } catch (error) {
        console.error('[useAppliances] Query failed:', error);
        throw error;
      }

      // Separate appliance events from deletion events
      const applianceEvents = events.filter(e => e.kind === APPLIANCE_KIND);
      const deletionEvents = events.filter(e => e.kind === 5);

      console.log('[useAppliances] Appliance events:', applianceEvents.length, 'Deletion events:', deletionEvents.length);

      // Get the set of deleted appliance IDs
      const deletedIds = getDeletedApplianceIds(deletionEvents, user.pubkey);

      const appliances: Appliance[] = [];
      
      for (const event of applianceEvents) {
        const id = getTagValue(event, 'd');
        if (!id || deletedIds.has(id)) continue;

        // Check if content is encrypted
        if (event.content && event.content.startsWith(ENCRYPTED_MARKER)) {
          // Decrypt and parse
          const appliance = await parseApplianceEncrypted(
            event,
            (content) => decryptForCategory<ApplianceData>(content)
          );
          if (appliance) {
            appliances.push(appliance);
          }
        } else {
          // Parse plaintext from tags
          const appliance = parseAppliancePlaintext(event);
          if (appliance) {
            appliances.push(appliance);
          }
        }
      }

      console.log('[useAppliances] Parsed appliances:', appliances.length);

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
  const { encryptForCategory, shouldEncrypt } = useEncryption();
  const { isEncryptionEnabled } = useEncryptionSettings();

  const createAppliance = async (data: Omit<Appliance, 'id' | 'pubkey' | 'createdAt'>) => {
    if (!user) throw new Error('Must be logged in');

    const id = crypto.randomUUID();
    const useEncryption = isEncryptionEnabled('appliances');

    // Base tags (always included)
    const tags: string[][] = [
      ['d', id],
      ['alt', useEncryption ? 'Encrypted Home Log appliance data' : `Home appliance: ${data.model}`],
    ];

    let content = '';

    if (useEncryption && shouldEncrypt('appliances')) {
      // Store data in encrypted content
      const applianceData: ApplianceData = {
        model: data.model,
        manufacturer: data.manufacturer,
        purchaseDate: data.purchaseDate,
        room: data.room,
        receiptUrl: data.receiptUrl,
        manualUrl: data.manualUrl,
      };
      content = await encryptForCategory('appliances', applianceData);
    } else {
      // Store data in plaintext tags (legacy format)
      tags.push(['model', data.model]);
      if (data.manufacturer) tags.push(['manufacturer', data.manufacturer]);
      if (data.purchaseDate) tags.push(['purchase_date', data.purchaseDate]);
      if (data.room) tags.push(['room', data.room]);
      if (data.receiptUrl) tags.push(['receipt_url', data.receiptUrl]);
      if (data.manualUrl) tags.push(['manual_url', data.manualUrl]);
    }

    await publishEvent({
      kind: APPLIANCE_KIND,
      content,
      tags,
    });

    // Invalidate the query to refresh the list
    await queryClient.invalidateQueries({ queryKey: ['appliances'] });

    return id;
  };

  const updateAppliance = async (id: string, data: Omit<Appliance, 'id' | 'pubkey' | 'createdAt'>) => {
    if (!user) throw new Error('Must be logged in');

    const useEncryption = isEncryptionEnabled('appliances');

    // Base tags (always included)
    const tags: string[][] = [
      ['d', id],
      ['alt', useEncryption ? 'Encrypted Home Log appliance data' : `Home appliance: ${data.model}`],
    ];

    let content = '';

    if (useEncryption && shouldEncrypt('appliances')) {
      // Store data in encrypted content
      const applianceData: ApplianceData = {
        model: data.model,
        manufacturer: data.manufacturer,
        purchaseDate: data.purchaseDate,
        room: data.room,
        receiptUrl: data.receiptUrl,
        manualUrl: data.manualUrl,
      };
      content = await encryptForCategory('appliances', applianceData);
    } else {
      // Store data in plaintext tags (legacy format)
      tags.push(['model', data.model]);
      if (data.manufacturer) tags.push(['manufacturer', data.manufacturer]);
      if (data.purchaseDate) tags.push(['purchase_date', data.purchaseDate]);
      if (data.room) tags.push(['room', data.room]);
      if (data.receiptUrl) tags.push(['receipt_url', data.receiptUrl]);
      if (data.manualUrl) tags.push(['manual_url', data.manualUrl]);
    }

    await publishEvent({
      kind: APPLIANCE_KIND,
      content,
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
