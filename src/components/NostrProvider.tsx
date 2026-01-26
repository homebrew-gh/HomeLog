import React, { useEffect, useRef } from 'react';
import { NostrEvent, NostrFilter, NPool, NRelay1 } from '@nostrify/nostrify';
import { NostrContext } from '@nostrify/react';
import { useQueryClient } from '@tanstack/react-query';
import { useAppContext } from '@/hooks/useAppContext';
import { useEncryptionSettings } from '@/contexts/EncryptionContext';

interface NostrProviderProps {
  children: React.ReactNode;
}

const NostrProvider: React.FC<NostrProviderProps> = (props) => {
  const { children } = props;
  const { config } = useAppContext();
  const { cachingRelay } = useEncryptionSettings();

  const queryClient = useQueryClient();

  // Create NPool instance only once
  const pool = useRef<NPool | undefined>(undefined);

  // Use refs so the pool always has the latest data
  const relayMetadata = useRef(config.relayMetadata);
  const cachingRelayRef = useRef(cachingRelay);

  // Invalidate Nostr queries when relay metadata changes
  useEffect(() => {
    relayMetadata.current = config.relayMetadata;
    queryClient.invalidateQueries({ queryKey: ['nostr'] });
  }, [config.relayMetadata, queryClient]);

  // Update caching relay ref when it changes
  useEffect(() => {
    cachingRelayRef.current = cachingRelay;
    // Invalidate queries so they can benefit from the new caching relay
    queryClient.invalidateQueries({ queryKey: ['nostr'] });
  }, [cachingRelay, queryClient]);

  // Initialize NPool only once
  if (!pool.current) {
    console.log('[NostrProvider] Initializing NPool with relays:', relayMetadata.current.relays);
    
    pool.current = new NPool({
      open(url: string) {
        console.log('[NostrProvider] Opening relay connection:', url);
        return new NRelay1(url);
      },
      reqRouter(filters: NostrFilter[]) {
        const routes = new Map<string, NostrFilter[]>();

        // Get all read relays
        const readRelays = relayMetadata.current.relays
          .filter(r => r.read)
          .map(r => r.url);

        // If a caching relay is set and it's in the read list, prioritize it by putting it first
        // The caching relay will be queried alongside other relays for faster initial response
        const currentCachingRelay = cachingRelayRef.current;
        let orderedRelays = [...readRelays];
        
        if (currentCachingRelay && readRelays.includes(currentCachingRelay)) {
          // Move caching relay to the front of the list
          orderedRelays = [
            currentCachingRelay,
            ...readRelays.filter(url => url !== currentCachingRelay)
          ];
          console.log('[NostrProvider] Prioritizing caching relay:', currentCachingRelay);
        }

        // console.log('[NostrProvider] Routing query to read relays:', orderedRelays);

        for (const url of orderedRelays) {
          routes.set(url, filters);
        }

        return routes;
      },
      eventRouter(_event: NostrEvent) {
        // Get write relays from metadata
        const writeRelays = relayMetadata.current.relays
          .filter(r => r.write)
          .map(r => r.url);

        const allRelays = new Set<string>(writeRelays);

        console.log('[NostrProvider] Routing event to write relays:', [...allRelays]);

        return [...allRelays];
      },
    });
  }

  return (
    <NostrContext.Provider value={{ nostr: pool.current }}>
      {children}
    </NostrContext.Provider>
  );
};

export default NostrProvider;