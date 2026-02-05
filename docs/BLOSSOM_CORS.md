# Blossom Server CORS for In-App Viewing

Cypher Log can show PDFs and images **inside the app** (including in the PWA) by fetching the file and displaying it via a blob URL. For that fetch to succeed, your Blossom server must send **CORS headers** so the browser allows the response.

## If you use [hzrd149/blossom-server](https://github.com/hzrd149/blossom-server)

This server **already enables CORS** by default in code:

- `Access-Control-Allow-Origin: *`
- `allowMethods: "*"`, `allowHeaders: "Authorization,*"`, etc.

No extra setting is required. If in-app viewing still fails:

1. **Reverse proxy** – If blossom-server is behind nginx, Caddy, or another proxy, the proxy may be stripping or overriding CORS headers. Ensure the proxy either passes through the `Access-Control-*` response headers from blossom-server or adds them itself (see below).
2. **HTTPS** – The app uses `credentials: 'omit'` and CORS; the Blossom URL should be `https://` when the app is on HTTPS.
3. **Update** – Make sure you’re on a recent version of blossom-server that includes the CORS middleware.

## If you use another Blossom implementation or a custom server

Your server must include CORS headers on **GET** responses for blob/file URLs. At minimum:

- **`Access-Control-Allow-Origin`** – Either `*` (allow any origin) or the exact origin where Cypher Log is served (e.g. `https://your-cypherlog-domain.com`).

Optional but useful:

- **`Access-Control-Allow-Methods: GET`** (for preflight)
- **`Access-Control-Expose-Headers`** – If you need to expose custom headers to the client (Cypher Log only needs the response body).

### Example: nginx in front of your Blossom server

Add to the `location` block that serves Blossom (or the blob path):

```nginx
add_header Access-Control-Allow-Origin * always;
add_header Access-Control-Allow-Methods "GET, OPTIONS" always;
add_header Access-Control-Allow-Headers "Authorization" always;

if ($request_method = OPTIONS) {
    return 204;
}
```

Use a specific origin instead of `*` if you prefer:

```nginx
add_header Access-Control-Allow-Origin "https://your-cypherlog-domain.com" always;
```

### Example: generic headers to add on any HTTP server

For **GET** (and **OPTIONS** if you handle preflight) responses that serve the file:

- `Access-Control-Allow-Origin: *`  
  or  
  `Access-Control-Allow-Origin: https://your-app-origin.com`

No other CORS headers are required for Cypher Log’s viewer (the app uses `credentials: 'omit'`).

## Why this is needed

When you open a PDF or image in the in-app viewer:

1. The app runs on one origin (e.g. `https://cypherlog.example.com`).
2. The file URL is on another origin (e.g. `https://blossom.example.com/abc123.pdf`).
3. The app uses `fetch(blossomUrl, { mode: 'cors', credentials: 'omit' })` to get the file and then displays it via a blob URL so it works in the PWA.
4. The browser only allows that cross-origin `fetch` if the Blossom response includes `Access-Control-Allow-Origin`. Without it, the fetch fails and the app falls back to “Open in browser” or “Download”.

Adding the header on your Blossom server (or ensuring your proxy doesn’t remove it) is the setting that enables in-app viewing.
