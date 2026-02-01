# Using Umbrel Nostr Relay with Cypher Log

Many people run the [official Nostr Relay app](https://apps.umbrel.com/app/nostr-relay) on [Umbrel](https://umbrel.com/) as a personal Nostr relay. Cypher Log works with this relay using the standard Nostr WebSocket protocol—no special code is required. You only need to add the relay URL and optionally mark it as private (when using `wss://`).

## What is Umbrel Nostr Relay?

- **Umbrel Nostr Relay** is the official Nostr Relay app for Umbrel, based on [nostr-rs-relay](https://github.com/scsibug/nostr-rs-relay).
- It runs on your Umbrel node and stores your Nostr data locally.
- It can be reached on your local network or via Tailscale (MagicDNS) for remote access.

Official documentation: [Umbrel Nostr Relay](https://apps.umbrel.com/app/nostr-relay)

## What Cypher Log Needs

**Nothing protocol-specific.** The relay speaks standard Nostr over WebSocket. You add its URL to Cypher Log like any other relay.

1. **Get your relay WebSocket URL** from the Nostr Relay app on Umbrel:
   - Open your Umbrel dashboard and go to the **Nostr Relay** app.
   - The app typically exposes the relay on **port 4848**. The WebSocket URL will be shown in the app (e.g. `ws://umbrel:4848` or `ws://umbrel.local:4848`).

2. **Add the URL in Cypher Log**:
   - Open **Settings** (hamburger menu) → **Configure** under Nostr Relays (or **Manage Relays** in the Relay Management dialog).
   - Click **Add Relay** and paste the WebSocket URL from Umbrel.
   - Ensure **Read** and **Write** are enabled.

3. **Optional: Mark as private** (only for `wss://` URLs):
   - Cypher Log only allows marking relays as private when the URL uses **wss://** (secure WebSocket). Umbrel’s default URLs are usually **ws://** (unencrypted), so you cannot mark them as private in the app unless you set up TLS (e.g. reverse proxy with HTTPS) and use a `wss://` URL.

## URL Formats (Umbrel)

- **Local network:** `ws://umbrel.local:4848` or `ws://<Umbrel-IP>:4848`. Works when your device is on the same network as your Umbrel node.
- **Tailscale (MagicDNS):** `ws://umbrel:4848` (or `ws://<umbrel-tailscale-name>:4848` if Umbrel has a different hostname). Works when both your device and Umbrel are on Tailscale.

**Important (ws:// and HTTPS):** Browsers block **ws://** connections from pages loaded over **HTTPS** (mixed content). So if you use Cypher Log from the normal HTTPS site, a **ws://** Umbrel relay will not connect. It works when you use Cypher Log from **HTTP** or **localhost** (e.g. local development). To use an Umbrel relay from the production HTTPS app, you would need to expose the relay over **wss://** (e.g. via a reverse proxy with TLS on your Umbrel or network).

## Troubleshooting

- **Connection fails from HTTPS site:** If Cypher Log is loaded over HTTPS, the browser will block `ws://` relays. Use the app from HTTP/localhost, or set up a `wss://` URL for your Umbrel relay.
- **Cannot mark as Private:** Private relays require `wss://`. Use a secure WebSocket URL (e.g. behind a TLS reverse proxy) if you want to mark the relay as private.
- **Tailscale hostname:** If Tailscale gives your Umbrel a name like `umbrel-1`, use `ws://umbrel-1:4848` (or the hostname shown in Tailscale).

## Summary

| Step | Where |
|------|--------|
| Install Nostr Relay app, note WebSocket URL (port 4848) | Umbrel dashboard |
| Add relay URL in Cypher Log, enable Read/Write | Settings → Manage Relays |
| (Optional) Mark as Private | Only possible with wss:// URL (e.g. via TLS reverse proxy) |

No application code changes are required in Cypher Log to connect to an Umbrel Nostr relay; it is a standard Nostr relay.
