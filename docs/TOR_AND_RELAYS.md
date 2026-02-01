# Tor and Relay Connections

## Would adding Tor support help?

**Yes, for users who want to use a Start9 (or other) relay over Tor** (e.g. `ws://relay....onion`) when they’re not on the same LAN. Tor would let them reach their relay remotely without opening ports or using a VPN.

## Does Cypher Log need big code changes?

**No.** The app already accepts any valid WebSocket URL, including `ws://...onion`. You can add a Tor relay URL in Settings → Manage Relays today. The limitation is the **browser**, not the app.

## The real constraint: mixed content

Cypher Log is a **web app** served over **HTTPS** in production. Browsers enforce **mixed content** rules:

- A page loaded over **HTTPS** **cannot** open **insecure** WebSocket (`ws://`) connections.
- So from `https://cypherlog.example.com`, a connection to `ws://relay....onion` will be **blocked** by the browser before the app can use it.

So:

- **From HTTPS (normal production):**  
  - `wss://` relays work (e.g. LAN `wss://...local`, or any public `wss://` relay).  
  - `ws://` relays (including `ws://...onion`) are **blocked** by the browser. No code change in Cypher Log can override that.

- **From HTTP or an .onion page:**  
  - There is no “secure page → insecure WebSocket” mix, so the browser may allow `ws://`.  
  - So **Tor relay URLs (`ws://...onion`) can work** when:
    - The user opens Cypher Log from an **HTTP** origin (e.g. local dev, or an HTTP-only mirror), or  
    - The user opens Cypher Log from an **.onion** URL (often HTTP), e.g. in Tor Browser.

## What “Tor support” could mean (and what it would take)

| Approach | Advantage | Code / infra impact |
|----------|-----------|----------------------|
| **1. Document current behavior** | Users know they can add `ws://...onion` and when it will work. | Docs only (e.g. this file + Start9 doc). |
| **2. Offer an .onion or HTTP mirror** | Users in Tor Browser (or on HTTP) can use `ws://...onion` relays from that origin. | Hosting only; no app code change. |
| **3. Backend proxy (wss → Tor)** | App stays on HTTPS; a server accepts `wss://` and forwards to `ws://...onion` via Tor. | New backend service, Tor, ops; **large** change. |
| **4. Desktop app (e.g. Electron/Tauri) with Tor** | App could use system/bundled Tor and connect to `ws://...onion` from the desktop process. | New platform (desktop), Tor integration; **large** change. |

So:

- **No big codebase changes** are required for “Tor support” in the sense of **allowing** Tor relay URLs; they’re already allowed.
- **Making Tor relays actually usable from the main HTTPS site** would require either:
  - **Hosting** (HTTP or .onion mirror), or  
  - **Backend or desktop** work (proxy or desktop app with Tor), which are big changes.

## Recommendation

1. **Keep the app as-is** for relay URLs (already accept `ws://` and `.onion`).
2. **Document** in the Start9 guide and/or FAQ:
   - Tor relay URLs (`ws://...onion`) work when Cypher Log is loaded from **HTTP** or an **.onion** URL (e.g. in Tor Browser).
   - When Cypher Log is loaded from **HTTPS** (normal production), the browser blocks `ws://`; use LAN `wss://...local` or another `wss://` relay instead.
3. **Optionally** provide an **.onion or HTTP mirror** of the app so Tor users can use `ws://...onion` relays without any app code changes.

No change to the core codebase is required for Tor “support”; the main levers are documentation and, if desired, deployment (onion/HTTP mirror or a separate proxy/desktop app).
