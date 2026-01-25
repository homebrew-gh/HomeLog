/**
 * Local-first event cache using IndexedDB
 * 
 * Stores Nostr events locally for instant loading on app start.
 * Data is synced with relays in the background.
 */

import type { NostrEvent } from '@nostrify/nostrify';

const DB_NAME = 'homelog-event-cache';
const DB_VERSION = 1;
const EVENTS_STORE = 'events';
const META_STORE = 'meta';

// Cache metadata
interface CacheMeta {
  key: string;
  lastSyncedAt: number;
  pubkey: string;
}

let dbPromise: Promise<IDBDatabase> | null = null;

/**
 * Open or create the IndexedDB database
 */
function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('[EventCache] Failed to open database:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Events store - keyed by kind:pubkey:id for efficient lookups
      if (!db.objectStoreNames.contains(EVENTS_STORE)) {
        const eventsStore = db.createObjectStore(EVENTS_STORE, { keyPath: 'cacheKey' });
        // Index by kind and pubkey for querying
        eventsStore.createIndex('kindPubkey', ['kind', 'pubkey'], { unique: false });
        eventsStore.createIndex('pubkey', 'pubkey', { unique: false });
      }

      // Metadata store - tracks last sync times
      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE, { keyPath: 'key' });
      }
    };
  });

  return dbPromise;
}

/**
 * Generate a unique cache key for an event
 */
function getCacheKey(event: NostrEvent): string {
  // For addressable events (kind >= 30000), use kind:pubkey:d-tag
  if (event.kind >= 30000) {
    const dTag = event.tags.find(t => t[0] === 'd')?.[1] || '';
    return `${event.kind}:${event.pubkey}:${dTag}`;
  }
  // For regular events, use the event id
  return event.id;
}

/**
 * Store events in the cache
 */
export async function cacheEvents(events: NostrEvent[]): Promise<void> {
  if (events.length === 0) return;

  try {
    const db = await openDB();
    const tx = db.transaction(EVENTS_STORE, 'readwrite');
    const store = tx.objectStore(EVENTS_STORE);

    for (const event of events) {
      const cacheKey = getCacheKey(event);
      // Store the event with its cache key
      store.put({ ...event, cacheKey });
    }

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (error) {
    console.error('[EventCache] Failed to cache events:', error);
  }
}

/**
 * Get cached events by kind and pubkey
 */
export async function getCachedEvents(kinds: number[], pubkey: string): Promise<NostrEvent[]> {
  try {
    const db = await openDB();
    const tx = db.transaction(EVENTS_STORE, 'readonly');
    const store = tx.objectStore(EVENTS_STORE);
    const index = store.index('kindPubkey');

    const events: NostrEvent[] = [];

    // Query for each kind
    for (const kind of kinds) {
      const request = index.getAll([kind, pubkey]);
      
      await new Promise<void>((resolve, reject) => {
        request.onsuccess = () => {
          const results = request.result || [];
          // Remove the cacheKey property before returning
          for (const result of results) {
            const { cacheKey, ...event } = result;
            events.push(event as NostrEvent);
          }
          resolve();
        };
        request.onerror = () => reject(request.error);
      });
    }

    return events;
  } catch (error) {
    console.error('[EventCache] Failed to get cached events:', error);
    return [];
  }
}

/**
 * Delete an event from the cache
 */
export async function deleteCachedEvent(event: NostrEvent): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(EVENTS_STORE, 'readwrite');
    const store = tx.objectStore(EVENTS_STORE);
    const cacheKey = getCacheKey(event);
    
    store.delete(cacheKey);

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (error) {
    console.error('[EventCache] Failed to delete cached event:', error);
  }
}

/**
 * Delete events by their addressable coordinates (kind:pubkey:d-tag)
 */
export async function deleteCachedEventByAddress(kind: number, pubkey: string, dTag: string): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(EVENTS_STORE, 'readwrite');
    const store = tx.objectStore(EVENTS_STORE);
    const cacheKey = `${kind}:${pubkey}:${dTag}`;
    
    store.delete(cacheKey);

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (error) {
    console.error('[EventCache] Failed to delete cached event by address:', error);
  }
}

/**
 * Delete events by event ID (for regular events like kind 5)
 */
export async function deleteCachedEventById(eventId: string): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(EVENTS_STORE, 'readwrite');
    const store = tx.objectStore(EVENTS_STORE);
    
    store.delete(eventId);

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (error) {
    console.error('[EventCache] Failed to delete cached event by id:', error);
  }
}

/**
 * Clear all cached events for a specific pubkey
 */
export async function clearCacheForPubkey(pubkey: string): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(EVENTS_STORE, 'readwrite');
    const store = tx.objectStore(EVENTS_STORE);
    const index = store.index('pubkey');
    
    const request = index.getAllKeys(pubkey);
    
    await new Promise<void>((resolve, reject) => {
      request.onsuccess = () => {
        const keys = request.result || [];
        for (const key of keys) {
          store.delete(key);
        }
        resolve();
      };
      request.onerror = () => reject(request.error);
    });

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (error) {
    console.error('[EventCache] Failed to clear cache for pubkey:', error);
  }
}

/**
 * Get the last sync timestamp for a cache key
 */
export async function getLastSyncTime(cacheKey: string): Promise<number | null> {
  try {
    const db = await openDB();
    const tx = db.transaction(META_STORE, 'readonly');
    const store = tx.objectStore(META_STORE);
    
    const request = store.get(cacheKey);
    
    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const meta = request.result as CacheMeta | undefined;
        resolve(meta?.lastSyncedAt || null);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('[EventCache] Failed to get last sync time:', error);
    return null;
  }
}

/**
 * Update the last sync timestamp for a cache key
 */
export async function updateLastSyncTime(cacheKey: string, pubkey: string): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(META_STORE, 'readwrite');
    const store = tx.objectStore(META_STORE);
    
    const meta: CacheMeta = {
      key: cacheKey,
      lastSyncedAt: Date.now(),
      pubkey,
    };
    
    store.put(meta);

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (error) {
    console.error('[EventCache] Failed to update last sync time:', error);
  }
}

/**
 * Clear the entire cache (useful for debugging or logout)
 */
export async function clearAllCache(): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction([EVENTS_STORE, META_STORE], 'readwrite');
    
    tx.objectStore(EVENTS_STORE).clear();
    tx.objectStore(META_STORE).clear();

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (error) {
    console.error('[EventCache] Failed to clear all cache:', error);
  }
}

/**
 * Get a single cached event by kind and pubkey (for replaceable events like profiles)
 * Returns the most recent event if multiple exist
 */
export async function getCachedEvent(kind: number, pubkey: string): Promise<NostrEvent | null> {
  try {
    const events = await getCachedEvents([kind], pubkey);
    if (events.length === 0) return null;
    
    // Return the most recent event
    return events.reduce((latest, event) => 
      event.created_at > latest.created_at ? event : latest
    );
  } catch (error) {
    console.error('[EventCache] Failed to get cached event:', error);
    return null;
  }
}

/**
 * Cache a single event (convenience wrapper)
 */
export async function cacheEvent(event: NostrEvent): Promise<void> {
  return cacheEvents([event]);
}
