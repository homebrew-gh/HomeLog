# Multi-Property Organization – Future Implementation Plan

This document outlines how to extend Cypher Log from **single-property mode** (current) to **multi-property support** so users can track multiple homes (e.g. primary residence, rental, vacation property) without confusing the existing UI.

## Current State (Single-Property)

- **Property** events use kind **30100** (addressable: `kind:pubkey:d-tag`).
- The app uses one property: the event with `d` = `"default"` or the first property returned.
- **PropertyProfileCard** on the Home tab shows this single property; Edit creates/updates the `"default"` property.
- No other data types (appliances, maintenance, projects, etc.) are currently scoped to a property; they are global to the user.

## Goals for Multi-Property

1. **Property selector** – User can switch “current property” (e.g. dropdown in header or Home tab).
2. **Scoped data** – Key data can be associated with a property so that switching property filters what you see.
3. **Backward compatible** – Existing single-property users keep one property (`d` = `"default"`); no migration required.
4. **Clear UX** – Avoid “which home is this?” confusion in every tab.

## Design Options

### Option A: Property as filter (recommended direction)

- **Properties** remain addressable events (kind 30100) with unique `d` tags (e.g. `default`, UUID for additional properties).
- **Global property selector** (e.g. in header or Home tab): “Primary Home”, “Rental on Oak St”, etc. Stored in **user preferences** (e.g. `activePropertyId` in NIP-78 or local storage).
- **Data that could be scoped to a property:**
  - **Appliances / My Stuff** – Add optional `propertyId` (or `a` tag pointing to property). Filter by active property when selector is set; “All properties” shows everything.
  - **Maintenance** – Already tied to appliances/vehicles; could derive property from appliance’s property, or add property to maintenance.
  - **Projects** – Add optional `propertyId`; project list and dashboard widgets filter by active property.
  - **Warranties / Subscriptions / Companies** – Can stay global or get optional property link later.
- **Property-agnostic data** (unchanged): Vehicles, Pets, Companies, Subscriptions (unless we later add “property” as optional link).

### Option B: Property as “workspace”

- User picks a property; the entire app context (tabs, data) is for that property only.
- Requires either separate event kinds per property (fragmented) or **all** relevant events to reference a property (large schema change and migration).
- Heavier and more disruptive; not recommended as first step.

### Option C: Property only for display (minimal)

- Multiple properties supported in **Property Profile** (list/add/edit); no scoping of other data.
- “Current property” only affects what appears in the Property Profile card (and maybe a few labels). All other data remains global.
- Easiest to implement but does not reduce confusion for “which home does this appliance belong to?”

## Recommended Phased Approach

### Phase 1 (current)

- Single property with `d` = `"default"`.
- Property Profile card on Home tab; no property selector.

### Phase 2: Multi-property data model, single-property UX

- Allow creating additional properties (new events with `d` = UUID or slug).
- **Property selector** on Home tab (or header): dropdown “Primary Home | Rental | All”.
- **Preference**: `activePropertyId` (nullable = “all”) stored in app preferences (NIP-78) or local storage.
- **PropertyProfileCard**: show the **selected** property (or “Add property” if none); editing creates/updates the selected or new property.
- **No scoping of other data yet** – appliances, projects, etc. still global. This gets the selector and multi-property CRUD in place without breaking anything.

### Phase 3: Optional property link on key types

- **Appliances (My Stuff)**: add optional tag or field `property_id` (or `a` tag `30100:pubkey:propertyId`). If present, list/filter by active property when “All” is not selected.
- **Projects**: add optional `propertyId`; project list and dashboard widgets filter by active property when set.
- **Maintenance**: property can be inferred from linked appliance (or vehicle stays global) so maintenance list can be filtered by property when useful.
- Backfill: existing events have no property link = “global” or “unspecified”; they show when “All properties” is selected.

### Phase 4: Deeper scoping (optional)

- Warranties, subscriptions, companies: optional property link for “show only for this property”.
- Reports or exports filtered by property.
- Per-property dashboards (e.g. “Maintenance due at Primary Home”).

## Data Model Notes

- **Property event** (kind 30100): already has `id` (= `d` tag). No schema change.
- **Linking other events to a property:**
  - **Option 1 – Tag**: e.g. `["property", "<property-d-tag>"]` on the event (simple, queryable by relay if relays index custom tags).
  - **Option 2 – NIP-33 `a` tag**: `["a", "30100:pubkey:propertyId", "", "property"]` (consistent with other references; good for replaceable/addressable semantics).
- **Encryption**: Property payload is already encrypted under “projects” category. Linking from other kinds (e.g. appliance) can be plain tag `property` or `a` so relays can filter; content stays encrypted per existing design.

## UI / UX Notes

- **Where to put the property selector**
  - **Home tab only**: Above or inside Property Profile card (“Viewing: [Primary Home ▼]”). Low impact; other tabs stay global until Phase 3.
  - **Global header**: Visible on every tab; makes “current property” always clear. Slightly more prominent change.
- **“All properties”** option in selector so users can still see everything (e.g. for maintenance across all homes).
- **Adding a property**: From Property Profile card, e.g. “Add another property” → create new event with new `d` (UUID), then set as active in selector.
- **Deleting a property**: Only if no linked data (or prompt “unlink or delete linked items”). Prefer soft-delete or “archive” for safety.

## Implementation Checklist (when implementing Phase 2+)

- [ ] Add `activePropertyId: string | null` to user preferences (NIP-78 or local).
- [ ] Property selector component (dropdown) using `useProperties()` and preference.
- [ ] PropertyProfileCard: use `activePropertyId` to show/edit selected property; support “Add property” with new `d`.
- [ ] (Phase 3) Add `property` tag or `a` tag to appliance/project events; update create/edit flows.
- [ ] (Phase 3) Filter appliances and projects by `activePropertyId` when not “all”.
- [ ] (Phase 3) Maintenance: filter by property via linked appliance or explicit property link.
- [ ] Backfill: existing events without property = show when “All” selected; optional “Assign to property” flow later.

## Summary

- **Now**: Single property (`d` = `"default"`), Property Profile on Home tab, no selector.
- **Next (Phase 2)**: Multiple properties, property selector, no scoping of other data.
- **Later (Phase 3)**: Optional property link on appliances and projects; filter lists by active property.
- **Optional (Phase 4)**: More types linked to property; per-property views and exports.

This keeps the current app simple while leaving a clear path to multi-property without breaking existing behavior.
