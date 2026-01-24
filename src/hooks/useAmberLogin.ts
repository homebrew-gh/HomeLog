import { useCallback, useEffect } from 'react';
import { useNostrLogin } from '@nostrify/react/login';
import { NLogin } from '@nostrify/react/login';
import type { NostrSigner } from '@nostrify/nostrify';
import { 
  isAndroid, 
  openSignerForLogin,
  getCallbackUrl,
  buildSignEventUrl,
  buildNip44EncryptUrl,
  buildNip44DecryptUrl,
  storePendingRequest,
} from '@/lib/nip55';

/**
 * Storage key for the Amber signer pubkey
 */
const AMBER_PUBKEY_KEY = 'nostr_amber_pubkey';

/**
 * Storage keys for handling browser-to-PWA callback transfer
 */
const AMBER_CALLBACK_PUBKEY_KEY = 'amber_callback_pubkey';
const AMBER_CALLBACK_TIMESTAMP_KEY = 'amber_callback_timestamp';

/**
 * Create a NIP-55 Android signer that communicates via nostrsigner: URIs
 */
function createAmberSigner(pubkey: string): NostrSigner {
  return {
    getPublicKey: async () => pubkey,
    
    signEvent: async (event) => {
      // For signing, we need to redirect to the signer and wait for callback
      // This is handled differently in web - we can't block and wait
      // Instead, we store the event and redirect
      const eventJson = JSON.stringify({
        kind: event.kind,
        content: event.content,
        tags: event.tags,
        created_at: event.created_at,
      });
      
      const callbackUrl = getCallbackUrl();
      const signerUrl = buildSignEventUrl(eventJson, callbackUrl, pubkey);
      
      storePendingRequest('sign_event', { eventJson });
      
      // This will navigate away from the page
      window.location.href = signerUrl;
      
      // This won't actually return since we're navigating away
      // The signed event will be handled by the callback page
      throw new Error('Redirecting to signer app...');
    },
    
    nip44: {
      encrypt: async (recipientPubkey: string, plaintext: string) => {
        const callbackUrl = getCallbackUrl();
        const signerUrl = buildNip44EncryptUrl(plaintext, recipientPubkey, callbackUrl, pubkey);
        
        storePendingRequest('nip44_encrypt', { recipientPubkey, plaintext });
        
        window.location.href = signerUrl;
        throw new Error('Redirecting to signer app...');
      },
      
      decrypt: async (senderPubkey: string, ciphertext: string) => {
        const callbackUrl = getCallbackUrl();
        const signerUrl = buildNip44DecryptUrl(ciphertext, senderPubkey, callbackUrl, pubkey);
        
        storePendingRequest('nip44_decrypt', { senderPubkey, ciphertext });
        
        window.location.href = signerUrl;
        throw new Error('Redirecting to signer app...');
      },
    },
  };
}

/**
 * Hook for Amber (NIP-55) Android signer login
 */
export function useAmberLogin() {
  const { addLogin } = useNostrLogin();

  /**
   * Check if Amber login is available (Android device)
   */
  const isAvailable = useCallback(() => {
    return isAndroid();
  }, []);

  /**
   * Initiate login with Amber
   * This will redirect to the Amber app
   */
  const initiateLogin = useCallback(() => {
    openSignerForLogin();
  }, []);

  /**
   * Process the callback from Amber after get_public_key
   * The event parameter contains the pubkey
   */
  const processLoginCallback = useCallback(async (pubkeyResult: string) => {
    // The result might be URL-encoded, so decode it first
    let pubkey = pubkeyResult;
    
    try {
      pubkey = decodeURIComponent(pubkeyResult);
    } catch {
      // If decoding fails, use the original value
      pubkey = pubkeyResult;
    }
    
    // Trim whitespace
    pubkey = pubkey.trim();
    
    // Log for debugging
    console.log('[Amber] Received pubkey result:', pubkeyResult);
    console.log('[Amber] Decoded pubkey:', pubkey);
    
    // Validate it looks like a hex pubkey (64 hex characters)
    if (!/^[0-9a-f]{64}$/i.test(pubkey)) {
      console.error('[Amber] Invalid pubkey format. Expected 64 hex chars, got:', pubkey);
      throw new Error(`Invalid public key received from signer. Got: "${pubkey.substring(0, 20)}..."`);
    }

    // Store the pubkey for this session (use localStorage for persistence)
    localStorage.setItem(AMBER_PUBKEY_KEY, pubkey);

    // Create a signer that uses the nostrsigner: protocol
    const signer = createAmberSigner(pubkey);

    // Create a login from the signer
    const login = NLogin.fromSigner(signer);
    
    // Add the login
    addLogin(login);
    
    console.log('[Amber] Login successful for pubkey:', pubkey);
  }, [addLogin]);

  /**
   * Check if there's a stored Amber session
   */
  const getStoredPubkey = useCallback(() => {
    return localStorage.getItem(AMBER_PUBKEY_KEY);
  }, []);

  /**
   * Clear the stored Amber session
   */
  const clearStoredSession = useCallback(() => {
    localStorage.removeItem(AMBER_PUBKEY_KEY);
  }, []);

  /**
   * Check for pending callback from browser redirect
   * This handles the case where Amber returns to the browser instead of the PWA
   */
  const checkPendingCallback = useCallback(async () => {
    const pendingPubkey = localStorage.getItem(AMBER_CALLBACK_PUBKEY_KEY);
    const pendingTimestamp = localStorage.getItem(AMBER_CALLBACK_TIMESTAMP_KEY);
    
    if (!pendingPubkey || !pendingTimestamp) {
      return false;
    }
    
    // Check if the callback is still valid (within 5 minutes)
    const timestamp = parseInt(pendingTimestamp, 10);
    if (Date.now() - timestamp > 5 * 60 * 1000) {
      // Expired, clean up
      localStorage.removeItem(AMBER_CALLBACK_PUBKEY_KEY);
      localStorage.removeItem(AMBER_CALLBACK_TIMESTAMP_KEY);
      return false;
    }
    
    // Clean up immediately to prevent double-processing
    localStorage.removeItem(AMBER_CALLBACK_PUBKEY_KEY);
    localStorage.removeItem(AMBER_CALLBACK_TIMESTAMP_KEY);
    
    console.log('[Amber] Found pending callback pubkey from browser redirect:', pendingPubkey);
    
    try {
      await processLoginCallback(pendingPubkey);
      return true;
    } catch (error) {
      console.error('[Amber] Failed to process pending callback:', error);
      return false;
    }
  }, [processLoginCallback]);

  // Auto-check for pending callbacks when the hook is used
  useEffect(() => {
    checkPendingCallback();
  }, [checkPendingCallback]);

  return {
    isAvailable,
    initiateLogin,
    processLoginCallback,
    getStoredPubkey,
    clearStoredSession,
    checkPendingCallback,
  };
}
