# Encryption & Privacy Analysis

*Last updated: January 30, 2026*

This document captures the findings from a comprehensive encryption and privacy analysis of Cypher Log.

## Current Encryption Status

**App default:** Cypher Log encrypts all data categories by default (appliances, vehicles, maintenance, subscriptions, warranties, companies/service providers, projects, and pets). Users can turn encryption off per category in Settings if desired.

### What IS Encrypted (NIP-44)

| Kind | Type | d-tag | Content |
|------|------|-------|---------|
| 32627 | Appliances | Random UUID ✓ | Encrypted ✓ |
| 32628 | Vehicles | Random UUID ✓ | Encrypted ✓ |
| 37004 | Subscriptions | Random UUID ✓ | Encrypted ✓ |
| 35043 | Warranties | Random UUID ✓ | Encrypted ✓ |
| 38033 | Pets | Random UUID ✓ | Encrypted ✓ |
| 7443 | Vet Visits | N/A (regular) | Encrypted ✓ |

### Maintenance Events (kind 30229) and Completions (kind 9413) – Encryption Supported

When the maintenance category has **encryption enabled** in Settings, sensitive data for both kinds is stored in the `content` field as NIP-44 encrypted JSON. Only structural tags remain in plaintext (`d`, `a`, `alt` with UUIDs), so relay operators cannot infer what you maintain, how often, or what parts you use.

- **Kind 30229 (schedules):** Encrypted content includes `description`, `frequency`, `frequency_unit`, `home_feature`, `part_number`, `parts`, `mileage_interval`, `interval_type`, `isLogOnly`, `isArchived`.
- **Kind 9413 (completions):** Encrypted content includes `completedDate`, `mileageAtCompletion`, `notes`, `parts`.

Legacy events that used plaintext tags are still read. New events use encrypted content when encryption is on for the maintenance category (default: on).

## Metadata Exposure

Even with encryption, relay operators can see:

1. **Your pubkey** - identifies you as a Cypher Log user
2. **Event kinds** - category counts (N appliances, M vehicles, etc.)
3. **Timestamps** - when you add/update items
4. **Activity patterns** - correlate updates with life events
5. **d-tags** - but these are random UUIDs, so they reveal nothing

### What Metadata Does NOT Reveal

- Item names, descriptions, prices
- Serial numbers, VINs, license plates
- Any actual content (encrypted)
- Relationships between items (UUIDs are opaque)

## IP Address Exposure

Your IP address is visible to:

- **Nostr relays** - every relay you connect to
- **Blossom/media servers** - when uploading/viewing files
- **Remote signers** - if using NIP-46 (nsec.app, etc.)
- **Hosting provider** - if using hosted version

This is inherent to how Nostr works. Mitigations:
- Use a VPN
- Use Tor (some relays may block)
- Self-host relays
- Use trusted private relays

*Documentation added to FAQ and Privacy Policy.*

## NIP-59 (Gift Wrap) Analysis

### What Gift Wrap Would Add

- Hide event kinds (all become kind 1059)
- Hide category counts
- Hide that you use Cypher Log specifically
- Provide deniability (unsigned inner event)

### Why It's Not Recommended for Cypher Log

1. **Massive refactor** - estimated 1,500-2,500 lines across 8-12 files
2. **Breaks addressable events** - lose auto-replace behavior for updates
3. **Query complexity** - can't filter by kind at relay level
4. **Performance overhead** - 2x encryption/decryption operations
5. **Limited benefit** - for self-encryption, NIP-44 is sufficient
6. **p-tag still visible** - observers still know events go to your pubkey

### When Gift Wrap Would Make Sense

- Multi-user sharing features (sending data to other pubkeys)
- High-risk users with surveillance concerns
- If hiding "uses a home inventory app" matters

## Recommendations

### Implemented

1. **Maintenance event encryption (kind 30229 and 9413)** – When encryption is enabled for the maintenance category, sensitive data is stored in encrypted content; only `d`, `a`, and `alt` tags remain in plaintext. See NIP.md for the encrypted content schema.

### Future Considerations

1. **Selective gift wrapping** - Only for wealth-indicating kinds if needed
2. **Single "private data" kind** - Alternative to gift wrap that hides categories
3. **Timestamp fuzzing** - Round `created_at` to reduce timing analysis

## Summary

Cypher Log defaults to **encryption on for all categories** (including companies and projects). The valuable assets (vehicles, appliances with VINs/prices, companies, projects, etc.) are encrypted with random UUID d-tags when encryption is enabled. **Maintenance events (kind 30229) and completions (kind 9413)** now support encryption: when the maintenance category has encryption enabled, sensitive fields are stored in NIP-44 encrypted content and only structural tags (d, a, alt) remain in plaintext, closing the previous data-leak gap.

NIP-59 gift wrapping is **not recommended** due to complexity vs. benefit for the self-encryption use case.
