/**
 * NIP-26 Delegated Event Signing
 * @see https://nips.nostr.com/26
 */

import { sha256 } from '@noble/hashes/sha256';
import { schnorr } from '@noble/curves/secp256k1';
import { bytesToHex } from '@noble/hashes/utils';

/** Build the delegation string that gets signed (without "nostr:" if you need the exact signed payload). */
export function buildDelegationString(delegateePubkeyHex: string, conditionsQuery: string): string {
  return `nostr:delegation:${delegateePubkeyHex}:${conditionsQuery}`;
}

/**
 * Build the conditions query string for NIP-26.
 * @param kinds - Event kinds the delegatee may sign (e.g. [1, 4])
 * @param createdAfter - Unix timestamp; delegatee may only sign events with created_at > this
 * @param createdBefore - Unix timestamp; delegatee may only sign events with created_at < this
 */
export function buildConditionsQuery(
  kinds: number[],
  createdAfter: number,
  createdBefore: number
): string {
  const parts: string[] = [];
  for (const k of kinds) {
    parts.push(`kind=${k}`);
  }
  parts.push(`created_at>${createdAfter}`);
  parts.push(`created_at<${createdBefore}`);
  return parts.join('&');
}

/**
 * Create the 64-byte hex delegation token by signing the SHA256 hash of the delegation string.
 * The delegator's secret key (from nsec) is required; we never store it.
 */
export function createDelegationToken(
  delegationString: string,
  delegatorSecretKeyBytes: Uint8Array
): string {
  const hash = sha256(new TextEncoder().encode(delegationString));
  const sig = schnorr.sign(hash, delegatorSecretKeyBytes);
  return bytesToHex(sig);
}

/**
 * Full delegation tag for use in events: [ "delegation", delegatorPubkey, conditionsQuery, token ]
 */
export function buildDelegationTag(
  delegatorPubkeyHex: string,
  conditionsQuery: string,
  tokenHex: string
): [string, string, string, string] {
  return ['delegation', delegatorPubkeyHex, conditionsQuery, tokenHex];
}

/** NIP-07 extension with optional signSchnorr (e.g. Alby). Not in the base NIP-07 spec. */
type NostrWithSchnorr = {
  getPublicKey(): Promise<string>;
  signSchnorr?(message: string): Promise<string | { sig: string }>;
};

/**
 * Try to create the delegation token using the browser extension (e.g. Alby) if it supports
 * signSchnorr. Only uses the extension when its pubkey matches the current user.
 * Returns the 64-byte hex token or null if not supported or mismatch.
 */
export async function trySignDelegationWithBrowserSigner(
  delegationString: string,
  currentUserPubkeyHex: string
): Promise<string | null> {
  try {
    const w = typeof globalThis !== 'undefined' ? (globalThis as { nostr?: NostrWithSchnorr }).nostr : undefined;
    if (!w?.signSchnorr || typeof w.signSchnorr !== 'function') return null;
    const extPubkey = await w.getPublicKey();
    if (typeof extPubkey !== 'string' || extPubkey !== currentUserPubkeyHex) return null;
    const result = await w.signSchnorr(delegationString);
    if (!result) return null;
    const sig = typeof result === 'string' ? result : (result as { sig: string }).sig;
    if (typeof sig !== 'string' || sig.length !== 128 || !/^[a-f0-9]+$/i.test(sig)) return null;
    return sig;
  } catch {
    return null;
  }
}
