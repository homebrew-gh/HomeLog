# Private Relays Implementation Plan

Plan for adding private-relay functionality: encrypted storage of private relay URLs in NIP-78, exclusion from NIP-65, preferred read order, plaintext-on-private vs encrypted-on-public, warning/acknowledgment, and related logic.

**Note:** There are currently no users. Backwards compatibility (migration from existing private-relay state, support for old NIP-78 schemas or existing ws:// private relays) is unnecessary and can be omitted.

---

## 1. Encryption policy: hide configuration, encrypt by default

- **Hide encryption configuration UI:** Do not show the encryption settings menu (e.g. per-category toggles) to users. Hide it via conditional render, feature flag, or by not exposing the route/section in the app—**do not remove the code**, so it can be re-enabled later if desired.
- **Fixed policy:** All categories are encrypted by default and cannot be altered by the user. The app behaves as if encryption is always on for every category.
- **Only unencrypted data:** The only circumstance in which data is stored unencrypted is when a relay is marked **private** (plaintext sent to that relay only), subject to the warning, “I understand,” and wss:// restriction already in this plan.
- **Code retention:** Keep the encryption configuration components and logic in the codebase (e.g. EncryptionSettingsDialog, EncryptionContext defaults and setters) so the option to surface the menu again in the future remains possible without re-implementing.

---

## 2. Encrypted storage of private relays in app preferences (NIP-78)

- Extend NIP-78 app data (kind 30078) with an encrypted field (e.g. `privateRelays`) containing the list of private relay URLs and read/write flags.
- Encrypt to self with NIP-44 (same pattern as Blossom servers). Public relays store the event but cannot read the URLs.
- Bootstrap: NIP-78 is fetched over the relay pool; private relays are only known after decrypting NIP-78. Bootstrap from NIP-65 or default public relays first, then add private relays to the pool after decrypt.

---

## 3. Excluding private relays from NIP-65

- When publishing kind 10002, include only relays that are **not** in the private relay list.
- Every code path that publishes NIP-65 must use the same “full list minus private” logic.

---

## 4. Merging NIP-65 and NIP-78 into the full relay list and preferred order

- Full relay list = private relays (from NIP-78, decrypted) + public relays (from NIP-65). Private relays first so they are preferred for event fetching.
- Single derived relay list used by NostrProvider and all sync/query logic; dedupe by URL, treat as private if in private list.

---

## 5. Warning and “I understand” for marking a relay private

- When the user marks a relay as “private,” show a prominent warning before applying: data on private relays is stored in **plaintext**; only for self-hosted or trusted relays; they must trust the relay and its security.
- User must dismiss with an explicit “I understand” before the relay is saved as private.
- Show every time a relay is marked private (or at least once per relay). No need to persist the acknowledgment.

### 5.1 Restrict private marking to secure (wss://) relays only

- **Rule:** Do not allow a relay to be marked private if its URL uses `ws://` (unencrypted WebSocket). Only allow private for `wss://` URLs.
- **Rationale:** Private relays receive plaintext data. If the transport is also unencrypted, anyone on the network can sniff traffic, which undermines privacy and is misleading if we call the relay “private.”
- **Behavior:**
  - When rendering the “Private Relay” switch for a relay, if the relay URL is `ws://` (or otherwise not `wss://`): disable the switch and do not call `setPrivateRelay` when the user toggles. Optionally show a short explanation (e.g. tooltip or inline text): “Private relays require wss:// so traffic is encrypted. Use a secure relay URL to mark as private.”
  - If a relay is already marked private and its URL is later changed to `ws://` (e.g. via some edit flow), or if existing data has a private relay with `ws://`: on load or on next save, clear the private flag for that URL (treat as non-private) so we never persist “private + ws://.” Optionally show a one-time toast that the relay was unmarked as private because it does not use wss://.
- **Validation:** Add a small helper e.g. `isRelayUrlSecure(url: string): boolean` (true for `wss://`, false for `ws://` or invalid). Use it in the RelayListManager (and any other UI that can set “private”) to disable the private switch and/or block `setPrivateRelay(relay.url, true)` when the URL is not secure.
- **Edge case:** Relays that are not strictly `ws://` or `wss://` (e.g. custom schemes) can be treated as insecure for private marking unless we explicitly allow them; default to “cannot mark private” for non-wss URLs.

---

## 6. Dual publish: plaintext to private, encrypted to public

- For all categories (encryption is always on per Section 1): publish two versions when private relays exist—plaintext to private relays only, NIP-44 encrypted to public relays only. Same logical entity (kind, pubkey, d-tag / created_at); different event ids. If there are no private relays, publish only the encrypted version to public relays (current behavior).
- Centralize “publish for category” so every create/update uses the same logic and targets the correct relay subsets. Caching relay gets the same version as its group (private vs public).

---

## 7. Read path: deduplication and plaintext vs encrypted

- **Dedupe key:** Replaceable events: `(kind, pubkey)`. Addressable events: `(kind, pubkey, d-tag)`. Other kinds (e.g. regular): `(kind, pubkey, created_at)`. Among ties (same `created_at`), prefer plaintext so we avoid unnecessary decryption.
- Shared dedupe layer before parsing; parsing accepts both plaintext and encrypted content.

---

## 8. Delete path: remove both plaintext and encrypted copies

- On delete: (1) Publish NIP-09 for the event id being deleted. (2) Find all “sibling” event ids (same logical entity: same kind, pubkey, d-tag for addressable, or same key for replaceable) on **both** relay sets—query the private set if the current event came from public, and the public set if it came from private. (3) Publish NIP-09 for each sibling id so both plaintext and encrypted copies are removed.

---

## 9. Migration and backward compatibility

- **Not required:** There are currently no users, so no migration from existing private-relay state (localStorage, old NIP-78, or ws:// private relays) is needed. Implement from a clean slate.

---

## 10. Implementation order (suggested)

1. **Encryption policy:** Hide encryption configuration UI (do not remove code); treat all categories as encrypted and unalterable; only unencrypted data is on private relays (per plan).
2. Data model and NIP-78 encrypted `privateRelays`; load/save.
3. Relay list merge and NIP-65 filter; private-first order in NostrProvider.
4. **ws:// restriction:** Helper `isRelayUrlSecure`; in RelayListManager disable “Private” switch (and block setPrivateRelay when not secure); add tooltip or inline text explaining wss:// required.
5. Warning and “I understand” when marking a relay private (only for wss:// relays).
6. Dual publish and read dedupe.
7. Delete path (both copies).
8. ~~Migration~~ Omit (no existing users).

---

## 11. Risks and mitigations

| Risk | Mitigation |
|------|-------------|
| User marks ws:// as private | Disable switch and validate; clear private flag for ws:// on load/save. |
| Inconsistent dual publish | Single publish abstraction; review all hooks. |
| Dedupe bugs | Central dedupe layer; tests with mixed plaintext/encrypted. |
| Delete leaves ghost copy | Best-effort sibling delete; optional retry or UI later. |

---

## Implementation logic review

This section validates that the plan is internally consistent and identifies edge cases and gaps.

### Consistency

- **Encryption policy vs dual publish:** Section 1 fixes “encryption always on” for all categories; Section 6 says “for categories with encryption enabled.” With the UI hidden, encryption is always on, so treat “encryption enabled” as always true for dual publish. No contradiction.
- **Only unencrypted on private:** Plaintext is sent only to relays in the private list (Section 6). Public relays and NIP-65 never see private URLs (Sections 2, 3). Aligned.
- **Bootstrap order:** Private relays are only known after decrypting NIP-78; NIP-78 is fetched over the pool. So we must bootstrap from NIP-65 (or defaults), then fetch NIP-78, then merge and add private relays. Section 2 states this; Section 4 (merge) assumes both sources are available. Order is correct.

### Dedupe and event identity

- **Replaceable events:** Dedupe key is `(kind, pubkey)`; one “current” event per key; two physical events (plaintext + encrypted) with same `created_at`; tiebreaker: prefer plaintext. Sound.
- **Addressable events:** Dedupe key is `(kind, pubkey, d-tag)`; same tiebreaker. Sound.
- **Regular events (e.g. kind 1):** No d-tag; use `(kind, pubkey, created_at)` as dedupe key. Plan does not state this explicitly; implementer should add “for non-addressable/non-replaceable kinds, dedupe by (kind, pubkey, created_at) with same tiebreaker.”
- **Shared dedupe layer:** Running dedupe before parsing (Section 7) ensures one “winner” per logical entity and avoids double-counting in lists. Correct.

### Delete path

- **Sibling discovery:** “Find sibling event ids (same logical entity on the other relay set)” means: given the current event (e.g. from private), query the **public** relay set for events with same (kind, pubkey, d-tag); collect their ids; publish NIP-09 for each. And vice versa if current event is from public. Plan implies this; implementer must query **both** relay subsets (private-only and public-only) when resolving siblings, since there can be one plaintext copy on private and one encrypted copy on public. If multiple private relays exist, there can be one plaintext event per private relay (same content, same created_at) — so multiple siblings on the private set. Delete must target all of them.
- **Clarification:** Delete flow: (1) Publish NIP-09 for the event id being deleted. (2) Determine “other” set (if current from private, query public; if current from public, query private). (3) Query that set for events with same (kind, pubkey, d-tag) [or same key for replaceable]. (4) Publish NIP-09 for each id found. No gap; worth stating “query the other relay set” explicitly in Section 8.

### Caching relay

- Caching relay is either in the private list or not. It receives the same version as its group (plaintext if private, encrypted if public). Section 6 states this. No gap.

### NIP-65 and “full list”

- **Full list** = private (from NIP-78) + public (from NIP-65). When **publishing** NIP-65 we send only the public subset. So private relays are never written to 10002. When **reading** we merge and use full list with private first. Consistent.
- **Adding a relay as private:** Add to relay list (so it’s in “full list”), add to private list (NIP-78 encrypted), do **not** add to next NIP-65 publish. Plan implies this via Section 3; no explicit “add relay” flow — implementer applies the same rule when adding.

### ws:// and “no users”

- Section 5.1 says “if existing data has a private relay with ws://, clear private flag on load/save.” With no users (Section 9), there is no existing data; that sentence is for robustness (e.g. future edit of URL to ws://). Keeping it is fine.

### Gaps / additions

1. **Dedupe key for non-addressable kinds:** Explicitly state that for kinds that are not replaceable (single per pubkey) or addressable (d-tag), use `(kind, pubkey, created_at)` with the same tiebreaker.
2. **Delete: both sets:** In Section 8, state that we must find siblings on **both** the private and public relay sets (query private set for same entity when current is from public, and vice versa), and publish NIP-09 for every sibling id.
3. **No private relays:** When there are zero private relays, dual publish reduces to “encrypted to public only” (current behavior). No plaintext version. Plan implies this; could be stated in Section 6.
4. **No public relays:** If the user has only private relays (no public in list), we’d publish only plaintext. NIP-65 would be empty or minimal. Plan doesn’t forbid it; implementer should allow “private only” and publish 10002 with no tags or with no relays (or skip publish). Edge case; acceptable as-is.
