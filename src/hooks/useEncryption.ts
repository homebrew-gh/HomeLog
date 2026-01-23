import { useCallback } from 'react';
import { useCurrentUser } from './useCurrentUser';
import { useEncryptionSettings, type EncryptableCategory } from '@/contexts/EncryptionContext';

/**
 * Marker prefix for encrypted content
 * Helps identify if content is NIP-44 encrypted vs plaintext
 */
const ENCRYPTED_MARKER = 'nip44:';

/**
 * Hook for encrypting and decrypting data using NIP-44
 * Encrypts data to self (user's own pubkey) for private storage
 */
export function useEncryption() {
  const { user } = useCurrentUser();
  const { isEncryptionEnabled } = useEncryptionSettings();

  /**
   * Check if the signer supports NIP-44 encryption
   */
  const hasNip44Support = useCallback((): boolean => {
    return !!user?.signer?.nip44;
  }, [user]);

  /**
   * Encrypt data to self using NIP-44
   * Returns the encrypted string with a marker prefix
   */
  const encryptToSelf = useCallback(async (plaintext: string): Promise<string> => {
    if (!user?.signer?.nip44) {
      console.warn('[Encryption] NIP-44 not available, storing plaintext');
      return plaintext;
    }

    try {
      // Encrypt to self (own pubkey)
      const encrypted = await user.signer.nip44.encrypt(user.pubkey, plaintext);
      return ENCRYPTED_MARKER + encrypted;
    } catch (error) {
      console.error('[Encryption] Failed to encrypt:', error);
      // Fall back to plaintext if encryption fails
      return plaintext;
    }
  }, [user]);

  /**
   * Decrypt data that was encrypted to self
   * Handles both encrypted and plaintext content gracefully
   */
  const decryptFromSelf = useCallback(async (content: string): Promise<string> => {
    // Check if content is encrypted
    if (!content.startsWith(ENCRYPTED_MARKER)) {
      // Content is plaintext, return as-is
      return content;
    }

    if (!user?.signer?.nip44) {
      console.warn('[Encryption] NIP-44 not available, cannot decrypt');
      throw new Error('NIP-44 decryption not available');
    }

    try {
      // Remove marker and decrypt
      const encryptedData = content.slice(ENCRYPTED_MARKER.length);
      const decrypted = await user.signer.nip44.decrypt(user.pubkey, encryptedData);
      return decrypted;
    } catch (error) {
      console.error('[Encryption] Failed to decrypt:', error);
      throw new Error('Failed to decrypt content');
    }
  }, [user]);

  /**
   * Encrypt a JSON object for storage
   */
  const encryptJson = useCallback(async <T>(data: T): Promise<string> => {
    const jsonString = JSON.stringify(data);
    return encryptToSelf(jsonString);
  }, [encryptToSelf]);

  /**
   * Decrypt and parse a JSON object
   */
  const decryptJson = useCallback(async <T>(content: string): Promise<T> => {
    const decrypted = await decryptFromSelf(content);
    return JSON.parse(decrypted) as T;
  }, [decryptFromSelf]);

  /**
   * Check if content appears to be encrypted
   */
  const isEncrypted = useCallback((content: string): boolean => {
    return content.startsWith(ENCRYPTED_MARKER);
  }, []);

  /**
   * Conditionally encrypt based on category settings
   */
  const encryptForCategory = useCallback(async <T>(
    category: EncryptableCategory,
    data: T
  ): Promise<string> => {
    if (isEncryptionEnabled(category) && hasNip44Support()) {
      return encryptJson(data);
    }
    // Return plaintext JSON if encryption is disabled or unavailable
    return JSON.stringify(data);
  }, [isEncryptionEnabled, hasNip44Support, encryptJson]);

  /**
   * Conditionally decrypt based on content format
   * Automatically handles both encrypted and plaintext content
   */
  const decryptForCategory = useCallback(async <T>(
    content: string
  ): Promise<T> => {
    if (isEncrypted(content)) {
      return decryptJson<T>(content);
    }
    // Parse plaintext JSON
    return JSON.parse(content) as T;
  }, [isEncrypted, decryptJson]);

  /**
   * Check if encryption should be used for a category
   */
  const shouldEncrypt = useCallback((category: EncryptableCategory): boolean => {
    return isEncryptionEnabled(category) && hasNip44Support();
  }, [isEncryptionEnabled, hasNip44Support]);

  return {
    hasNip44Support,
    encryptToSelf,
    decryptFromSelf,
    encryptJson,
    decryptJson,
    isEncrypted,
    encryptForCategory,
    decryptForCategory,
    shouldEncrypt,
  };
}
