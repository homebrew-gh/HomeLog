import { useNostr } from '@nostrify/react';
import { NLogin, useNostrLogin } from '@nostrify/react/login';
import { NConnectSigner, NSecSigner, NRelay1 } from '@nostrify/nostrify';
import { nip19 } from 'nostr-tools';

// NOTE: This file should not be edited except for adding new login methods.

export function useLoginActions() {
  const { nostr } = useNostr();
  const { logins, addLogin, removeLogin } = useNostrLogin();

  return {
    // Login with a Nostr secret key
    nsec(nsec: string): void {
      const login = NLogin.fromNsec(nsec);
      addLogin(login);
    },
    // Login with a NIP-46 "bunker://" URI
    async bunker(uri: string): Promise<void> {
      const login = await NLogin.fromBunker(uri, nostr);
      addLogin(login);
    },
    // Login with a NIP-07 browser extension
    async extension(): Promise<void> {
      const login = await NLogin.fromExtension();
      addLogin(login);
    },
    // Login with NIP-46 NostrConnect (client-initiated connection)
    // The connection is already established - we just need to create the signer
    // and store the session for future use
    async nostrconnect(remotePubkey: string, userPubkey: string, clientNsec: string, relayUrl: string): Promise<void> {
      // Decode the client secret key
      const decoded = nip19.decode(clientNsec);
      if (decoded.type !== 'nsec') {
        throw new Error('Invalid client nsec');
      }
      const clientSecretKey = decoded.data;
      
      // Create a local signer with the client secret key
      const localSigner = new NSecSigner(clientSecretKey);
      
      // Create a relay connection for the signer
      const relay = new NRelay1(relayUrl);
      
      // Create the NConnectSigner with the already-established connection
      // The connection is already authenticated, so we don't need to send connect again
      const signer = new NConnectSigner({
        relay,
        pubkey: remotePubkey,
        signer: localSigner,
        encryption: 'nip44', // Use NIP-44 encryption (modern)
        timeout: 30000, // 30 second timeout for operations
      });
      
      // Create the login object
      // Store as bunker URI for persistence/reconnection
      const bunkerUri = `bunker://${remotePubkey}?relay=${encodeURIComponent(relayUrl)}&secret=${clientNsec}`;
      
      const login: NLogin = {
        id: crypto.randomUUID(),
        type: 'bunker',
        pubkey: userPubkey, // Use pubkey from the initial handshake
        bunkerUri,
        signer,
        createdAt: Date.now(),
      };
      
      addLogin(login);
    },
    // Log out the current user
    async logout(): Promise<void> {
      const login = logins[0];
      if (login) {
        removeLogin(login.id);
      }
    }
  };
}
