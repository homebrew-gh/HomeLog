import { useNostr } from '@nostrify/react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { NostrEvent } from '@nostrify/nostrify';
import { useEffect, useRef } from 'react';

import { useCurrentUser } from './useCurrentUser';
import { useNostrPublish } from './useNostrPublish';
import { useEncryption } from './useEncryption';
import { useEncryptionSettings } from '@/contexts/EncryptionContext';
import { SUBSCRIPTION_KIND, type Subscription, type BillingFrequency } from '@/lib/types';
import { cacheEvents, getCachedEvents, deleteCachedEventByAddress } from '@/lib/eventCache';

// Encrypted content marker
const ENCRYPTED_MARKER = 'nip44:';

// Helper to get tag value
function getTagValue(event: NostrEvent, tagName: string): string | undefined {
  return event.tags.find(([name]) => name === tagName)?.[1];
}

// Data stored in encrypted content
type SubscriptionData = Omit<Subscription, 'id' | 'pubkey' | 'createdAt'>;

// Parse a Nostr event into a Subscription object (plaintext version)
function parseSubscriptionPlaintext(event: NostrEvent): Subscription | null {
  const id = getTagValue(event, 'd');
  const name = getTagValue(event, 'name');
  const subscriptionType = getTagValue(event, 'subscription_type');
  const cost = getTagValue(event, 'cost');
  const billingFrequency = getTagValue(event, 'billing_frequency') as BillingFrequency;

  if (!id || !name || !subscriptionType || !cost || !billingFrequency) return null;

  return {
    id,
    subscriptionType,
    name,
    cost,
    billingFrequency,
    companyId: getTagValue(event, 'company_id'),
    companyName: getTagValue(event, 'company_name'),
    notes: getTagValue(event, 'notes'),
    pubkey: event.pubkey,
    createdAt: event.created_at,
  };
}

// Parse encrypted subscription from content
async function parseSubscriptionEncrypted(
  event: NostrEvent,
  decryptFn: (content: string) => Promise<SubscriptionData>
): Promise<Subscription | null> {
  const id = getTagValue(event, 'd');
  if (!id) return null;

  try {
    const data = await decryptFn(event.content);
    return {
      id,
      ...data,
      pubkey: event.pubkey,
      createdAt: event.created_at,
    };
  } catch (error) {
    console.error('[Subscriptions] Failed to decrypt subscription:', id, error);
    return null;
  }
}

// Extract deleted subscription IDs from kind 5 events
function getDeletedSubscriptionIds(deletionEvents: NostrEvent[], pubkey: string): Set<string> {
  const deletedIds = new Set<string>();

  for (const event of deletionEvents) {
    for (const tag of event.tags) {
      if (tag[0] === 'a') {
        // Parse "kind:pubkey:d-tag" format
        const parts = tag[1].split(':');
        if (parts.length >= 3 && parts[0] === String(SUBSCRIPTION_KIND) && parts[1] === pubkey) {
          deletedIds.add(parts[2]);
        }
      }
    }
  }

  return deletedIds;
}

// Parse events into subscriptions
async function parseEventsToSubscriptions(
  events: NostrEvent[],
  pubkey: string,
  decryptForCategory: <T>(content: string) => Promise<T>
): Promise<Subscription[]> {
  // Separate subscription events from deletion events
  const subscriptionEvents = events.filter(e => e.kind === SUBSCRIPTION_KIND);
  const deletionEvents = events.filter(e => e.kind === 5);

  // Get the set of deleted subscription IDs
  const deletedIds = getDeletedSubscriptionIds(deletionEvents, pubkey);

  const subscriptions: Subscription[] = [];
  
  for (const event of subscriptionEvents) {
    const id = getTagValue(event, 'd');
    if (!id || deletedIds.has(id)) continue;

    // Check if content is encrypted
    if (event.content && event.content.startsWith(ENCRYPTED_MARKER)) {
      // Decrypt and parse
      const subscription = await parseSubscriptionEncrypted(
        event,
        (content) => decryptForCategory<SubscriptionData>(content)
      );
      if (subscription) {
        subscriptions.push(subscription);
      }
    } else {
      // Parse plaintext from tags
      const subscription = parseSubscriptionPlaintext(event);
      if (subscription) {
        subscriptions.push(subscription);
      }
    }
  }

  // Sort by creation date (newest first)
  return subscriptions.sort((a, b) => b.createdAt - a.createdAt);
}

export function useSubscriptions() {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const { decryptForCategory } = useEncryption();
  const queryClient = useQueryClient();
  const isSyncing = useRef(false);

  // Main query - loads from cache first
  const query = useQuery({
    queryKey: ['subscriptions', user?.pubkey],
    queryFn: async () => {
      if (!user?.pubkey) return [];

      console.log('[useSubscriptions] Loading from cache for pubkey:', user.pubkey);

      // Load from cache first (instant)
      const cachedEvents = await getCachedEvents([SUBSCRIPTION_KIND, 5], user.pubkey);
      
      if (cachedEvents.length > 0) {
        console.log('[useSubscriptions] Found cached events:', cachedEvents.length);
        const subscriptions = await parseEventsToSubscriptions(cachedEvents, user.pubkey, decryptForCategory);
        return subscriptions;
      }

      console.log('[useSubscriptions] No cache, waiting for relay sync...');
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
      console.log('[useSubscriptions] Starting background relay sync...');

      try {
        const signal = AbortSignal.timeout(15000);
        
        const events = await nostr.query(
          [
            { kinds: [SUBSCRIPTION_KIND], authors: [user.pubkey] },
            { kinds: [5], authors: [user.pubkey] },
          ],
          { signal }
        );

        console.log('[useSubscriptions] Relay sync received events:', events.length);

        if (events.length > 0) {
          await cacheEvents(events);
        }

        const subscriptions = await parseEventsToSubscriptions(events, user.pubkey, decryptForCategory);
        queryClient.setQueryData(['subscriptions', user.pubkey], subscriptions);
        
        console.log('[useSubscriptions] Background sync complete, subscriptions:', subscriptions.length);
      } catch (error) {
        console.error('[useSubscriptions] Background sync failed:', error);
      } finally {
        isSyncing.current = false;
      }
    };

    const timer = setTimeout(syncWithRelays, 100);
    return () => clearTimeout(timer);
  }, [user?.pubkey, nostr, queryClient, decryptForCategory]);

  return query;
}

export function useSubscriptionById(id: string | undefined) {
  const { data: subscriptions } = useSubscriptions();
  return subscriptions?.find(s => s.id === id);
}

// Get subscriptions linked to a specific company
export function useSubscriptionsByCompanyId(companyId: string | undefined) {
  const { data: subscriptions } = useSubscriptions();
  if (!companyId) return [];
  return subscriptions?.filter(s => s.companyId === companyId) ?? [];
}

export function useSubscriptionActions() {
  const { user } = useCurrentUser();
  const { mutateAsync: publishEvent } = useNostrPublish();
  const queryClient = useQueryClient();
  const { encryptForCategory, shouldEncrypt } = useEncryption();
  const { isEncryptionEnabled } = useEncryptionSettings();

  const createSubscription = async (data: Omit<Subscription, 'id' | 'pubkey' | 'createdAt'>) => {
    if (!user) throw new Error('Must be logged in');

    const id = crypto.randomUUID();
    const useEncryption = isEncryptionEnabled('subscriptions');

    // Base tags (always included)
    const tags: string[][] = [
      ['d', id],
      ['alt', useEncryption ? 'Encrypted Home Log subscription data' : `Subscription: ${data.name}`],
    ];

    let content = '';

    if (useEncryption && shouldEncrypt('subscriptions')) {
      // Store data in encrypted content
      content = await encryptForCategory('subscriptions', data);
    } else {
      // Store data in plaintext tags
      tags.push(['name', data.name]);
      tags.push(['subscription_type', data.subscriptionType]);
      tags.push(['cost', data.cost]);
      tags.push(['billing_frequency', data.billingFrequency]);
      
      if (data.companyId) tags.push(['company_id', data.companyId]);
      if (data.companyName) tags.push(['company_name', data.companyName]);
      if (data.notes) tags.push(['notes', data.notes]);
    }

    const event = await publishEvent({
      kind: SUBSCRIPTION_KIND,
      content,
      tags,
    });

    if (event) {
      await cacheEvents([event]);
    }

    await queryClient.invalidateQueries({ queryKey: ['subscriptions'] });

    return id;
  };

  const updateSubscription = async (id: string, data: Omit<Subscription, 'id' | 'pubkey' | 'createdAt'>) => {
    if (!user) throw new Error('Must be logged in');

    const useEncryption = isEncryptionEnabled('subscriptions');

    // Base tags (always included)
    const tags: string[][] = [
      ['d', id],
      ['alt', useEncryption ? 'Encrypted Home Log subscription data' : `Subscription: ${data.name}`],
    ];

    let content = '';

    if (useEncryption && shouldEncrypt('subscriptions')) {
      // Store data in encrypted content
      content = await encryptForCategory('subscriptions', data);
    } else {
      // Store data in plaintext tags
      tags.push(['name', data.name]);
      tags.push(['subscription_type', data.subscriptionType]);
      tags.push(['cost', data.cost]);
      tags.push(['billing_frequency', data.billingFrequency]);
      
      if (data.companyId) tags.push(['company_id', data.companyId]);
      if (data.companyName) tags.push(['company_name', data.companyName]);
      if (data.notes) tags.push(['notes', data.notes]);
    }

    const event = await publishEvent({
      kind: SUBSCRIPTION_KIND,
      content,
      tags,
    });

    if (event) {
      await cacheEvents([event]);
    }

    await queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
  };

  const deleteSubscription = async (id: string) => {
    if (!user) throw new Error('Must be logged in');

    // Publish a deletion request (kind 5)
    const event = await publishEvent({
      kind: 5,
      content: 'Deleted subscription',
      tags: [
        ['a', `${SUBSCRIPTION_KIND}:${user.pubkey}:${id}`],
      ],
    });

    if (event) {
      await cacheEvents([event]);
      await deleteCachedEventByAddress(SUBSCRIPTION_KIND, user.pubkey, id);
    }

    // Small delay to allow the deletion event to propagate to relays
    await new Promise(resolve => setTimeout(resolve, 500));

    // Force refetch to get updated data including the deletion event
    await queryClient.refetchQueries({ queryKey: ['subscriptions'] });
  };

  return { createSubscription, updateSubscription, deleteSubscription };
}
