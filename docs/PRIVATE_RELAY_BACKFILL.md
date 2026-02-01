# Private Relay Backfill (Design)

When a user publishes events while away from home, those events only reach **public** relays (their Umbrel/Start9 relay is unreachable). When they return home and their private relay comes back online, those events do **not** automatically propagate to the private relay. This document outlines how Cypher Log could implement a background backfill process to sync those events to private relay(s).

## Goals

- When the user has private relay(s) and they become reachable (e.g. back on home LAN), automatically backfill events that were published only to public relays.
- Backfill = fetch events from **public** relays (where they exist in encrypted form), decrypt, and publish **plaintext** to **private** relay(s).
- Avoid hammering relays; respect user’s signer (e.g. NostrConnect) with bounded concurrency.

## When to Trigger Backfill

| Trigger | Pros | Cons |
|--------|------|------|
| **Reconnection** | Runs only when private relay goes from unreachable → reachable. | Requires shared “private relay reachability” state; pool may not expose it today. |
| **Periodic (e.g. every 30 min)** | Simple: when app is open, if private relays exist, try backfill for “since last run.” | Can run when private relay is still unreachable (wasted work until home). |
| **On app load** | One-shot when user opens app; good if they often open app after getting home. | Heavy first load if many events. |
| **Manual (“Sync to private relay”)** | User-controlled; no background logic. | User must remember to tap; no “automatic” experience. |

**Recommended:** Combine **periodic** + **manual**.

- **Periodic:** When app is open, every N minutes (e.g. 30), if user has private relay(s) and we haven’t run backfill in the last interval, try to reach private relay(s) (e.g. one quick `REQ` or reuse existing pool). If any are reachable, run backfill for events since `lastBackfillAt` (stored in localStorage or NIP-78).
- **Manual:** Settings / relay management: button “Sync my data to private relay(s)” that runs backfill for a chosen window (e.g. last 7 days or “all”).

Reconnection-triggered backfill is a nice future improvement once relay connection status is available outside RelayListManager (e.g. from pool or a small “reachability” module).

## What to Backfill

- **Authors:** Current user’s `pubkey` only.
- **Kinds:** All Cypher Log data kinds that are dual-published (same set as in `useDataSyncStatus`):
  - `APPLIANCE_KIND`, `VEHICLE_KIND`, `MAINTENANCE_KIND`, `COMPANY_KIND`, `SUBSCRIPTION_KIND`, `WARRANTY_KIND`, `MAINTENANCE_COMPLETION_KIND`, `PET_KIND`, `PROJECT_KIND`, `PROJECT_ENTRY_KIND`, `PROJECT_TASK_KIND`, `PROJECT_MATERIAL_KIND`, `VET_VISIT_KIND`.
  - Optionally kind `5` (deletions) so private relay also gets deletion events; same logic as sibling deletion (target event IDs).
- **Time range:** Since `lastBackfillAt` (periodic) or user-chosen range (manual). Cap (e.g. last 90 days) to avoid unbounded load.
- **Source:** Query **public** relays only (relays that are in the user’s list and are **not** marked private).
- **Destination:** **Private** relay(s) only (wss:// URLs from preferences).

## Flow (High Level)

1. **Eligibility:** User logged in, has at least one private relay (wss://), has public relays, signer supports NIP-44.
2. **Reachability (periodic):** Optionally check that at least one private relay is reachable (e.g. short-lived `REQ` for own pubkey, limit 1) before doing full backfill. If none reachable, skip and retry next period.
3. **Fetch from public relays:** One query to public relay group: all kinds above, `authors: [user.pubkey]`, `since: lastBackfillAt` (or since timestamp for manual range), limit per kind or total.
4. **Deduplicate:** By logical key (reuse `dedupeEventsByLogicalKey` or same key logic). Prefer plaintext if present (e.g. from a relay that had plaintext); for backfill we expect encrypted from public.
5. **Decrypt:** For each event, if content is NIP-44 encrypted (`content.startsWith('nip44:')`), decrypt with `user.signer.nip44.decrypt(user.pubkey, content)`. If decryption fails, skip event (log and continue).
6. **Build plain event:** Same `kind`, `tags`, `created_at`; content = decrypted string. Sign with `user.signer.signEvent(...)`.
7. **Publish to private relay(s):** `nostr.group(privateRelayUrls).event(plainEvent)`. Batch or small concurrency (e.g. 3–5 at a time) to avoid overwhelming signer/relays.
8. **Update `lastBackfillAt`:** After successful run, set to “now” (or max `created_at` of backfilled events) and persist (localStorage or NIP-78).

## Technical Notes

- **Relay lists:** Use same split as `useNostrPublish`: private = `preferences.privateRelays` filtered by `isRelayUrlSecure`; public = `config.relayMetadata.relays` with write, excluding private. So only wss:// private relays participate.
- **Decryption:** Use existing `useEncryption` → `decryptFromSelf` or equivalent (signer.nip44.decrypt(self, content)). Strip `nip44:` prefix if present before decrypt.
- **Idempotency:** Private relay may already have some events (e.g. from when user was home). Re-publishing the same logical event as plaintext produces a **different** event id (different content). That’s fine: app already dedupes by logical key and prefers plaintext. So we can always “overwrite” by re-publishing; no need to query private relay first unless we want to skip already-synced events (optional optimization).
- **Deletions (kind 5):** If we backfill kind 5, we need to send the same deletion event to private relay so it hides the corresponding events. No decryption; just re-publish the kind 5 event to private group.
- **Rate limiting:** Throttle decryption and publish (e.g. limit concurrency with `pLimit` or similar, small delay between batches) so remote signers and relays aren’t hammered.
- **Errors:** If private relay publish fails for some events, we can retry on next run (same `lastBackfillAt`); or store “last successful backfill per relay” for finer retry. Start simple: one `lastBackfillAt`, retry full window on next run if needed.

## Where to Implement

- **New hook:** `usePrivateRelayBackfill()` that:
  - Reads user, private relays, public relays, signer, preferences.
  - Exposes `runBackfill(options?: { since?: number; manual?: boolean })` and optionally `lastBackfillAt`, `isRunning`, `error`.
  - Called by a small **background trigger** (e.g. `useEffect` + `setInterval` when app is open and user has private relays) and by a manual “Sync to private relay(s)” button.
- **Persistence:** `lastBackfillAt` in localStorage (key e.g. `cypherlog-backfill-last`) or in NIP-78 (encrypted) so it survives devices if desired. Start with localStorage.
- **UI:** Settings or Relay Management: one button “Sync my data to private relay(s)” that calls `runBackfill({ since: sevenDaysAgo, manual: true })` and shows toast or small progress.

## Summary

| Step | Action |
|------|--------|
| Trigger | Periodic (e.g. 30 min) when app open + manual button |
| Scope | Current user’s events, all Cypher Log data kinds, since last backfill (or chosen range) |
| Source | Public relays only |
| Destination | Private relays only (wss://) |
| Transform | Decrypt NIP-44 content → sign plain event → publish to private |
| State | `lastBackfillAt` in localStorage (or NIP-78 later) |

This gives users a clear path to “fill” their Umbrel/Start9 relay with events that were only on public relays when they were away, without changing how Nostr relays work and without requiring relay-side sync features.
