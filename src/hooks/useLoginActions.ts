import { useNostr } from '@nostrify/react';
import { NLogin, type NLoginType, useNostrLogin } from '@nostrify/react/login';

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
    // Login with NIP-46 NostrConnect (client-initiated connection).
    // Store login in the same shape as NLogin.fromBunker() so NUser.fromBunkerLogin()
    // can build the signer and useCurrentUser() returns a valid user (dashboard loads).
    async nostrconnect(remotePubkey: string, userPubkey: string, clientNsec: string, relayUrl: string): Promise<void> {
      const login = {
        id: `bunker:${userPubkey}`,
        type: 'bunker' as const,
        pubkey: userPubkey,
        createdAt: new Date().toISOString(),
        data: {
          bunkerPubkey: remotePubkey,
          clientNsec: clientNsec as `nsec1${string}`,
          relays: [relayUrl],
        },
      } as unknown as NLoginType;

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
