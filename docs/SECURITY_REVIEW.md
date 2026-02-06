# Security Review: Cypher Log

**Review Date:** January 2026  
**Re-Analysis Date:** February 2026  
**Reviewer:** Senior Security Researcher (AI-assisted)  
**Scope:** Full codebase security audit, privacy policy & FAQ alignment, and verification of remediation

---

## Executive Summary

Cypher Log is a privacy-focused home management application built on Nostr. The application handles sensitive personal data (vehicle information, financial subscriptions, pet medical records, companies, projects, etc.) and implements NIP-44 encryption for data protection. All data categories are encrypted by default; users can turn encryption off per category in Settings if desired.

**Overall Assessment:** The application demonstrates good security practices for a client-side web application. Several previously identified issues have been remediated (encryption fallback, production logging utility, CSP). **One new critical issue was identified:** Nostr Connect login logs the connection secret and full URI to the browser console, which could enable session hijacking if the console is captured. Remaining items are moderate or minimal. Privacy policy and FAQ are largely aligned with behavior; **gaps** exist for the Shakespeare AI API (if/when AI chat is exposed) and for Direct Messages (if the feature is enabled).

---

## Status of Previous Findings

### Issue 1: Silent Encryption Fallback to Plaintext — **FIXED**

**Previous location:** `src/hooks/useEncryption.ts`

**Remediation:** The hook now throws `EncryptionUnavailableError` instead of returning plaintext when NIP-44 is unavailable or encryption fails. Callers must handle the error and inform users. No silent fallback occurs.

**Verification:** Privacy policy correctly states: *"If encryption fails for any reason, Cypher Log will NOT store your data in plaintext without your knowledge. The operation will fail and you will be notified."*

---

### Issue 2: NWC Connection Strings in localStorage — **OPEN (unchanged)**

**Location:** `src/hooks/useNWC.ts` (line 24)

**Status:** NWC connection strings are still stored in browser localStorage. The privacy policy discloses this (*"If you connect a Lightning wallet via NWC, connection strings are stored locally in your browser"*). When "logout on close" is enabled, `sessionGuard.ts` clears NWC keys on browser close, which reduces risk on shared machines.

**Recommendation:** Still recommended to encrypt NWC connection strings before storing (e.g. using the user's Nostr keys) and to add a prominent warning about wallet connection security.

---

### Issue 3: Excessive Console Logging in Production — **PARTIALLY FIXED**

**Remediation:** A production-safe `logger` utility exists in `src/lib/logger.ts` that suppresses `log`/`warn`/`debug` in production while keeping `error`. Several modules (e.g. `useEncryption.ts`, `useNWC.ts`) have been migrated to use `logger`.

**Remaining concern:** Many files still use raw `console.log`/`console.warn`/`console.error`. In particular, **NostrConnectLogin** logs highly sensitive data (see New Finding below). Other files with verbose or potentially sensitive logging include:
- `BlossomServerManager.tsx` — server URLs, upload URLs
- `UserPreferencesContext.tsx` — preference sync and decrypt status
- `NostrSync.tsx` — relay counts
- `NostrProvider.tsx` — relay URLs
- `DMProvider.tsx` — event details in some error paths
- `PersistentStorageManager.tsx`, `PWAManager.tsx` — feature state

**Recommendation:** Migrate all logging to `logger` and never log secrets, connection strings, pubkeys, or full URIs. Strip or replace remaining `console.*` in production builds if desired.

---

### Issue 4: No Input Validation on Date Strings — **OPEN**

Date fields still accept format strings without strict validation. Low risk; recommendation remains: add date validation helper and reject invalid formats.

---

### Issue 5: JSON.parse Without Try-Catch — **MOSTLY ADDRESSED**

`useLocalStorage.ts` wraps deserialize in try-catch and returns default on failure. `useEncryption.ts` uses try-catch in `decryptJson` and plaintext parsing in `decryptForCategory`. Recommendation: ensure any remaining `JSON.parse` call sites are wrapped where they handle untrusted or persisted data.

---

### Issue 6: dangerouslySetInnerHTML in chart.tsx — **ACCEPTED RISK**

Usage is limited to internal theme-driven CSS in `src/components/ui/chart.tsx`. Not user-controlled; risk remains very low. No change required.

---

### Issue 7: File URLs Not Sanitized Before Display — **OPEN**

**Location:** `src/components/BlossomMedia.tsx`, `FileViewer.tsx`, `useBlossomUrl.ts`

URLs from Nostr events are used in `<img src>` and `<a href>` without explicit protocol allowlisting. Browsers mitigate `javascript:` in `img.src`; recommendation remains: validate that only `https:` (and optionally `http:` or `blob:` for same-origin) are used before assigning to `src`/`href` to prevent abuse (e.g. `data:` or unexpected schemes).

---

### Issue 8: No Rate Limiting on Event Publishing — **OPEN**

No client-side rate limiting in `useNostrPublish.ts`. Low risk (relay-side limits apply). Recommendation: add debouncing for rapid operations if desired.

---

### Issue 9: External API Calls Through CORS Proxy — **DOCUMENTED**

Currency exchange requests go through `proxy.shakespeare.diy`. Privacy policy mentions "Currency Exchange Rate APIs" and that no personal data is transmitted. Recommendation: document the proxy in the privacy policy if not already clear (currently covered under third-party APIs).

---

### Issue 10: Logout-on-Close Disabled by Default — **OPEN**

`sessionGuard.ts` keeps logout-on-close opt-in. Session guard does clear NWC connections when the feature is enabled. Recommendation: consider making it opt-out with clear explanation, or leave as-is and ensure FAQ/privacy explain the option.

---

### Issue 11: No Content Security Policy — **FIXED**

**Remediation:** A Content-Security-Policy meta tag is present in `index.html` (e.g. `default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self' blob: https: wss:; ...`). Additional hardening headers (X-Content-Type-Options, X-Frame-Options, X-XSS-Protection) are set in `vercel.json`.

---

## New Findings (February 2026 Re-Analysis)

### CRITICAL: Nostr Connect Secret and URI Logged to Console

**Location:** `src/components/auth/NostrConnectLogin.tsx` (lines 102–104, 169, 176, 178, 182, 189–191, 215)

**Issue:** The component uses raw `console.log` to output:
- The full Nostr Connect URI (which can contain the connection secret in query params)
- The `secret` value used for the connection handshake
- Relay URL and decryption/response details

**Risk:** In production, `console.log` still runs (this file does not use the `logger` utility). Anyone with access to the browser console (shoulder surfing, malicious extension, crash reports, dev tools left open) could capture the secret and potentially hijack or replay the connection.

**Recommendation:** Remove all logging of `secret`, `uri`, and `relayUrl` in this component. Use the project's `logger` for any non-sensitive debug messages, and ensure no sensitive values are ever passed to `logger` in a way that could appear in production (e.g. avoid logging objects that contain the secret).

**Remediation (February 2026):** Completed. All logging of URI, secret, relayUrl, response body, and "expected secret" was removed. The component now uses `logger` from `@/lib/logger` for non-sensitive messages (connection success, decrypt method, errors). No sensitive data is logged.

---

### MODERATE: Shakespeare AI API Not Disclosed in Privacy Policy / FAQ

**Location:** `src/hooks/useShakespeare.ts` — requests to `https://ai.shakespeare.diy/v1` (chat completions, models).

**Issue:** When AI chat features are used, user-provided messages (and optionally image URLs) are sent to the Shakespeare AI API with NIP-98 authentication. The privacy policy mentions:
- Currency exchange and the proxy (`proxy.shakespeare.diy`) for rate requests
- BTCMap, NWC, relays, Blossom, etc.

It does **not** mention:
- The Shakespeare **AI** service (`ai.shakespeare.diy`) or that chat content is sent to a third-party API for processing.

**Risk:** Users may believe their AI conversations are only local or only authenticated, and are not informed that message content is processed by Shakespeare. This could be a privacy and compliance concern.

**Recommendation:** If AI chat is (or will be) exposed in the UI, add a clear subsection under "Third Parties" in the privacy policy describing:
- That AI features send message content (and any other sent data) to the Shakespeare AI API
- That the service is third-party and its privacy practices apply
- Any retention or logging implications if known

Add a FAQ entry such as "Where is my AI chat data sent?" with the same information.

**Note:** At review time, `useShakespeare` is not referenced by any page component in the router; if the feature is not yet user-facing, add the disclosure when the feature is enabled.

---

### MODERATE: Direct Messages (DMs) Not in Privacy Policy or FAQ

**Location:** `src/components/DMProvider.tsx`, `src/pages/Messages.tsx`, DM-related hooks and components.

**Issue:** The app includes a full DM stack (NIP-04 and NIP-17). `DMProvider` is **disabled by default** (`enabled = false`), and the Messages page is **not** currently mounted in `AppRouter.tsx` (no `/messages` route). If DMs are ever enabled or the route is added:
- Message content is encrypted (NIP-04/NIP-17) and stored on relays and optionally in IndexedDB locally.
- Relay operators see metadata (kind, pubkeys, timestamps); they do not see plaintext content.
- The privacy policy does not mention direct messaging, encrypted message storage, or IndexedDB caching of messages.

**Risk:** If the feature is enabled without documentation, users are not informed about where DM data is stored (relays, local cache) or who can see metadata.

**Recommendation:** Before enabling DMs or exposing the Messages page, add to the privacy policy and FAQ:
- That direct messages are end-to-end encrypted and stored on Nostr relays (and optionally cached locally)
- That relay operators can see metadata but not message content
- How to clear local DM cache if applicable

---

### MINIMAL: Remaining Raw console.* Usage

**Location:** Multiple files (see grep results in project; e.g. BlossomServerManager, UserPreferencesContext, NostrSync, DMProvider, PersistentStorageManager, etc.).

**Issue:** Dozens of `console.log`/`console.warn`/`console.error` calls remain. Some may log benign or error-only information; others could leak URLs, counts, or state. The production `logger` suppresses non-error logs only when code uses `logger`; raw `console.*` is not suppressed.

**Recommendation:** Systematically replace with `logger` and ensure no sensitive data is logged. Optionally add a build step to strip or no-op `console.*` in production.

---

## Privacy Policy & FAQ Alignment

### Covered Accurately

- **Encryption:** NIP-44, encrypt-to-self, per-category settings, and the fact that encryption can fail (and that the app will not silently store plaintext) are accurately described.
- **Private relays:** Plaintext on private relays, encrypted storage of private relay list in NIP-78, exclusion from NIP-65, and wss-only are correctly stated.
- **Blossom:** Server URLs encrypted in preferences; uploaded files not encrypted and publicly accessible; media server operators can see files. Clearly stated.
- **NWC:** Stored locally; payment requests to wallet service; no access to funds. Stated.
- **Relays:** NIP-42 auth, IP visibility, relay policies. Stated.
- **IP & network:** Who can see IP (relays, Blossom, signer relay, host). Stated.
- **Data categories:** Lists of data types (My Stuff, vehicles, maintenance, subscriptions, warranties, companies, projects, pets, etc.) match the app.
- **No analytics/tracking:** Correctly stated.
- **House Key recommendation, key loss, deletion (NIP-09), local storage:** All consistent with implementation.

### Gaps

1. **Shakespeare AI API:** Not mentioned. Add if AI chat is or becomes user-facing.
2. **Direct Messages:** Not mentioned. Add when/if DMs are enabled and the Messages page is reachable.
3. **IndexedDB:** Privacy policy mentions "local browser storage" for settings and cache; it does not explicitly mention IndexedDB used for DM cache or event cache. Consider a brief mention where relevant (e.g. "local database storage for caching messages or events").

---

## Positive Security Observations (Unchanged)

1. **NIP-44 encryption** — Encrypt-to-self pattern; no silent plaintext fallback.
2. **No private key handling** — Signing delegated to external signers.
3. **No eval() or dynamic code execution** — Clean codebase.
4. **No innerHTML on user content** — React JSX escaping; NoteContent linkification is safe.
5. **Session guard** — Optional logout-on-close; clears login and NWC when enabled.
6. **Private relay concept** — Encrypted storage of private relay list; excluded from NIP-65.
7. **Encrypted marker** — `nip44:` prefix for encrypted content.
8. **File upload** — Private Blossom server configuration; URLs encrypted in preferences.
9. **Deletion handling** — Kind 5 with cache cleanup; private relay sibling IDs considered.
10. **CSP and security headers** — In place.

---

## Recommendations Summary

### Priority 1 (Before Public Release / Immediately)

- [ ] **Fix Nostr Connect logging:** Remove or guard all logging of `secret`, full `uri`, and any connection strings in `NostrConnectLogin.tsx`; use `logger` only for non-sensitive messages.
- [ ] **Confirm encryption fallback:** Already fixed; no further action except to keep tests/docs in sync.
- [ ] **Reduce remaining sensitive console usage:** Migrate high-risk files (NostrConnectLogin, BlossomServerManager, UserPreferencesContext, NostrSync) to `logger` and avoid logging secrets, pubkeys, or full URIs.

### Priority 2 (Soon After Release)

- [ ] **Privacy & FAQ — AI:** If AI chat is user-facing, add Shakespeare AI API to "Third Parties" and a FAQ entry for where AI data is sent.
- [ ] **Privacy & FAQ — DMs:** When DMs are enabled, add direct messaging and local DM cache to privacy policy and FAQ.
- [ ] **NWC:** Consider encrypting NWC connection strings in storage; add prominent wallet security warning.
- [ ] **CSP:** Already in place; keep under review when adding new connect-src or script-src needs.

### Priority 3 (Future Hardening)

- [ ] **URL validation:** Allowlist http/https (and intended schemes) for Blossom/media URLs before use in `src`/`href`.
- [ ] **Rate limiting:** Optional client-side debouncing for event publishing.
- [ ] **Logout-on-close:** Consider opt-out with clear explanation; document in FAQ.
- [ ] **Date validation:** Add validation for date fields where appropriate.

---

## Conclusion

Cypher Log’s security posture has improved since the last review: encryption no longer falls back silently to plaintext, a production-safe logger exists, and CSP is in place. The **critical** item to address is the logging of the Nostr Connect secret and URI in `NostrConnectLogin.tsx`. Once that is fixed and any user-facing features (AI chat, DMs) are reflected in the privacy policy and FAQ, the application is in a strong position for release from a security and transparency perspective.

---

*This re-analysis was conducted by reviewing source code, the existing SECURITY_REVIEW.md, Privacy.tsx, FAQ.tsx, and related docs. Runtime testing, penetration testing, and dependency vulnerability scanning are recommended as additional measures.*
