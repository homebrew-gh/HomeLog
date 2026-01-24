import { useNostr } from "@nostrify/react";
import { useMutation, type UseMutationResult } from "@tanstack/react-query";

import { useCurrentUser } from "./useCurrentUser";

import type { NostrEvent } from "@nostrify/nostrify";

// HomeLog client identifier for NIP-89 client tag
// This allows other clients to identify events created by HomeLog
// and enables discovery of HomeLog users among follows
const HOMELOG_CLIENT_NAME = "Home Log";
const HOMELOG_CLIENT_URL = "https://homelog.shakespeare.wtf";

export function useNostrPublish(): UseMutationResult<NostrEvent> {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();

  return useMutation({
    mutationFn: async (t: Omit<NostrEvent, 'id' | 'pubkey' | 'sig'>) => {
      if (user) {
        const tags = t.tags ?? [];

        // Add the HomeLog client tag if it doesn't exist (NIP-89)
        // Format: ["client", "<app-name>", "<app-url>"]
        // This enables discovery of HomeLog users among follows
        if (!tags.some(([name]) => name === "client")) {
          tags.push(["client", HOMELOG_CLIENT_NAME, HOMELOG_CLIENT_URL]);
        }

        const event = await user.signer.signEvent({
          kind: t.kind,
          content: t.content ?? "",
          tags,
          created_at: t.created_at ?? Math.floor(Date.now() / 1000),
        });

        await nostr.event(event, { signal: AbortSignal.timeout(5000) });
        return event;
      } else {
        throw new Error("User is not logged in");
      }
    },
    onError: (error) => {
      console.error("Failed to publish event:", error);
    },
    onSuccess: (data) => {
      console.log("Event published successfully:", data);
    },
  });
}

// Export constants for use in other parts of the app (e.g., discovery)
export { HOMELOG_CLIENT_NAME, HOMELOG_CLIENT_URL };