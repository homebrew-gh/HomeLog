import type { NostrEvent, NostrFilter } from '@nostrify/nostrify';

interface Queryable {
  query(filters: NostrFilter[], opts?: { signal?: AbortSignal }): Promise<NostrEvent[]>;
}

export interface SiblingDeletionOptions {
  /** For addressable events (kind 30000+): the 'd' tag value. Omit for replaceable/regular. */
  dTag?: string;
  /** For regular events (dedupe by kind, pubkey, created_at): filter siblings by this timestamp. */
  created_at?: number;
}

/**
 * Fetch all event IDs for the same logical entity from both private and public relay sets,
 * for NIP-09 delete path (remove both plain and encrypted copies).
 * - Addressable (kind 30000+): pass dTag.
 * - Replaceable (kind 10000–19999): pass no dTag, no created_at.
 * - Regular: pass created_at to match siblings.
 */
export async function getSiblingEventIdsForDeletion(
  privateGroup: Queryable,
  publicGroup: Queryable,
  kind: number,
  pubkey: string,
  options?: SiblingDeletionOptions,
  signal?: AbortSignal
): Promise<string[]> {
  const filter: NostrFilter = {
    kinds: [kind],
    authors: [pubkey],
  };
  if (options?.dTag !== undefined && options.dTag !== '') {
    filter['#d'] = [options.dTag];
  }
  const opts = signal ? { signal } : undefined;

  const [privateEvents, publicEvents] = await Promise.all([
    privateGroup.query([filter], opts),
    publicGroup.query([filter], opts),
  ]);

  const created_at = options?.created_at;
  const match = (e: NostrEvent) =>
    created_at === undefined || e.created_at === created_at;

  const ids = new Set<string>();
  for (const e of privateEvents) if (match(e)) ids.add(e.id);
  for (const e of publicEvents) if (match(e)) ids.add(e.id);
  return [...ids];
}
