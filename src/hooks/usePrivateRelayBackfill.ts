/**
 * Private relay backfill: sync events from public relays to private relay(s).
 * When the user was away, events only reached public relays (encrypted). This hook
 * fetches those events, decrypts them, and publishes plaintext to private relay(s)
 * so all data is available on all relays. See docs/PRIVATE_RELAY_BACKFILL.md.
 */

import { useCallback, useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import type { NostrEvent } from '@nostrify/nostrify';
import { useCurrentUser } from './useCurrentUser';
import { useAppContext } from './useAppContext';
import { useUserPreferences } from '@/contexts/UserPreferencesContext';
import { useEncryption } from './useEncryption';
import {
  APPLIANCE_KIND,
  VEHICLE_KIND,
  MAINTENANCE_KIND,
  COMPANY_KIND,
  COMPANY_WORK_LOG_KIND,
  SUBSCRIPTION_KIND,
  WARRANTY_KIND,
  MAINTENANCE_COMPLETION_KIND,
  PET_KIND,
  PROJECT_KIND,
  PROJECT_ENTRY_KIND,
  PROJECT_TASK_KIND,
  PROJECT_MATERIAL_KIND,
  VET_VISIT_KIND,
} from '@/lib/types';
import { dedupeEventsByLogicalKey, getLogicalKey } from '@/lib/eventCache';
import { isRelayUrlSecure } from '@/lib/relay';
import { runWithConcurrencyLimit } from '@/lib/utils';
import { logger } from '@/lib/logger';
import { useToast } from './useToast';

const BACKFILL_STORAGE_KEY = 'cypherlog-backfill-last';
const BACKFILL_PUBLISH_CONCURRENCY = 4;
const BACKFILL_SINCE_CAP_DAYS = 90;
const PENDING_SYNC_STALE_MS = 3 * 60 * 1000; // 3 min
const PERIODIC_INTERVAL_MS = 30 * 60 * 1000; // 30 min

const BACKFILL_KINDS = [
  APPLIANCE_KIND,
  VEHICLE_KIND,
  MAINTENANCE_KIND,
  COMPANY_KIND,
  COMPANY_WORK_LOG_KIND,
  SUBSCRIPTION_KIND,
  WARRANTY_KIND,
  MAINTENANCE_COMPLETION_KIND,
  PET_KIND,
  PROJECT_KIND,
  PROJECT_ENTRY_KIND,
  PROJECT_TASK_KIND,
  PROJECT_MATERIAL_KIND,
  VET_VISIT_KIND,
  5, // deletions
];

const ENCRYPTED_MARKER = 'nip44:';

function getLastBackfillAt(): number | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(BACKFILL_STORAGE_KEY);
  if (!raw) return null;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) ? n : null;
}

function setLastBackfillAt(ts: number): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(BACKFILL_STORAGE_KEY, String(ts));
}

export function usePrivateRelayBackfill() {
  const { user } = useCurrentUser();
  const { nostr } = useNostr();
  const { config } = useAppContext();
  const { preferences } = useUserPreferences();
  const { decryptFromSelf } = useEncryption();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [lastBackfillAt, setLastBackfillAtState] = useState<number | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const privateRelayUrls = (preferences.privateRelays ?? []).filter(isRelayUrlSecure);
  const publicRelayUrls = config.relayMetadata.relays
    .filter((r) => r.write && !privateRelayUrls.includes(r.url))
    .map((r) => r.url);

  const eligible =
    !!user?.pubkey &&
    privateRelayUrls.length > 0 &&
    publicRelayUrls.length > 0 &&
    !!user?.signer?.nip44;

  // Hydrate lastBackfillAt from localStorage once
  useEffect(() => {
    setLastBackfillAtState(getLastBackfillAt());
  }, []);

  const runBackfill = useCallback(
    async (options?: { since?: number; manual?: boolean }) => {
      if (!user?.pubkey || !user.signer.nip44) {
        setError(new Error('Must be logged in with NIP-44 support'));
        return;
      }
      if (privateRelayUrls.length === 0 || publicRelayUrls.length === 0) {
        setError(new Error('Need at least one private and one public relay'));
        return;
      }

      setIsRunning(true);
      setError(null);

      const now = Math.floor(Date.now() / 1000);
      const capSince = now - BACKFILL_SINCE_CAP_DAYS * 86400;
      const since =
        options?.since !== undefined
          ? Math.max(options.since, capSince)
          : Math.max(getLastBackfillAt() ?? capSince, capSince);

      try {
        const publicGroup = nostr.group(publicRelayUrls);
        const privateGroup = nostr.group(privateRelayUrls);
        const signal = AbortSignal.timeout(60_000);

        const events = await publicGroup.query(
          [
            {
              kinds: BACKFILL_KINDS,
              authors: [user.pubkey],
              since,
              limit: 5000,
            },
          ],
          { signal }
        );

        const deduped = dedupeEventsByLogicalKey(events);
        let published = 0;

        await runWithConcurrencyLimit(
          deduped,
          BACKFILL_PUBLISH_CONCURRENCY,
          async (ev: NostrEvent) => {
            if (ev.kind === 5) {
              await privateGroup.event(ev, { signal: AbortSignal.timeout(5000) });
              published++;
              return;
            }
            if (!ev.content?.startsWith(ENCRYPTED_MARKER)) {
              return;
            }
            try {
              const plainContent = await decryptFromSelf(ev.content);
              const plainEvent = await user.signer.signEvent({
                kind: ev.kind,
                content: plainContent,
                tags: ev.tags,
                created_at: ev.created_at,
              });
              await privateGroup.event(plainEvent, { signal: AbortSignal.timeout(5000) });
              published++;
            } catch (e) {
              logger.warn('[Backfill] Skip event (decrypt/sign failed):', ev.id, e);
            }
          }
        );

        const newLast = now;
        setLastBackfillAtState(newLast);
        setLastBackfillAt(newLast);

        await queryClient.invalidateQueries({ queryKey: ['private-relay-pending-sync', user.pubkey] });
        logger.log('[Backfill] Done. Published', published, 'events to private relay(s).');
        toast({
          title: 'Sync complete',
          description: published > 0 ? `Synced ${published} event${published !== 1 ? 's' : ''} to your private relay(s).` : 'Your private relay was already up to date.',
        });
      } catch (err) {
        const e = err instanceof Error ? err : new Error(String(err));
        setError(e);
        logger.error('[Backfill] Failed:', err);
        toast({
          title: 'Sync failed',
          description: e.message,
          variant: 'destructive',
        });
      } finally {
        setIsRunning(false);
      }
    },
    [
      user,
      privateRelayUrls,
      publicRelayUrls,
      nostr,
      decryptFromSelf,
      queryClient,
      toast,
    ]
  );

  const sinceForPending = lastBackfillAt ?? Math.floor(Date.now() / 1000) - 7 * 86400;

  const pendingSyncQuery = useQuery({
    queryKey: ['private-relay-pending-sync', user?.pubkey, lastBackfillAt],
    queryFn: async (): Promise<number> => {
      if (!user?.pubkey || privateRelayUrls.length === 0 || publicRelayUrls.length === 0) return 0;
      const publicGroup = nostr.group(publicRelayUrls);
      const privateGroup = nostr.group(privateRelayUrls);
      const signal = AbortSignal.timeout(15_000);

      const [publicEvents, privateEvents] = await Promise.all([
        publicGroup.query(
          [
            {
              kinds: BACKFILL_KINDS,
              authors: [user.pubkey],
              since: sinceForPending,
              limit: 2000,
            },
          ],
          { signal }
        ),
        privateGroup.query(
          [
            {
              kinds: BACKFILL_KINDS,
              authors: [user.pubkey],
              since: sinceForPending,
              limit: 2000,
            },
          ],
          { signal }
        ),
      ]);

      const publicKeys = new Set(publicEvents.map(getLogicalKey));
      const privateKeys = new Set(privateEvents.map(getLogicalKey));
      let count = 0;
      for (const k of publicKeys) {
        if (!privateKeys.has(k)) count++;
      }
      return count;
    },
    enabled: eligible && !!user?.pubkey,
    staleTime: PENDING_SYNC_STALE_MS,
  });

  const pendingSyncCount = pendingSyncQuery.data ?? 0;

  useEffect(() => {
    if (!eligible) return;
    const id = setInterval(() => {
      runBackfill();
    }, PERIODIC_INTERVAL_MS);
    return () => clearInterval(id);
  }, [eligible, runBackfill]);

  return {
    runBackfill,
    lastBackfillAt,
    isRunning,
    error,
    pendingSyncCount,
    pendingSyncLoading: pendingSyncQuery.isLoading,
    pendingSyncError: pendingSyncQuery.error,
    eligible,
  };
}
