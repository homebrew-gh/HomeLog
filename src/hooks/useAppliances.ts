/**
 * useAppliances - "My Stuff" Data Hook
 * 
 * NOTE: This hook manages data for the "My Stuff" tab (displayed in UI),
 * but uses "appliance" terminology in code for backwards compatibility
 * with existing Nostr events and data structures.
 * 
 * UI Label: "My Stuff"
 * Code/Data: "appliance" / "appliances"
 */
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { NostrEvent } from '@nostrify/nostrify';

import { useCurrentUser } from './useCurrentUser';
import { useNostrPublish } from './useNostrPublish';
import { logger } from '@/lib/logger';
import { useEncryption, isAbortError } from './useEncryption';
import { useEncryptionSettings } from '@/contexts/EncryptionContext';
import { APPLIANCE_KIND, type Appliance } from '@/lib/types';
import { cacheEvents, getCachedEvents, deleteCachedEventByAddress } from '@/lib/eventCache';

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
  price?: string;
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
    price: getTagValue(event, 'price'),
    room: getTagValue(event, 'room') || '',
    receiptUrl: getTagValue(event, 'receipt_url'),
    manualUrl: getTagValue(event, 'manual_url'),
    isArchived: getTagValue(event, 'is_archived') === 'true',
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
      price: data.price,
      room: data.room || '',
      receiptUrl: data.receiptUrl,
      manualUrl: data.manualUrl,
      pubkey: event.pubkey,
      createdAt: event.created_at,
    };
  } catch (error) {
    if (isAbortError(error)) throw error;
    logger.error('[Appliances] Failed to decrypt appliance');
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

// Parse events into appliances
async function parseEventsToAppliances(
  events: NostrEvent[],
  pubkey: string,
  decryptForCategory: <T>(content: string) => Promise<T>
): Promise<Appliance[]> {
  // Separate appliance events from deletion events
  const applianceEvents = events.filter(e => e.kind === APPLIANCE_KIND);
  const deletionEvents = events.filter(e => e.kind === 5);

  // Get the set of deleted appliance IDs
  const deletedIds = getDeletedApplianceIds(deletionEvents, pubkey);

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

  // Sort by creation date (newest first)
  return appliances.sort((a, b) => b.createdAt - a.createdAt);
}

export function useAppliances() {
  const { user } = useCurrentUser();
  const { decryptForCategory } = useEncryption();
  const { isEncryptionEnabled } = useEncryptionSettings();

  const canLoadAppliances =
    !!user?.pubkey &&
    (!isEncryptionEnabled('appliances') || !!user?.signer?.nip44);

  const query = useQuery({
    queryKey: ['appliances', user?.pubkey, canLoadAppliances],
    queryFn: async () => {
      if (!user?.pubkey) return [];

      const cachedEvents = await getCachedEvents([APPLIANCE_KIND, 5], user.pubkey);
      if (cachedEvents.length > 0) {
        const appliances = await parseEventsToAppliances(cachedEvents, user.pubkey, decryptForCategory);
        return appliances;
      }
      return [];
    },
    enabled: canLoadAppliances,
    staleTime: Infinity, // Data comes from IndexedDB cache, no need to refetch
    gcTime: Infinity, // Keep in memory for the session
    refetchOnWindowFocus: false,
    refetchOnMount: false, // Don't refetch when component remounts - use cached data
  });

  return query;
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
      ['alt', useEncryption ? 'Encrypted Cypher Log appliance data' : `Home appliance: ${data.model}`],
    ];

    let content = '';

    if (useEncryption && shouldEncrypt('appliances')) {
      // Store data in encrypted content
      const applianceData: ApplianceData = {
        model: data.model,
        manufacturer: data.manufacturer,
        purchaseDate: data.purchaseDate,
        price: data.price,
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
      if (data.price) tags.push(['price', data.price]);
      if (data.room) tags.push(['room', data.room]);
      if (data.receiptUrl) tags.push(['receipt_url', data.receiptUrl]);
      if (data.manualUrl) tags.push(['manual_url', data.manualUrl]);
      if (data.isArchived) tags.push(['is_archived', 'true']);
    }

    const event = await publishEvent({
      kind: APPLIANCE_KIND,
      content,
      tags,
    });

    // Cache the new event immediately
    if (event) {
      await cacheEvents([event]);
    }

    // Refetch to ensure immediate data refresh after creating an appliance
    await queryClient.refetchQueries({ queryKey: ['appliances', user.pubkey] });

    return id;
  };

  const updateAppliance = async (id: string, data: Omit<Appliance, 'id' | 'pubkey' | 'createdAt'>) => {
    if (!user) throw new Error('Must be logged in');

    const useEncryption = isEncryptionEnabled('appliances');

    // Base tags (always included)
    const tags: string[][] = [
      ['d', id],
      ['alt', useEncryption ? 'Encrypted Cypher Log appliance data' : `Home appliance: ${data.model}`],
    ];

    let content = '';

    if (useEncryption && shouldEncrypt('appliances')) {
      // Store data in encrypted content
      const applianceData: ApplianceData = {
        model: data.model,
        manufacturer: data.manufacturer,
        purchaseDate: data.purchaseDate,
        price: data.price,
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
      if (data.price) tags.push(['price', data.price]);
      if (data.room) tags.push(['room', data.room]);
      if (data.receiptUrl) tags.push(['receipt_url', data.receiptUrl]);
      if (data.manualUrl) tags.push(['manual_url', data.manualUrl]);
      if (data.isArchived) tags.push(['is_archived', 'true']);
    }

    const event = await publishEvent({
      kind: APPLIANCE_KIND,
      content,
      tags,
    });

    // Cache the updated event immediately
    if (event) {
      await cacheEvents([event]);
    }

    // Refetch to ensure immediate data refresh after updating an appliance
    await queryClient.refetchQueries({ queryKey: ['appliances', user.pubkey] });
  };

  const archiveAppliance = async (id: string, isArchived: boolean) => {
    if (!user) throw new Error('Must be logged in');

    // Get current appliance data
    const appliances = queryClient.getQueryData<Appliance[]>(['appliances', user.pubkey]) || [];
    const appliance = appliances.find(a => a.id === id);
    if (!appliance) throw new Error('Appliance not found');

    // Update with archive status
    await updateAppliance(id, { ...appliance, isArchived });
  };

  const deleteAppliance = async (id: string) => {
    if (!user) throw new Error('Must be logged in');

    // Publish a deletion request (kind 5)
    const event = await publishEvent({
      kind: 5,
      content: 'Deleted appliance',
      tags: [
        ['a', `${APPLIANCE_KIND}:${user.pubkey}:${id}`],
      ],
    });

    // Cache the deletion event and remove the appliance from cache
    if (event) {
      await cacheEvents([event]);
      await deleteCachedEventByAddress(APPLIANCE_KIND, user.pubkey, id);
    }

    // Small delay to allow the deletion event to propagate to relays
    await new Promise(resolve => setTimeout(resolve, 500));

    // Force refetch to get updated data including the deletion event
    await queryClient.refetchQueries({ queryKey: ['appliances'] });
    await queryClient.refetchQueries({ queryKey: ['maintenance'] });
  };

  return { createAppliance, updateAppliance, deleteAppliance, archiveAppliance };
}

// Get archived appliances
export function useArchivedAppliances() {
  const { data: appliances = [] } = useAppliances();
  return appliances.filter(a => a.isArchived);
}

// Get active (non-archived) appliances
export function useActiveAppliances() {
  const { data: appliances = [] } = useAppliances();
  return appliances.filter(a => !a.isArchived);
}
