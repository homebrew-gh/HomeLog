# NIP-42 Relay Authentication

Cypher Log supports **NIP-42** (Relay Authentication) so you can use relays that require authentication for read and/or write.

## How it works

When a relay sends an `AUTH` challenge, the client responds with a signed **kind 22242** event containing the relay URL and challenge. The relay uses this to allow or deny access (e.g. for whitelisted pubkeys or paid access).

- **Implementation**: `NostrProvider` passes an `auth` callback into each relay connection (`NRelay1` from nostrify). The callback uses the **currently logged-in user’s signer** to create and sign the NIP-42 auth event.
- **Login required**: NIP-42 auth is only sent when a user is logged in. If no one is logged in, the client does not send an AUTH response; relays that require auth will not grant access until the user logs in (and may need a refresh or new connection to trigger AUTH again).

## Using a closed/whitelisted relay

If your relay is configured with a whitelist and optional read restriction, for example:

```ini
[authorization]
whitelist_pubkeys = ["<hex-pubkey-1>", "<hex-pubkey-2>"]
auth_required = true
```

- **Write**: Only whitelisted pubkeys can publish. The client will sign NIP-42 AUTH with the logged-in user’s key; if that pubkey is in `whitelist_pubkeys`, writes will succeed.
- **Read**: If `auth_required = true`, the relay only allows reads after successful NIP-42 auth. Cypher Log will authenticate when connected and logged in, so reads will work for whitelisted users.

**Steps:**

1. Add the relay URL to your relay list in Cypher Log (read and/or write as desired).
2. Log in with an account whose **hex pubkey** is in the relay’s `whitelist_pubkeys`.
3. Use the app as usual; the client will respond to AUTH and the relay will allow read/write for that user.

If you add or switch to an auth-required relay after already having connections open, you may need to refresh the app so new connections are established and NIP-42 auth is sent.
