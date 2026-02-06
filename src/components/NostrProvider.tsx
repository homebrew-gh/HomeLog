import React, { createContext, useEffect, useMemo, useRef, useState } from 'react';
import { NostrEvent, NostrFilter, NPool, NRelay1 } from '@nostrify/nostrify';
import { NostrContext } from '@nostrify/react';
import type { NUser } from '@nostrify/react/login';
import { useQueryClient } from '@tanstack/react-query';
import { useAppContext } from '@/hooks/useAppContext';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useEncryptionSettings } from '@/contexts/EncryptionContext';

/** Setter for private relay URLs; synced from UserPreferencesProvider when preferences load */
export const SetPrivateRelayUrlsContext = createContext<((urls: string[]) => void) | null>(null);

/** NIP-42 auth kind for relay authentication */
const NIP42_AUTH_KIND = 22242;

/** Ref type for the current user's signer (used by NIP-42 auth callback). */
type SignerRef = React.MutableRefObject<NUser['signer'] | null | undefined>;

/**
 * Updates signerRef from useCurrentUser. Must be a child of NostrContext.Provider
 * so useCurrentUser (which uses useNostr) has access to the pool.
 */
function SignerRefUpdater({ signerRef }: { signerRef: SignerRef }) {
  const { user } = useCurrentUser();
  useEffect(() => {
    signerRef.current = user?.signer ?? null;
    return () => {
      signerRef.current = null;
    };
  }, [user?.signer, signerRef]);
  return null;
}

interface NostrProviderProps {
  children: React.ReactNode;
}

const NostrProvider: React.FC<NostrProviderProps> = (props) => {
  const { children } = props;
  const { config } = useAppContext();
  const { cachingRelay } = useEncryptionSettings();

  const queryClient = useQueryClient();
  const [privateRelayUrls, setPrivateRelayUrls] = useState<string[]>([]);

  // Ref for NIP-42 auth: updated by SignerRefUpdater (child of provider), read by auth callback
  const signerRef = useRef<NUser['signer'] | null>(null);

  // Full relay list with private relays first (preferred for reads)
  const mergedRelays = useMemo(() => {
    const privateSet = new Set(privateRelayUrls);
    const relays = config.relayMetadata.relays;
    return [...relays].sort((a, b) => {
      const aPrivate = privateSet.has(a.url);
      const bPrivate = privateSet.has(b.url);
      if (aPrivate && !bPrivate) return -1;
      if (!aPrivate && bPrivate) return 1;
      return 0;
    });
  }, [config.relayMetadata.relays, privateRelayUrls]);

  // Create NPool instance only once
  const pool = useRef<NPool | undefined>(undefined);

  // Refs so the pool always has the latest data
  const relayMetadataRef = useRef({ relays: mergedRelays });
  const cachingRelayRef = useRef(cachingRelay);

  relayMetadataRef.current = { relays: mergedRelays };

  // Invalidate Nostr queries when merged relay list changes
  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ['nostr'] });
  }, [mergedRelays, queryClient]);

  // Update caching relay ref when it changes
  useEffect(() => {
    cachingRelayRef.current = cachingRelay;
    // Invalidate queries so they can benefit from the new caching relay
    queryClient.invalidateQueries({ queryKey: ['nostr'] });
  }, [cachingRelay, queryClient]);

  // Initialize NPool only once (uses ref so it always sees latest mergedRelays)
  if (!pool.current) {
    console.log('[NostrProvider] Initializing NPool');
    pool.current = new NPool({
      open(url: string) {
        console.log('[NostrProvider] Opening relay connection:', url);
        return new NRelay1(url, {
          auth: async (challenge: string) => {
            const signer = signerRef.current;
            if (!signer) {
              throw new Error('NIP-42 auth requires login');
            }
            return signer.signEvent({
              kind: NIP42_AUTH_KIND,
              content: '',
              tags: [
                ['relay', url],
                ['challenge', challenge],
              ],
              created_at: Math.floor(Date.now() / 1000),
            });
          },
        });
      },
      reqRouter(filters: NostrFilter[]) {
        const routes = new Map<string, NostrFilter[]>();
        const { relays } = relayMetadataRef.current;
        const readRelays = relays.filter((r) => r.read).map((r) => r.url);

        const currentCachingRelay = cachingRelayRef.current;
        let orderedRelays = [...readRelays];
        if (currentCachingRelay && readRelays.includes(currentCachingRelay)) {
          orderedRelays = [currentCachingRelay, ...readRelays.filter((url) => url !== currentCachingRelay)];
        }
        for (const url of orderedRelays) {
          routes.set(url, filters);
        }
        return routes;
      },
      eventRouter(_event: NostrEvent) {
        const { relays } = relayMetadataRef.current;
        const writeRelays = relays.filter((r) => r.write).map((r) => r.url);
        return [...new Set(writeRelays)];
      },
    });
  }

  return (
    <SetPrivateRelayUrlsContext.Provider value={setPrivateRelayUrls}>
      <NostrContext.Provider value={{ nostr: pool.current } as unknown as React.ComponentProps<typeof NostrContext.Provider>['value']}>
        <SignerRefUpdater signerRef={signerRef} />
        {children}
      </NostrContext.Provider>
    </SetPrivateRelayUrlsContext.Provider>
  );
};

export default NostrProvider;