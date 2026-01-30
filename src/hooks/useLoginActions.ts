import { useNostr } from '@nostrify/react';
import { NLogin, useNostrLogin } from '@nostrify/react/login';

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
    // After establishing a nostrconnect:// session, we convert it to a bunker:// URI
    // for persistent storage. The bunker URI contains:
    // - The remote signer's pubkey (for reconnection)
    // - The relay URL (for communication)
    // - The client's secret key as the "secret" (for authentication)
    async nostrconnect(remotePubkey: string, clientNsec: string, relayUrl: string): Promise<void> {
      // Construct a bunker:// URI from the established NostrConnect session
      // This allows us to reuse the existing bunker login infrastructure
      const bunkerUri = `bunker://${remotePubkey}?relay=${encodeURIComponent(relayUrl)}&secret=${clientNsec}`;
      
      // Use the bunker login flow with the constructed URI
      const login = await NLogin.fromBunker(bunkerUri, nostr);
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
