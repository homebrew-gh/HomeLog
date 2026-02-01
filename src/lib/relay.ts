/**
 * Relay URL security check for private relay marking.
 * Private relays receive plaintext data; only wss:// is allowed so traffic is encrypted in transit.
 */
export function isRelayUrlSecure(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'wss:';
  } catch {
    return false;
  }
}
