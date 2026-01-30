# Security Review: Cypher Log

**Review Date:** January 2026  
**Reviewer:** Senior Security Researcher (AI-assisted)  
**Scope:** Full codebase security audit

---

## Executive Summary

Cypher Log is a privacy-focused home management application built on Nostr. The application handles sensitive personal data (vehicle information, financial subscriptions, pet medical records, etc.) and implements NIP-44 encryption for data protection.

**Overall Assessment:** The application demonstrates good security practices for a client-side web application. Most issues identified are **minimal** or **moderate** in severity. There are no critical vulnerabilities that would allow direct data compromise, but several areas could be hardened before public release.

---

## Findings by Severity

### CRITICAL (0 issues)

No critical security vulnerabilities were identified. The application does not:
- Execute arbitrary code (no `eval()` or `new Function()`)
- Store private keys in plain localStorage
- Transmit unencrypted sensitive data to untrusted servers
- Have authentication bypass vulnerabilities

---

### WORRISOME (3 issues)

#### 1. Silent Encryption Fallback to Plaintext

**Location:** `src/hooks/useEncryption.ts` (lines 30-44)

**Issue:** When NIP-44 encryption fails or is unavailable, the code silently falls back to storing data in plaintext without warning the user.

```typescript
const encryptToSelf = useCallback(async (plaintext: string): Promise<string> => {
  if (!user?.signer?.nip44) {
    console.warn('[Encryption] NIP-44 not available, storing plaintext');
    return plaintext;  // SILENT FALLBACK - USER NOT WARNED
  }
  try {
    const encrypted = await user.signer.nip44.encrypt(user.pubkey, plaintext);
    return ENCRYPTED_MARKER + encrypted;
  } catch (error) {
    console.error('[Encryption] Failed to encrypt:', error);
    return plaintext;  // SILENT FALLBACK ON ERROR
  }
}, [user]);
```

**Risk:** Users who believe their data is encrypted may unknowingly publish plaintext events to public relays. This is especially problematic for sensitive categories (vehicles with VINs/plates, subscriptions with payment info, pet medical records).

**Recommendation:**
1. Show a prominent warning when encryption is unavailable
2. Require explicit user consent before falling back to plaintext
3. Consider blocking publish for sensitive categories if encryption fails
4. Add a visual indicator in the UI showing encryption status per event

---

#### 2. NWC Connection Strings Stored in localStorage

**Location:** `src/hooks/useNWC.ts` (line 24)

**Issue:** Nostr Wallet Connect (NWC) connection strings, which contain wallet access secrets, are stored in browser localStorage.

```typescript
const [connections, setConnections] = useLocalStorage<NWCConnection[]>('nwc-connections', []);
```

**Risk:** 
- XSS attacks could steal wallet connection strings
- Shared/public computers could expose wallet access
- Browser extensions with localStorage access could read them
- The `sessionGuard.ts` does clear these on browser close (if enabled), but many users leave that disabled

**Recommendation:**
1. Encrypt NWC connection strings before storing (using the user's Nostr keys)
2. Consider using sessionStorage instead of localStorage
3. Add prominent warnings about wallet connection security
4. Implement a "wallet timeout" that requires re-authentication after inactivity

---

#### 3. Excessive Console Logging in Production

**Location:** Multiple files in `src/hooks/` (62+ console statements found)

**Issue:** Sensitive information is logged to the browser console in production, including:
- Pubkeys and event data
- Upload server information
- Sync status with data counts
- NWC connection attempts

Examples:
```typescript
console.log('[DataSync] Starting relay query for pubkey:', user.pubkey);
console.log('Upload successful, tags:', tags);
console.log('Attempting to delete file:', { url: fileUrl, hash, server });
```

**Risk:**
- Shoulder surfing on shared computers
- Browser extensions that capture console output
- Forensic analysis of crash reports
- Makes debugging by attackers easier

**Recommendation:**
1. Implement a logging utility that respects production mode
2. Strip `console.log` statements in production builds (Vite can do this)
3. Keep only `console.error` for genuine errors
4. Never log: pubkeys, file hashes, connection strings, or event counts

---

### MINIMAL (8 issues)

#### 4. No Input Validation on Date Strings

**Location:** Throughout data hooks (useMaintenance.ts, useVehicles.ts, etc.)

**Issue:** Date fields accept `MM/DD/YYYY` format strings without validation. Malformed dates could cause calculation errors.

```typescript
purchaseDate: getTagValue(event, 'purchase_date'),  // No validation
```

**Risk:** Low - would only affect the user's own display, not security.

**Recommendation:** Add date validation helper, reject invalid formats.

---

#### 5. JSON.parse Without Try-Catch in Some Locations

**Location:** `src/hooks/useLocalStorage.ts` (line 28), `src/hooks/useEncryption.ts` (lines 87, 122)

**Issue:** Some `JSON.parse` calls could throw on malformed data.

**Risk:** Low - would cause component crashes but no data leakage.

**Recommendation:** Wrap all `JSON.parse` calls in try-catch blocks.

---

#### 6. dangerouslySetInnerHTML Usage

**Location:** `src/components/ui/chart.tsx` (line 79)

**Issue:** Uses `dangerouslySetInnerHTML` to inject CSS styles.

```typescript
<style dangerouslySetInnerHTML={{ __html: ... }} />
```

**Risk:** Very Low - the content is generated from internal theme configuration, not user input. This is a standard pattern for CSS-in-JS.

**Recommendation:** No action needed, but document that this is intentional.

---

#### 7. File URLs Not Sanitized Before Display

**Location:** `src/components/BlossomMedia.tsx`

**Issue:** File URLs from Nostr events are used directly in `<img src>` and `<a href>` attributes.

**Risk:** Low - browsers handle URL sanitization, and React escapes content by default.

**Recommendation:** Add URL validation to ensure only http/https protocols are used.

---

#### 8. No Rate Limiting on Event Publishing

**Location:** `src/hooks/useNostrPublish.ts`

**Issue:** No client-side rate limiting on publishing events to relays.

**Risk:** Low - could result in relay rate limits or bans, but not security issue.

**Recommendation:** Add debouncing for rapid operations (especially maintenance completions).

---

#### 9. External API Calls Through CORS Proxy

**Location:** `src/lib/currency.ts` (lines 193-207)

**Issue:** Exchange rate API calls go through `proxy.shakespeare.diy`.

```typescript
const fiatResponse = await fetch(
  `https://proxy.shakespeare.diy/?url=${encodeURIComponent(...)}`
);
```

**Risk:** Low - the proxy operator (Shakespeare) could theoretically see exchange rate requests. No sensitive data is transmitted.

**Recommendation:** Document the data flow. Consider direct API calls when possible.

---

#### 10. Logout-on-Close Disabled by Default

**Location:** `src/lib/sessionGuard.ts`

**Issue:** The security feature to clear login on browser close is opt-in, not default.

**Risk:** Low - users who forget to log out on shared computers remain logged in.

**Recommendation:** Consider making this opt-out instead of opt-in, with clear explanation.

---

#### 11. No Content Security Policy

**Location:** `index.html` / deployment configuration

**Issue:** No CSP headers configured to prevent XSS attacks.

**Risk:** Low for this app (no user-generated HTML content), but defense-in-depth is good.

**Recommendation:** Add CSP headers in deployment configuration:
```
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';
```

---

## Positive Security Observations

The following security practices are implemented correctly:

1. **NIP-44 Encryption** - Properly uses `encrypt-to-self` pattern with user's own pubkey
2. **No Private Key Handling** - All signing delegated to external signers (Alby, nos2x)
3. **No eval() or dynamic code execution** - Clean codebase
4. **No innerHTML on user content** - React's JSX escaping used properly
5. **NoteContent Sanitization** - URLs are linkified safely, not as raw HTML
6. **Session Guard** - Optional logout-on-close for shared computers
7. **Private Relay Concept** - Users can designate relays for sensitive data
8. **Encrypted Marker Prefix** - Clear `nip44:` prefix identifies encrypted content
9. **File Upload to Private Servers Only** - Requires private Blossom server configuration
10. **Deletion Event Handling** - Proper kind 5 deletion with cache cleanup

---

## Recommendations Summary

### Priority 1 (Before Public Release)
- [ ] Warn users when encryption fallback occurs
- [ ] Reduce console logging in production
- [ ] Validate date input formats

### Priority 2 (Soon After Release)
- [ ] Encrypt NWC connection strings in storage
- [ ] Add CSP headers to deployment
- [ ] Implement logging utility with production mode

### Priority 3 (Future Enhancement)
- [ ] Add rate limiting for event publishing
- [ ] Make logout-on-close opt-out
- [ ] Add URL protocol validation for media

---

## Conclusion

Cypher Log demonstrates thoughtful security design for a Nostr application. The encryption implementation is sound, and no critical vulnerabilities were found. The main areas for improvement are:

1. **User awareness** - Make encryption status visible and prevent silent fallbacks
2. **Production hygiene** - Reduce console logging and add CSP
3. **Wallet security** - Encrypt NWC strings in storage

The application is suitable for public release with the Priority 1 recommendations addressed. The remaining items are hardening measures that can be implemented iteratively.

---

*This review was conducted by analyzing source code. Runtime testing, penetration testing, and dependency vulnerability scanning are recommended as additional security measures.*
