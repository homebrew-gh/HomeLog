import { useCallback } from 'react';
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
    // The result should be the hex pubkey
    const pubkey = pubkeyResult.trim();
    
    // Validate it looks like a hex pubkey (64 hex characters)
    if (!/^[0-9a-f]{64}$/i.test(pubkey)) {
      throw new Error('Invalid public key received from signer');
    }

    // Store the pubkey for this session
    localStorage.setItem(AMBER_PUBKEY_KEY, pubkey);

    // Create a signer that uses the nostrsigner: protocol
    const signer = createAmberSigner(pubkey);

    // Create a login from the signer
    const login = NLogin.fromSigner(signer);
    
    // Add the login
    addLogin(login);
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

  return {
    isAvailable,
    initiateLogin,
    processLoginCallback,
    getStoredPubkey,
    clearStoredSession,
  };
}
