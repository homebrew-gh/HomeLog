import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { NostrEvent } from '@nostrify/nostrify';

import { useCurrentUser } from './useCurrentUser';
import { useNostrPublish } from './useNostrPublish';
import { useEncryption } from './useEncryption';
import { useEncryptionSettings } from '@/contexts/EncryptionContext';
import { PROJECT_ENTRY_KIND, PROJECT_KIND, type ProjectEntry } from '@/lib/types';
import { cacheEvents, getCachedEvents, deleteCachedEvent } from '@/lib/eventCache';
import { logger } from '@/lib/logger';

// Encrypted content marker
const ENCRYPTED_MARKER = 'nip44:';

// Helper to get tag value
function getTagValue(event: NostrEvent, tagName: string): string | undefined {
  return event.tags.find(([name]) => name === tagName)?.[1];
}

// Helper to get all tag values for a given tag name
function getTagValues(event: NostrEvent, tagName: string): string[] {
  return event.tags
    .filter(([name]) => name === tagName)
    .map(tag => tag[1])
    .filter((val): val is string => !!val);
}

// Data stored in encrypted content
type ProjectEntryData = Omit<ProjectEntry, 'id' | 'projectId' | 'pubkey' | 'createdAt'>;

// Parse a Nostr event into a ProjectEntry object (plaintext version)
function parseProjectEntryPlaintext(event: NostrEvent): ProjectEntry | null {
  // Get the project reference from 'a' tag
  const aTag = event.tags.find(([name, value]) => 
    name === 'a' && value?.startsWith(`${PROJECT_KIND}:`)
  );
  if (!aTag) return null;

  // Parse project ID from 'a' tag (format: "kind:pubkey:d-tag")
  const parts = aTag[1].split(':');
  if (parts.length < 3) return null;
  const projectId = parts[2];

  const entryDate = getTagValue(event, 'entry_date');
  const content = getTagValue(event, 'content_text');

  if (!projectId || !entryDate || !content) return null;

  return {
    id: event.id,
    projectId,
    entryDate,
    title: getTagValue(event, 'title'),
    content,
    photoUrls: getTagValues(event, 'image'),
    pubkey: event.pubkey,
    createdAt: event.created_at,
  };
}

// Parse encrypted project entry from content
async function parseProjectEntryEncrypted(
  event: NostrEvent,
  decryptFn: (content: string) => Promise<ProjectEntryData>
): Promise<ProjectEntry | null> {
  // Get the project reference from 'a' tag
  const aTag = event.tags.find(([name, value]) => 
    name === 'a' && value?.startsWith(`${PROJECT_KIND}:`)
  );
  if (!aTag) return null;

  // Parse project ID from 'a' tag (format: "kind:pubkey:d-tag")
  const parts = aTag[1].split(':');
  if (parts.length < 3) return null;
  const projectId = parts[2];

  try {
    const data = await decryptFn(event.content);
    return {
      id: event.id,
      projectId,
      ...data,
      pubkey: event.pubkey,
      createdAt: event.created_at,
    };
  } catch (error) {
    logger.error('[ProjectEntries] Failed to decrypt entry');
    return null;
  }
}

// Extract deleted entry IDs from kind 5 events
function getDeletedEntryIds(deletionEvents: NostrEvent[]): Set<string> {
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

// Parse events into project entries
async function parseEventsToEntries(
  events: NostrEvent[],
  decryptForCategory: <T>(content: string) => Promise<T>
): Promise<ProjectEntry[]> {
  // Separate entry events from deletion events
  const entryEvents = events.filter(e => e.kind === PROJECT_ENTRY_KIND);
  const deletionEvents = events.filter(e => e.kind === 5);

  // Get the set of deleted entry IDs
  const deletedIds = getDeletedEntryIds(deletionEvents);

  const entries: ProjectEntry[] = [];
  
  for (const event of entryEvents) {
    if (deletedIds.has(event.id)) continue;

    // Check if content is encrypted
    if (event.content && event.content.startsWith(ENCRYPTED_MARKER)) {
      // Decrypt and parse
      const entry = await parseProjectEntryEncrypted(
        event,
        (content) => decryptForCategory<ProjectEntryData>(content)
      );
      if (entry) {
        entries.push(entry);
      }
    } else {
      // Parse plaintext from tags
      const entry = parseProjectEntryPlaintext(event);
      if (entry) {
        entries.push(entry);
      }
    }
  }

  // Sort by entry date (newest first), then by creation date
  return entries.sort((a, b) => {
    // Parse dates for comparison
    const dateA = new Date(a.entryDate).getTime();
    const dateB = new Date(b.entryDate).getTime();
    if (dateB !== dateA) return dateB - dateA;
    return b.createdAt - a.createdAt;
  });
}

export function useProjectEntries(projectId?: string) {
  const { user } = useCurrentUser();
  const { decryptForCategory } = useEncryption();

  // Main query - loads from cache only
  const query = useQuery({
    queryKey: ['project-entries', user?.pubkey, projectId],
    queryFn: async () => {
      if (!user?.pubkey || !projectId) {
        return [];
      }

      // Load from cache
      const cachedEvents = await getCachedEvents([PROJECT_ENTRY_KIND, 5], user.pubkey);
      
      if (cachedEvents.length > 0) {
        const entries = await parseEventsToEntries(cachedEvents, decryptForCategory);
        // Filter to only entries for this project
        return entries.filter(e => e.projectId === projectId);
      }

      return [];
    },
    enabled: !!user?.pubkey && !!projectId,
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  return query;
}

export function useAllProjectEntries() {
  const { user } = useCurrentUser();
  const { decryptForCategory } = useEncryption();

  // Query for all entries across all projects
  const query = useQuery({
    queryKey: ['project-entries', user?.pubkey],
    queryFn: async () => {
      if (!user?.pubkey) {
        return [];
      }

      // Load from cache
      const cachedEvents = await getCachedEvents([PROJECT_ENTRY_KIND, 5], user.pubkey);
      
      if (cachedEvents.length > 0) {
        return await parseEventsToEntries(cachedEvents, decryptForCategory);
      }

      return [];
    },
    enabled: !!user?.pubkey,
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  return query;
}

export function useProjectEntryActions() {
  const { user } = useCurrentUser();
  const { mutateAsync: publishEvent } = useNostrPublish();
  const queryClient = useQueryClient();
  const { encryptForCategory, shouldEncrypt } = useEncryption();
  const { isEncryptionEnabled } = useEncryptionSettings();

  const createEntry = async (projectId: string, data: Omit<ProjectEntry, 'id' | 'projectId' | 'pubkey' | 'createdAt'>) => {
    if (!user) throw new Error('Must be logged in');

    const useEncryption = isEncryptionEnabled('projects');

    // Base tags (always included)
    const tags: string[][] = [
      ['a', `${PROJECT_KIND}:${user.pubkey}:${projectId}`, '', 'project'],
      ['alt', useEncryption ? 'Encrypted project progress entry' : `Project entry: ${data.title || data.entryDate}`],
    ];

    let content = '';

    if (useEncryption && shouldEncrypt('projects')) {
      // Store data in encrypted content
      content = await encryptForCategory('projects', data);
    } else {
      // Store data in plaintext tags
      tags.push(['entry_date', data.entryDate]);
      tags.push(['content_text', data.content]);
      
      if (data.title) tags.push(['title', data.title]);
      if (data.photoUrls) {
        for (const url of data.photoUrls) {
          tags.push(['image', url]);
        }
      }
    }

    const event = await publishEvent({
      kind: PROJECT_ENTRY_KIND,
      content,
      tags,
    });

    if (event) {
      await cacheEvents([event]);
    }

    // Refetch entries
    await queryClient.refetchQueries({ queryKey: ['project-entries', user.pubkey] });

    return event?.id;
  };

  const deleteEntry = async (entryId: string) => {
    if (!user) throw new Error('Must be logged in');

    // Publish a deletion request (kind 5)
    const event = await publishEvent({
      kind: 5,
      content: 'Deleted project entry',
      tags: [
        ['e', entryId],
      ],
    });

    if (event) {
      await cacheEvents([event]);
      await deleteCachedEvent(entryId);
    }

    // Small delay to allow the deletion event to propagate
    await new Promise(resolve => setTimeout(resolve, 500));

    // Force refetch
    await queryClient.refetchQueries({ queryKey: ['project-entries'] });
  };

  return { createEntry, deleteEntry };
}
