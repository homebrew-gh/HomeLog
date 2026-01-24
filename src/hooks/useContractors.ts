import { useNostr } from '@nostrify/react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { NostrEvent } from '@nostrify/nostrify';

import { useCurrentUser } from './useCurrentUser';
import { useNostrPublish } from './useNostrPublish';
import { useEncryption } from './useEncryption';
import { useEncryptionSettings } from '@/contexts/EncryptionContext';
import { CONTRACTOR_KIND, type Contractor, type Invoice } from '@/lib/types';

// Encrypted content marker
const ENCRYPTED_MARKER = 'nip44:';

// Helper to get tag value
function getTagValue(event: NostrEvent, tagName: string): string | undefined {
  return event.tags.find(([name]) => name === tagName)?.[1];
}

// Helper to get all tag values (for arrays)
function getTagValues(event: NostrEvent, tagName: string): string[] {
  return event.tags
    .filter(([name]) => name === tagName)
    .map(tag => tag[1])
    .filter(Boolean);
}

// Helper to parse invoice tags
// Format: ["invoice", "<url>", "<date>", "<amount>", "<description>"]
function parseInvoiceTags(event: NostrEvent): Invoice[] {
  return event.tags
    .filter(([name]) => name === 'invoice')
    .map(tag => ({
      url: tag[1] || '',
      date: tag[2] || '',
      amount: tag[3] || undefined,
      description: tag[4] || undefined,
    }))
    .filter(inv => inv.url && inv.date);
}

// Data stored in encrypted content
type ContractorData = Omit<Contractor, 'id' | 'pubkey' | 'createdAt'>;

// Parse a Nostr event into a Contractor object (plaintext version)
function parseContractorPlaintext(event: NostrEvent): Contractor | null {
  const id = getTagValue(event, 'd');
  const name = getTagValue(event, 'name');
  const serviceType = getTagValue(event, 'service_type');

  if (!id || !name || !serviceType) return null;

  const ratingStr = getTagValue(event, 'rating');

  return {
    id,
    serviceType,
    name,
    contactName: getTagValue(event, 'contact_name'),
    phone: getTagValue(event, 'phone'),
    email: getTagValue(event, 'email'),
    website: getTagValue(event, 'website'),
    address: getTagValue(event, 'address'),
    city: getTagValue(event, 'city'),
    state: getTagValue(event, 'state'),
    zipCode: getTagValue(event, 'zip_code'),
    licenseNumber: getTagValue(event, 'license_number'),
    insuranceInfo: getTagValue(event, 'insurance_info'),
    invoices: parseInvoiceTags(event),
    rating: ratingStr ? parseInt(ratingStr, 10) : undefined,
    notes: getTagValue(event, 'notes'),
    pubkey: event.pubkey,
    createdAt: event.created_at,
  };
}

// Parse encrypted contractor from content
async function parseContractorEncrypted(
  event: NostrEvent,
  decryptFn: (content: string) => Promise<ContractorData>
): Promise<Contractor | null> {
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
    console.error('[Contractors] Failed to decrypt contractor:', id, error);
    return null;
  }
}

// Extract deleted contractor IDs from kind 5 events
function getDeletedContractorIds(deletionEvents: NostrEvent[], pubkey: string): Set<string> {
  const deletedIds = new Set<string>();

  for (const event of deletionEvents) {
    for (const tag of event.tags) {
      if (tag[0] === 'a') {
        // Parse "kind:pubkey:d-tag" format
        const parts = tag[1].split(':');
        if (parts.length >= 3 && parts[0] === String(CONTRACTOR_KIND) && parts[1] === pubkey) {
          deletedIds.add(parts[2]);
        }
      }
    }
  }

  return deletedIds;
}

export function useContractors() {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const { decryptForCategory } = useEncryption();

  return useQuery({
    queryKey: ['contractors', user?.pubkey],
    queryFn: async (c) => {
      if (!user?.pubkey) return [];

      // Longer timeout for mobile/PWA mode where network might be slower
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(15000)]);

      // Query both contractor events and deletion events in one request
      const events = await nostr.query(
        [
          { kinds: [CONTRACTOR_KIND], authors: [user.pubkey] },
          { kinds: [5], authors: [user.pubkey] },
        ],
        { signal }
      );

      // Separate contractor events from deletion events
      const contractorEvents = events.filter(e => e.kind === CONTRACTOR_KIND);
      const deletionEvents = events.filter(e => e.kind === 5);

      // Get the set of deleted contractor IDs
      const deletedIds = getDeletedContractorIds(deletionEvents, user.pubkey);

      const contractors: Contractor[] = [];
      
      for (const event of contractorEvents) {
        const id = getTagValue(event, 'd');
        if (!id || deletedIds.has(id)) continue;

        // Check if content is encrypted
        if (event.content && event.content.startsWith(ENCRYPTED_MARKER)) {
          // Decrypt and parse
          const contractor = await parseContractorEncrypted(
            event,
            (content) => decryptForCategory<ContractorData>(content)
          );
          if (contractor) {
            contractors.push(contractor);
          }
        } else {
          // Parse plaintext from tags
          const contractor = parseContractorPlaintext(event);
          if (contractor) {
            contractors.push(contractor);
          }
        }
      }

      // Sort by creation date (newest first)
      return contractors.sort((a, b) => b.createdAt - a.createdAt);
    },
    enabled: !!user?.pubkey,
  });
}

export function useContractorById(id: string | undefined) {
  const { data: contractors } = useContractors();
  return contractors?.find(c => c.id === id);
}

export function useContractorActions() {
  const { user } = useCurrentUser();
  const { mutateAsync: publishEvent } = useNostrPublish();
  const queryClient = useQueryClient();
  const { encryptForCategory, shouldEncrypt } = useEncryption();
  const { isEncryptionEnabled } = useEncryptionSettings();

  const createContractor = async (data: Omit<Contractor, 'id' | 'pubkey' | 'createdAt'>) => {
    if (!user) throw new Error('Must be logged in');

    const id = crypto.randomUUID();
    const useEncryption = isEncryptionEnabled('contractors');

    // Base tags (always included)
    const tags: string[][] = [
      ['d', id],
      ['alt', useEncryption ? 'Encrypted Home Log contractor data' : `Contractor: ${data.name}`],
    ];

    let content = '';

    if (useEncryption && shouldEncrypt('contractors')) {
      // Store data in encrypted content
      content = await encryptForCategory('contractors', data);
    } else {
      // Store data in plaintext tags
      tags.push(['name', data.name]);
      tags.push(['service_type', data.serviceType]);
      
      if (data.contactName) tags.push(['contact_name', data.contactName]);
      if (data.phone) tags.push(['phone', data.phone]);
      if (data.email) tags.push(['email', data.email]);
      if (data.website) tags.push(['website', data.website]);
      if (data.address) tags.push(['address', data.address]);
      if (data.city) tags.push(['city', data.city]);
      if (data.state) tags.push(['state', data.state]);
      if (data.zipCode) tags.push(['zip_code', data.zipCode]);
      if (data.licenseNumber) tags.push(['license_number', data.licenseNumber]);
      if (data.insuranceInfo) tags.push(['insurance_info', data.insuranceInfo]);
      if (data.rating !== undefined) tags.push(['rating', String(data.rating)]);
      if (data.notes) tags.push(['notes', data.notes]);

      // Add invoice tags
      if (data.invoices && data.invoices.length > 0) {
        for (const invoice of data.invoices) {
          const invoiceTag = ['invoice', invoice.url, invoice.date];
          if (invoice.amount) invoiceTag.push(invoice.amount);
          if (invoice.description) invoiceTag.push(invoice.description);
          tags.push(invoiceTag);
        }
      }
    }

    await publishEvent({
      kind: CONTRACTOR_KIND,
      content,
      tags,
    });

    await queryClient.invalidateQueries({ queryKey: ['contractors'] });

    return id;
  };

  const updateContractor = async (id: string, data: Omit<Contractor, 'id' | 'pubkey' | 'createdAt'>) => {
    if (!user) throw new Error('Must be logged in');

    const useEncryption = isEncryptionEnabled('contractors');

    // Base tags (always included)
    const tags: string[][] = [
      ['d', id],
      ['alt', useEncryption ? 'Encrypted Home Log contractor data' : `Contractor: ${data.name}`],
    ];

    let content = '';

    if (useEncryption && shouldEncrypt('contractors')) {
      // Store data in encrypted content
      content = await encryptForCategory('contractors', data);
    } else {
      // Store data in plaintext tags
      tags.push(['name', data.name]);
      tags.push(['service_type', data.serviceType]);
      
      if (data.contactName) tags.push(['contact_name', data.contactName]);
      if (data.phone) tags.push(['phone', data.phone]);
      if (data.email) tags.push(['email', data.email]);
      if (data.website) tags.push(['website', data.website]);
      if (data.address) tags.push(['address', data.address]);
      if (data.city) tags.push(['city', data.city]);
      if (data.state) tags.push(['state', data.state]);
      if (data.zipCode) tags.push(['zip_code', data.zipCode]);
      if (data.licenseNumber) tags.push(['license_number', data.licenseNumber]);
      if (data.insuranceInfo) tags.push(['insurance_info', data.insuranceInfo]);
      if (data.rating !== undefined) tags.push(['rating', String(data.rating)]);
      if (data.notes) tags.push(['notes', data.notes]);

      // Add invoice tags
      if (data.invoices && data.invoices.length > 0) {
        for (const invoice of data.invoices) {
          const invoiceTag = ['invoice', invoice.url, invoice.date];
          if (invoice.amount) invoiceTag.push(invoice.amount);
          if (invoice.description) invoiceTag.push(invoice.description);
          tags.push(invoiceTag);
        }
      }
    }

    await publishEvent({
      kind: CONTRACTOR_KIND,
      content,
      tags,
    });

    await queryClient.invalidateQueries({ queryKey: ['contractors'] });
  };

  const deleteContractor = async (id: string) => {
    if (!user) throw new Error('Must be logged in');

    // Publish a deletion request (kind 5)
    await publishEvent({
      kind: 5,
      content: 'Deleted contractor',
      tags: [
        ['a', `${CONTRACTOR_KIND}:${user.pubkey}:${id}`],
      ],
    });

    // Small delay to allow the deletion event to propagate to relays
    await new Promise(resolve => setTimeout(resolve, 500));

    // Force refetch to get updated data including the deletion event
    await queryClient.refetchQueries({ queryKey: ['contractors'] });
  };

  return { createContractor, updateContractor, deleteContractor };
}
