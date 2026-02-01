import type { NostrEvent, NostrFilter } from '@nostrify/nostrify';

interface Queryable {
  query(filters: NostrFilter[], opts?: { signal?: AbortSignal }): Promise<NostrEvent[]>;
}

/**
 * Fetch all event IDs for the same logical entity (kind, pubkey, d-tag) from both
 * private and public relay sets, for NIP-09 delete path (remove both plain and encrypted copies).
 */
export async function getSiblingEventIdsForDeletion(
  privateGroup: Queryable,
  publicGroup: Queryable,
  kind: number,
  pubkey: string,
  dTag: string,
  signal?: AbortSignal
): Promise<string[]> {
  const filter: NostrFilter = {
    kinds: [kind],
    authors: [pubkey],
    '#d': [dTag],
  };
  const opts = signal ? { signal } : undefined;

  const [privateEvents, publicEvents] = await Promise.all([
    privateGroup.query([filter], opts),
    publicGroup.query([filter], opts),
  ]);

  const ids = new Set<string>();
  for (const e of privateEvents) ids.add(e.id);
  for (const e of publicEvents) ids.add(e.id);
  return [...ids];
}
