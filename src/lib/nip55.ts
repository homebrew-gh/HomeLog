/**
 * NIP-55: Android Signer Application support
 * 
 * This module provides utilities for communicating with Android signer apps
 * like Amber via the nostrsigner: URI scheme.
 */

/**
 * Check if the current device is running Android
 */
export function isAndroid(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /android/i.test(navigator.userAgent);
}

/**
 * Generate a callback URL for the current page
 * The signer will redirect back to this URL with the result
 */
export function getCallbackUrl(path: string = '/signer-callback'): string {
  const baseUrl = window.location.origin;
  return `${baseUrl}${path}`;
}

/**
 * Build a nostrsigner: URL for getting the public key
 * This initiates the login flow with an Android signer
 */
export function buildGetPublicKeyUrl(callbackUrl: string): string {
  const params = new URLSearchParams({
    compressionType: 'none',
    returnType: 'signature',
    type: 'get_public_key',
    callbackUrl: callbackUrl + '?event=',
  });
  
  return `nostrsigner:?${params.toString()}`;
}

/**
 * Build a nostrsigner: URL for signing an event
 */
export function buildSignEventUrl(
  eventJson: string,
  callbackUrl: string,
  currentUserPubkey?: string
): string {
  const encodedEvent = encodeURIComponent(eventJson);
  const params = new URLSearchParams({
    compressionType: 'gzip',
    returnType: 'event',
    type: 'sign_event',
    callbackUrl: callbackUrl + '?event=',
  });
  
  if (currentUserPubkey) {
    params.set('current_user', currentUserPubkey);
  }
  
  return `nostrsigner:${encodedEvent}?${params.toString()}`;
}

/**
 * Build a nostrsigner: URL for NIP-44 encryption
 */
export function buildNip44EncryptUrl(
  plaintext: string,
  recipientPubkey: string,
  callbackUrl: string,
  currentUserPubkey?: string
): string {
  const encodedText = encodeURIComponent(plaintext);
  const params = new URLSearchParams({
    pubkey: recipientPubkey,
    compressionType: 'none',
    returnType: 'signature',
    type: 'nip44_encrypt',
    callbackUrl: callbackUrl + '?event=',
  });
  
  if (currentUserPubkey) {
    params.set('current_user', currentUserPubkey);
  }
  
  return `nostrsigner:${encodedText}?${params.toString()}`;
}

/**
 * Build a nostrsigner: URL for NIP-44 decryption
 */
export function buildNip44DecryptUrl(
  ciphertext: string,
  senderPubkey: string,
  callbackUrl: string,
  currentUserPubkey?: string
): string {
  const encodedText = encodeURIComponent(ciphertext);
  const params = new URLSearchParams({
    pubkey: senderPubkey,
    compressionType: 'none',
    returnType: 'signature',
    type: 'nip44_decrypt',
    callbackUrl: callbackUrl + '?event=',
  });
  
  if (currentUserPubkey) {
    params.set('current_user', currentUserPubkey);
  }
  
  return `nostrsigner:${encodedText}?${params.toString()}`;
}

/**
 * Parse the result from an Android signer callback
 * Returns the event parameter from the URL
 */
export function parseSignerCallback(url: string): string | null {
  try {
    const urlObj = new URL(url);
    return urlObj.searchParams.get('event');
  } catch {
    return null;
  }
}

/**
 * Decode a gzip-compressed result from the signer
 * Format: "Signer1" + Base64(gzip(json))
 */
export async function decodeGzipResult(result: string): Promise<string> {
  if (!result.startsWith('Signer1')) {
    // Not compressed, return as-is
    return result;
  }
  
  const base64Data = result.slice(7); // Remove "Signer1" prefix
  const binaryString = atob(base64Data);
  const bytes = new Uint8Array(binaryString.length);
  
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  
  // Decompress using the Compression Streams API
  const ds = new DecompressionStream('gzip');
  const decompressedStream = new Response(
    new Blob([bytes]).stream().pipeThrough(ds)
  ).text();
  
  return decompressedStream;
}

/**
 * Storage key for pending signer requests
 */
const PENDING_SIGNER_REQUEST_KEY = 'nostr_pending_signer_request';

/**
 * Store a pending signer request before redirecting
 */
export function storePendingRequest(requestType: string, data?: Record<string, string>): void {
  const request = {
    type: requestType,
    timestamp: Date.now(),
    returnPath: window.location.pathname + window.location.search,
    ...data,
  };
  sessionStorage.setItem(PENDING_SIGNER_REQUEST_KEY, JSON.stringify(request));
}

/**
 * Get and clear the pending signer request
 */
export function getPendingRequest(): { type: string; timestamp: number; returnPath: string; [key: string]: unknown } | null {
  const stored = sessionStorage.getItem(PENDING_SIGNER_REQUEST_KEY);
  if (!stored) return null;
  
  sessionStorage.removeItem(PENDING_SIGNER_REQUEST_KEY);
  
  try {
    const request = JSON.parse(stored);
    // Expire requests older than 5 minutes
    if (Date.now() - request.timestamp > 5 * 60 * 1000) {
      return null;
    }
    return request;
  } catch {
    return null;
  }
}

/**
 * Open the Android signer for login (get_public_key)
 */
export function openSignerForLogin(): void {
  const callbackUrl = getCallbackUrl();
  const signerUrl = buildGetPublicKeyUrl(callbackUrl);
  
  storePendingRequest('get_public_key');
  
  // Navigate to the signer
  window.location.href = signerUrl;
}
