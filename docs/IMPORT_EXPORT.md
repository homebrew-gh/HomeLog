# Import/Export

This document describes the **Import/Export** feature: exporting all Cypher Log data to a file (for offline backup, device migration, or disaster recovery) and importing from that file. Encryption is **optional**—the user may choose to protect the export with a password or export plain JSON.

---

## Goals

- **Export:** Produce a single file containing all Cypher Log events for the current user, in a stable, versioned format. User may optionally encrypt the file with a password.
- **Import:** Restore from an export file (decrypt with password if encrypted), re-sign events with the current user’s signer, and publish to relays. Supports key rotation (export with old key, restore with new key when encryption is used).
- **Extensibility:** The export format is designed so new data categories or schema changes can be added without breaking older importers.

---

## Data structure plan

The export format is a JSON-compatible structure that supports versioning and future expansion. Implementations should ignore unknown top-level keys and unknown categories so that new versions remain readable by older clients (with reduced data) and old exports remain readable by newer clients.

### Top-level schema

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `formatVersion` | number | Yes | Export format version. Current: `1`. Increment when the top-level shape or semantics change in a breaking way. |
| `cypherLogExport` | true | Yes | Identifies this file as a Cypher Log export. Enables quick detection and validation. |
| `exportedAt` | string (ISO 8601) | Yes | When the export was created (e.g. `2026-01-31T12:00:00.000Z`). |
| `schemaVersion` | number | Yes | Schema version of the `data` payload. Current: `1`. Increment when adding or changing categories or item shape. |
| `data` | object | Yes | Keyed by category name (see below). Each value is an array of logical events for that category. |
| `encrypted` | boolean | No | If `true`, the entire export (or a specific payload field) is encrypted; see "Optional encryption" below. Default: `false`. |
| `meta` | object | No | Reserved for future use (e.g. app version, optional checksums). Readers ignore unknown keys. |

### Category names and kinds

Categories in `data` map to Cypher Log data types. Use stable string keys so new categories can be added without breaking old importers (they ignore unknown keys).

| Category key | Nostr kind(s) | Description |
|--------------|---------------|-------------|
| `appliances` | 32627 | Appliances |
| `vehicles` | 32628 | Vehicles |
| `maintenance` | 30229 | Maintenance records |
| `companies` | 37003 | Companies / service providers |
| `subscriptions` | 37004 | Subscriptions |
| `warranties` | 35043 | Warranties |
| `maintenanceCompletions` | 9413 | Maintenance completions |
| `pets` | 38033 | Pets |
| `projects` | 35389 | Projects |
| `projectEntries` | 1661 | Project entries |
| `projectTasks` | 4209 | Project tasks |
| `projectMaterials` | 8347 | Project materials |
| `vetVisits` | 7443 | Vet visits |
| `deletions` | 5 | Deletion events (optional; for restore consistency) |

Future categories (e.g. new entity types) should be added with new keys; existing readers skip unknown categories.

### Logical event shape (per item in a category array)

Each item in a category array is a **logical event**—portable, without Nostr event id or signature so that import can re-sign with the current key.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `kind` | number | Yes | Nostr event kind. |
| `tags` | string[][] | Yes | Nostr tags (e.g. `d`, `a`). |
| `created_at` | number | Yes | Unix timestamp. |
| `content` | string | Yes | Plaintext content (decrypted at export time if source was NIP-44). |

No `id` or `sig`; these are generated on import when re-signing.

### Example (unencrypted, minimal)

```json
{
  "formatVersion": 1,
  "cypherLogExport": true,
  "exportedAt": "2026-01-31T12:00:00.000Z",
  "schemaVersion": 1,
  "data": {
    "appliances": [
      { "kind": 32627, "tags": [["d", "abc123"]], "created_at": 1706700000, "content": "{\"name\":\"Fridge\",...}" }
    ],
    "vehicles": [],
    "maintenance": []
  }
}
```

### Forward and backward compatibility

- **New optional top-level keys:** Future versions may add keys (e.g. `meta.appVersion`, `meta.checksum`). Old importers ignore them.
- **New categories:** New keys under `data` (e.g. `newEntityType`) are ignored by old importers; new importers can read them.
- **New optional fields on logical events:** If future schema adds optional fields (e.g. `sourceRelay`), old importers ignore them; new importers can use defaults when missing.
- **Breaking changes:** If the meaning of an existing field or category changes in a breaking way, increment `formatVersion` or `schemaVersion` and document the migration. Readers can refuse to import formats they do not support (e.g. `formatVersion` greater than supported).

---

## Optional encryption

- **Unencrypted export:** The file is plain JSON (or pretty-printed for readability). Suitable for local backup where the user relies on filesystem/disk security. UI should warn that the file contains plaintext data.
- **Encrypted export:** User opts in and sets a password. The serialized export (e.g. the whole JSON string or the `data` + critical metadata) is encrypted with a key derived from the password (e.g. PBKDF2 or scrypt + AES-GCM). The file format can be: (a) a small JSON wrapper with `encrypted: true`, algorithm, salt/iv, and a base64 ciphertext blob, or (b) a binary format with a header. Decryption and decryption happen in the client only; password never leaves the device.
- **Import:** If the file is encrypted, user must enter the password to decrypt before import. If unencrypted, import parses JSON directly.

Encryption protects the backup if the Nostr private key is later compromised (the file is protected by a different secret). It also allows key rotation: export with old key (decrypt NIP-44 at export time), store encrypted file; later restore with new key (re-sign on import using only the password).

---

## Export flow

1. **Data source:** Fetch all Cypher Log events for the current user (same kinds as in `useDataSyncStatus` and the backfill doc) from relays and cache. Optionally include kind 5 (deletions).
2. **Decrypt:** For each event, if content is NIP-44 encrypted, decrypt with the current signer. Build logical events `{ kind, tags, created_at, content }` (plaintext content).
3. **Group by category:** Place each logical event into the appropriate `data` category array (e.g. appliances, vehicles).
4. **Build export object:** Add `formatVersion`, `cypherLogExport`, `exportedAt`, `schemaVersion`, `data`, and optionally `encrypted: false` and `meta`.
5. **Optional encryption:** If user chose encryption, derive key from password (KDF), encrypt the serialized export (or the `data` payload), and produce the encrypted file format (wrapper + ciphertext). Otherwise, output JSON (e.g. download as `.cypherlog.json` or `.cypherlog.export`).
6. **Download:** Trigger file download. Filename may include date (e.g. `cypherlog-export-2026-01-31.json`).

---

## Import flow

1. **Load file:** User selects the export file.
2. **Detect format:** If the file is encrypted (e.g. wrapper with `encrypted: true` or magic bytes), prompt for password and decrypt. Otherwise, parse as JSON.
3. **Validate:** Check `cypherLogExport === true` and supported `formatVersion` / `schemaVersion`. Reject or warn if unsupported.
4. **Re-sign and publish:** For each category in `data` that the importer supports, for each logical event, build `{ kind, tags, created_at, content }`, sign with the **current** user’s signer (`signEvent`), and publish to the user’s relays (or let user choose: all relays vs private relay only). Optionally batch and rate-limit.
5. **Conflicts:** Replaceable/addressable events with the same logical key may already exist on relays. Options: always re-publish (relays replace by logical key), or ask user "Overwrite existing data?". Skip unknown categories.
6. **Progress:** Show progress or toast for large imports.

---

## Security (when encryption is chosen)

- **Password:** Never sent to a server; key derivation and encrypt/decrypt in the client (Web Crypto API or audited library). Encourage a strong password; optional strength meter.
- **Backup file:** Contains plaintext content (or ciphertext) protected only by the password. User must guard the file and the password. If both are compromised, data is readable. If only the Nostr key is compromised, the encrypted file remains protected and can be restored later with the password (and a new key if desired).
- **Key rotation:** Export decrypts NIP-44 with the current key and stores plaintext in a password-encrypted file; import re-signs with the current key. So: export with old key, later restore with new key using only the backup file and password.

---

## Placement in the app

Import/Export is exposed under **Privacy & Security** in the hamburger menu (e.g. "Import/Export" or "Backup & restore"). The UI can offer:

- **Export:** Button "Export data" with an option to "Encrypt with password" (checkbox or secondary step). If encryption is chosen, prompt for password and confirm; then run export and download.
- **Import:** Button "Import from file" → file picker → if encrypted, prompt for password → validate and show summary (e.g. "N categories, M events") → "Restore to relays" with optional "Restore to private relay only".

This keeps backup and restore clearly visible under Privacy & Security alongside Browser Storage and Private relay backup (sync to private relay), without overloading the menu.
