# Encryption & Privacy Analysis

*Last updated: January 30, 2026*

This document captures the findings from a comprehensive encryption and privacy analysis of Cypher Log.

## Current Encryption Status

### What IS Encrypted (NIP-44)

| Kind | Type | d-tag | Content |
|------|------|-------|---------|
| 32627 | Appliances | Random UUID ✓ | Encrypted ✓ |
| 32628 | Vehicles | Random UUID ✓ | Encrypted ✓ |
| 37004 | Subscriptions | Random UUID ✓ | Encrypted ✓ |
| 35043 | Warranties | Random UUID ✓ | Encrypted ✓ |
| 38033 | Pets | Random UUID ✓ | Encrypted ✓ |
| 7443 | Vet Visits | N/A (regular) | Encrypted ✓ |

### What is NOT Encrypted (GAP FOUND)

**Maintenance Events (kind 30229) and Completions (kind 9413)** store data in plaintext tags:

| Tag | Example Value | Privacy Impact |
|-----|---------------|----------------|
| `description` | "Change oil" | Reveals maintenance type |
| `frequency` | "3" | Reveals schedule |
| `frequency_unit` | "months" | Reveals schedule |
| `home_feature` | "HVAC System" | Reveals home features |
| `part_number` | "ABC123" | Reveals specific parts |
| `part` | "Oil Filter, XYZ789, $25" | Reveals parts AND costs |
| `mileage_interval` | "5000" | Reveals vehicle usage |
| `notes` | Freeform text | Could contain anything |

**Impact**: Relay operators can see what maintenance you perform, how often, what parts you buy, and your home features - even though your actual assets (vehicles, appliances) are encrypted.

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

### Immediate (High Priority)

1. **Add encryption to maintenance events** - Close the plaintext gap
   - Encrypt `description`, `part`, `notes` tags
   - Consider encrypting `home_feature`
   - Keep `d` tag and references as-is (already UUIDs)

### Future Considerations

1. **Selective gift wrapping** - Only for wealth-indicating kinds if needed
2. **Single "private data" kind** - Alternative to gift wrap that hides categories
3. **Timestamp fuzzing** - Round `created_at` to reduce timing analysis

## Summary

Cypher Log's current encryption is **mostly good** but has a **maintenance events gap**. The valuable assets (vehicles, appliances with VINs/prices) are properly encrypted with random UUID d-tags. However, maintenance descriptions and parts are plaintext, which could reveal information about what you own indirectly.

NIP-59 gift wrapping is **not recommended** due to complexity vs. benefit for the self-encryption use case. The priority should be encrypting maintenance events to close the existing gap.
