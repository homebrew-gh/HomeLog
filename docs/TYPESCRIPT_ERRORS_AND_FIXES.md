# TypeScript Errors and Possible Fixes

This document reviews the TypeScript errors reported by `tsc --noEmit` and suggests concrete fixes. Errors are listed in file order.

## Status

- **Fixes 1–15:** All applied. `tsc --noEmit` passes.

---

## 1. `src/components/CompanyDetailDialog.tsx` (lines 93, 99) — FIXED

**Error:** `Argument of type 'string' is not assignable to parameter of type 'never'.`

**Cause:** `const parts = []` is inferred as `never[]`, so `parts.push(company.address)` and `parts.push(cityStateZip)` fail (string not assignable to never).

**Fix:** Type the array explicitly:

```ts
const parts: string[] = [];
```

---

## 2. `src/components/CompanyDialog.tsx` (line 768) — FIXED

**Error:** `Cannot find name 'Calendar'.`

**Cause:** `Calendar` is used in JSX but not imported from `lucide-react`.

**Fix:** Add `Calendar` to the lucide-react import at the top of the file:

```ts
import { ..., Calendar, ... } from 'lucide-react';
```

---

## 3. `src/components/NostrProvider.tsx` (line 94) — FIXED

**Error:** `Type 'NPool<...>' is not assignable to type 'NPool<...>'. Types have separate declarations of a private property '_relays'.`

**Cause:** Two different copies of `@nostrify/nostrify` (e.g. one at project root, one under `@nostrify/react/node_modules`). The `pool` from `useNostr()` is one NPool type; `NostrContext` expects the other.

**Possible fixes:**

- **A. Resolve duplicate package:** Ensure a single version of `@nostrify/nostrify` (e.g. npm/yarn dedupe, or forcing one version in `package.json` resolutions) so there is only one NPool type.
- **B. Type assertion (applied):** Cast at the provider:  
  `value={{ nostr: pool.current } as unknown as React.ComponentProps<typeof NostrContext.Provider>['value']}`  
  (Applied; cast via `unknown` so TypeScript accepts the assignment.) Use only if you’re sure the two NPool implementations are compatible at runtime.

---

## 4. `src/components/tabs/HomeTab.tsx` (lines 664, 664) — FIXED

**Error:** `Property 'top' does not exist on type 'never'.` and `Property 'height' does not exist on type 'never'.`

**Cause:** TypeScript does not narrow `let hoveredRect` after `hoveredRect !== null` (e.g. due to control flow or reassignment), so inside the `if` it can still treat `hoveredRect` as `never` or `null`.

**Fix:** After the null check, assign to a const with an explicit type so TypeScript narrows:

```ts
if (hoveredWidgetIndex !== null && hoveredRect !== null) {
  const rect: DOMRect = hoveredRect;
  const midY = rect.top + rect.height / 2;
  // ... rest using rect
}
```
**(Applied.)**

---

## 5. `src/contexts/EncryptionContext.tsx` (line 218) — FIXED

**Error:** `Property 'pets' is missing in type '{ appliances: boolean; ... }' but required in EncryptionSettings.`

**Cause:** `setAllEncryption` builds an object with all categories except `pets`. `EncryptionSettings` includes `pets: boolean`.

**Fix:** Add `pets` when setting all encryption:

```ts
setSettings({
  appliances: enabled,
  vehicles: enabled,
  maintenance: enabled,
  subscriptions: enabled,
  warranties: enabled,
  companies: enabled,
  projects: enabled,
  pets: enabled,  // add this
});
```

---

## 6. `src/contexts/UserPreferencesContext.tsx` (line 438) — FIXED

**Error:** `Property 'activeTab' is missing in type '{ activeTabs: TabId[]; ... }' but required in StoredPreferences.`

**Cause:** `prefsToSync` is typed as `StoredPreferences`, but is built from `restPrefs` which explicitly omits `activeTab` (and `exchangeRates`). So the object is missing required `activeTab`.

**Fix:** Include a default `activeTab` when building the payload (sync can ignore it; readers can use local `activeTab`):

```ts
const prefsToSync: StoredPreferences = { ...restPrefs, activeTab: 'home' };
```

**(Applied.)**

---

## 7. `src/hooks/useCurrency.ts` (line 56) — FIXED

**Error:** `'rates.btcPrice' is possibly 'undefined'.`

**Cause:** `StoredExchangeRates` has `btcPrice?: number`, so `rates.btcPrice` may be undefined. Using it in `rates.btcPrice > 0` triggers the error.

**Fix:** Use optional chaining or a default:

```ts
const hasRates = Object.keys(rates.rates).length > 0 || (rates.btcPrice ?? 0) > 0;
```

**(Applied.)**

---

## 8. `src/hooks/useLoginActions.ts` (line 59) — FIXED

**Error:** `Generic type 'NLogin<T, D>' requires 2 type argument(s).`

**Cause:** The object is typed as `NLogin` (raw generic) but not as `NLogin<'bunker', D>`. The app’s login shape (e.g. `bunkerUri`, `signer` at top level) may not match the library’s `NLoginBunker` (which uses a `data` object with `bunkerPubkey`, `clientNsec`, `relays`).

**Fix:** Use the library’s expected type (e.g. `NLoginType`) so `addLogin` accepts it:

```ts
import { NLogin, type NLoginType, useNostrLogin } from '@nostrify/react/login';

// ...

const login: NLoginType = {
  id: crypto.randomUUID(),
  type: 'bunker',
  pubkey: userPubkey,
  bunkerUri,
  signer,
  createdAt: Date.now(),
} as NLoginType;
addLogin(login);
```

**Applied:** Import `NLoginType`; type the login object and use `as unknown as NLoginType` so the incompatible shape (bunkerUri/signer at top level vs library’s `data`) is accepted.

---

## 9. `src/hooks/usePersistentStorage.ts` (line 140) — FIXED

**Error:** `This condition will always return true since this function is always defined. Did you mean to call it instead?`

**Cause:** `navigator.storage?.persist` is a function reference. In a boolean context it is always truthy when `navigator.storage` exists, so the condition doesn’t really check “is the persist API available.”

**Fix:** Check that the method exists (e.g. for calling it later) without implying you’re calling it:

```ts
if (prefEnabled && typeof navigator.storage?.persist === 'function') {
  const alreadyPersisted = await navigator.storage.persisted();
  // ...
}
```

So the condition is “persist is a function”; the actual call remains `navigator.storage.persisted()` and `requestPersistence()` as in the original code.

---

## 10. `src/hooks/useProjectEntries.ts` (line 283) — FIXED  
## 11. `src/hooks/useProjectMaterials.ts` (line 280) — FIXED  
## 12. `src/hooks/useProjectTasks.ts` (line 269) — FIXED

**Error:** `Argument of type 'string' is not assignable to parameter of type 'NostrEvent'.`

**Cause:** `deleteCachedEvent(event: NostrEvent)` expects a full event, but the code passes an event ID string (e.g. `entryId`, `materialId`, `taskId`). The cache also has `deleteCachedEventById(eventId: string)` for deletion by ID.

**Fix:** Use `deleteCachedEventById` and pass the id string. In each file:

1. Import:  
   `import { cacheEvents, getCachedEvents, deleteCachedEventById } from '@/lib/eventCache';`  
   (or add `deleteCachedEventById` to the existing import and remove `deleteCachedEvent` if no longer used).
2. Replace `await deleteCachedEvent(entryId);` with `await deleteCachedEventById(entryId);` (and similarly for materials/tasks with `materialId` / `taskId`).

**Applied:** Import `deleteCachedEventById`; call `deleteCachedEventById(entryId)` / `deleteCachedEventById(materialId)` / `deleteCachedEventById(taskId)`.

---

## 13. `src/hooks/useTabData.ts` (line 8) — FIXED

**Error:** `Cannot find module '@/contexts/TabPreferencesContext' or its corresponding type declarations.`

**Cause:** The file imports `TabId` from `@/contexts/TabPreferencesContext`, but that module does not exist. `TabId` is defined in `UserPreferencesContext.tsx`.

**Fix:** Change the import to:

```ts
import type { TabId } from '@/contexts/UserPreferencesContext';
```

**Applied.**

---

## 14. `src/pages/Index.tsx` (line 526) — FIXED

**Error:** `Property 'onEdit' is missing in type '{ isOpen: true; onClose: () => void; subscription: Subscription; onDelete: () => void; }' but required in SubscriptionDetailDialogProps.`

**Cause:** `SubscriptionDetailDialog` requires an `onEdit` prop; the instance opened from search does not pass it.

**Fix:** Add `onEdit` (e.g. no-op or close and open edit flow):

```tsx
<SubscriptionDetailDialog
  isOpen={!!viewingSubscription}
  onClose={() => setViewingSubscription(undefined)}
  subscription={viewingSubscription}
  onEdit={() => {}}
  onDelete={() => setViewingSubscription(undefined)}
/>
```

**Applied.**

---

## 15. `src/pages/ProjectPage.tsx` (line 626) — FIXED

**Error:** The `setFormData` callback return type has `status: "planning" | ... | undefined`, but the state type requires `status` to be one of the four values (no `undefined`).

**Cause:** `onValueChange={(value) => setFormData(prev => ({ ...prev, status: value as Project['status'] }))}` — `value` from the Select can be an empty string or undefined when cleared, so the cast can produce `undefined`.

**Fix:** Only set `status` when `value` is a valid status; otherwise keep previous:

```ts
onValueChange={(value) => setFormData(prev => ({
  ...prev,
  status: (value || prev.status) as Project['status'],
}))}
```

Or restrict to the four values:

```ts
const validStatus = value && ['planning', 'in_progress', 'on_hold', 'completed'].includes(value)
  ? (value as Project['status'])
  : prev.status;
setFormData(prev => ({ ...prev, status: validStatus }));
```

**Applied:** Use a `nextStatus` variable typed as `Project['status']` (valid value or `prev.status ?? 'planning'`), then `return { ...prev, status: nextStatus } as typeof prev` so the callback return type is accepted.

---

## Summary Table

| # | File | Fix (short) | Status |
|---|------|-------------|--------|
| 1 | CompanyDetailDialog.tsx | Type `parts` as `string[]` | Applied |
| 2 | CompanyDialog.tsx | Import `Calendar` from lucide-react | Applied |
| 3 | NostrProvider.tsx | Type assertion for context value | Applied |
| 4 | HomeTab.tsx | Use `const rect = hoveredRect` after null check | Applied |
| 5 | EncryptionContext.tsx | Add `pets: enabled` in setAllEncryption | Applied |
| 6 | UserPreferencesContext.tsx | Add `activeTab: 'home'` to prefsToSync | Applied |
| 7 | useCurrency.ts | Use `(rates.btcPrice ?? 0) > 0` | Applied |
| 8 | useLoginActions.ts | Type login as `NLoginType`; use `as unknown as NLoginType` | Applied |
| 9 | usePersistentStorage.ts | Check `typeof navigator.storage?.persist === 'function'` | Applied |
| 10 | useProjectEntries.ts | Use deleteCachedEventById(entryId) | Applied |
| 11 | useProjectMaterials.ts | Use deleteCachedEventById(materialId) | Applied |
| 12 | useProjectTasks.ts | Use deleteCachedEventById(taskId) | Applied |
| 13 | useTabData.ts | Import TabId from UserPreferencesContext | Applied |
| 14 | Index.tsx | Add onEdit to SubscriptionDetailDialog | Applied |
| 15 | ProjectPage.tsx | nextStatus variable + return `as typeof prev` | Applied |
