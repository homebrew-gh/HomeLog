# Relay rate limits (private relay)

## What was causing private relay rate limits

The app uses a single Nostr pool (`NPool`) for all relay traffic. The pool’s **reqRouter** decides which relays receive each **read** request (REQ).

Previously, the router sent **every** read to **every** relay with read enabled, including your private relay. So the private relay was getting:

- Every `useAuthor` (one REQ per author on the page)
- Every comments/zaps/logins/sync/preferences query
- DM batch loads and **live DM subscriptions** (`nostr.req()`)
- Every domain query (appliances, vehicles, maintenance, projects, etc.)
- Refetches after `invalidateQueries(['nostr'])` (e.g. visibility change, relay list change)

That duplicated all read traffic to the private relay and could hit its rate limit even when you use it mainly for CypherLog.

## Fix: private relay gets writes only for normal pool traffic

In **NostrProvider**, the pool’s **reqRouter** now **excludes private relays** from read routes. So:

- **Reads (REQ):** Only go to **public** relays (relays not in your “private relay” list).
- **Writes (EVENT):** Still go to **all** write relays (including private) via **eventRouter**.

The private relay therefore only receives:

1. **Writes** – events published by the app (dual publish: plaintext to private, encrypted to public).
2. **Explicit private reads** – only where the code uses `nostr.group(privateRelayUrls).query(...)` on purpose (e.g. backfill, pending-sync count, deletion sibling lookup). Those do not go through the pool’s reqRouter.

So normal browsing, DMs, sync, and all useQuery-based reads no longer hit the private relay; only publishes and a few targeted reads do.

## Visibility-based disconnect

The app also closes pool connections when the tab is **hidden** and reconnects when it becomes **visible** again. That reduces reconnect churn and request volume when the CypherLog PWA is in the background on mobile.

## Triggering a read from the private relay (on demand)

The app does **not** read from your private relay in the background. So your relay is only hit when:

1. **You publish** – writes go to the private relay.
2. **You run backfill** – syncs from public to private (writes to private).
3. **You click “Check”** in Relay Configuration – that runs one query to the private relay to see how many events are not yet synced (pending-sync count). Use **Check** / **Check again** only when you want that number; it is never fetched automatically.

To trigger a read from the private relay in code (e.g. a custom “Refresh from private” action), use a **relay group** and call `.query()` only when the user acts (button click, etc.):

```ts
const privateRelayUrls = (preferences.privateRelays ?? []).filter(isRelayUrlSecure);
const privateGroup = nostr.group(privateRelayUrls);
const events = await privateGroup.query([{ kinds: [...], authors: [user.pubkey], ... }], { signal });
// Then merge into your cache or UI as needed
```

Do **not** use the default `nostr` (pool) for reading from the private relay; the pool intentionally skips private relays for reads. Run private reads only on demand so the relay is not hit constantly when there is nothing new to pull.
