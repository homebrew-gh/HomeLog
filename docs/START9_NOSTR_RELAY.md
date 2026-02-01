# Using Start9 Nostr RS Relay with Cypher Log

Many people run [Nostr RS Relay](https://github.com/scsibug/nostr-rs-relay) on [Start9 StartOS](https://start9.com/) as a personal Nostr relay. Cypher Log works with this relay using the standard Nostr WebSocket protocol—no special code is required. You only need to add the relay URL and optionally mark it as private.

## What is Start9 Nostr RS Relay?

- **Nostr RS Relay** is a Rust-based Nostr relay that supports the full relay protocol and stores data in SQLite.
- **Start9** packages it for [StartOS](https://start9.com/) (Embassy) so you can install it as a service on your home server.
- It can run as a **private relay** (only whitelisted pubkeys can write) or a public relay. Private is the recommended default.

Official documentation: [Start9 Nostr RS Relay](https://docs.start9.com/service-guides/nostr/nostr-rs-relay.html)

## What Cypher Log Needs

**Nothing protocol-specific.** The relay speaks standard Nostr over WebSocket. You add its URL to Cypher Log like any other relay.

1. **Get your relay WebSocket URL** from the Nostr RS Relay service on StartOS:
   - Open your StartOS dashboard and go to the **Nostr RS Relay** service.
   - Complete initial config: add your **pubkey in hex** to the whitelist (required for private relay). You can convert npub → hex at [damus.io/key](https://damus.io/key).
   - After saving, the service shows a **Nostr relay websocket URL** in **Nostr Properties**.

2. **Add the URL in Cypher Log**:
   - Open **Settings** (hamburger menu) → **Configure** under Nostr Relays (or **Manage Relays** in the Relay Management dialog).
   - Click **Add Relay** and paste the WebSocket URL from StartOS.
   - Ensure **Read** and **Write** are enabled.

3. **Optional: Mark as private** (only for `wss://` URLs):
   - If you use the **LAN URL** (`wss://...local`), you can mark the relay as "Private" in the relay settings (gear icon). Data sent to private relays is stored in plaintext on that relay—appropriate for a relay you control.
   - **Note:** Cypher Log only allows marking relays as private when the URL uses **wss://** (secure WebSocket). If you use the Tor URL (`ws://...onion`), you cannot mark it private in the app; the relay will still work, but data will be sent encrypted (same as other public relays).

## URL Formats (StartOS)

- **LAN (local network):** `wss://<service>.local` or similar. Works when your device is on the same network as the server. You must [trust your StartOS Root CA](https://docs.start9.com/user-manual/trust-ca.html) in your browser/OS for TLS to succeed.
- **Tor (remote):** `ws://<address>.onion`. For access when not on your home network. Uses unencrypted WebSocket over Tor; Cypher Log will not allow marking this as "private" (wss:// required for that).

**Important (Tor URLs):** Browsers block `ws://` connections from pages loaded over **HTTPS** (mixed content). So if you use Cypher Log from the normal HTTPS site, a `ws://...onion` relay will not connect. Tor relay URLs work when you open Cypher Log from **HTTP** or an **.onion** mirror (e.g. in Tor Browser). For details, see [TOR_AND_RELAYS.md](TOR_AND_RELAYS.md).

## Troubleshooting

- **Connection fails (LAN):** Ensure you have [trusted the Root CA](https://docs.start9.com/user-manual/trust-ca.html) for your StartOS instance. Browsers reject self-signed certificates otherwise.
- **Whitelist:** For a private relay, your pubkey (hex) must be in the service whitelist or you cannot write. Get hex from [damus.io/key](https://damus.io/key) if your client only shows npub.
- **Windows .local:** On Windows, [Bonjour](https://docs.start9.com/user-manual/connecting-lan.html) may be required for .local hostnames to resolve.

## Summary

| Step | Where |
|------|--------|
| Install & configure Nostr RS Relay, add pubkey (hex) to whitelist | StartOS dashboard |
| Copy WebSocket URL from Nostr Properties | StartOS service page |
| Add relay URL in Cypher Log, enable Read/Write | Settings → Manage Relays |
| (Optional) Mark as Private (wss:// only) | Relay settings (gear) in Cypher Log |
| (LAN) Trust Root CA for .local TLS | [Start9 docs](https://docs.start9.com/user-manual/trust-ca.html) |

No application code changes are required for Cypher Log to interact with Start9 Nostr RS Relay; it is a standard Nostr relay.
