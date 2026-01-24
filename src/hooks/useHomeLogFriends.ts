import { useNostr } from "@nostrify/react";
import { useQuery } from "@tanstack/react-query";
import { useCurrentUser } from "./useCurrentUser";
import { HOMELOG_CLIENT_NAME } from "./useNostrPublish";

// HomeLog's custom event kinds
const HOMELOG_KINDS = [32627, 32628, 37003, 30229, 9413];

interface HomeLogFriend {
  pubkey: string;
  eventCount: number;
}

/**
 * Hook to discover which of the user's follows are also using HomeLog.
 * 
 * This works by:
 * 1. Fetching the user's follow list (kind 3)
 * 2. Querying for HomeLog events from those follows that have the "client" tag
 * 3. Returning the list of pubkeys who have published HomeLog events
 */
export function useHomeLogFriends() {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();

  // First, get the user's follow list
  const { data: follows = [], isLoading: isLoadingFollows } = useQuery({
    queryKey: ['follows', user?.pubkey],
    queryFn: async (c) => {
      if (!user?.pubkey) return [];
      
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(5000)]);
      
      const events = await nostr.query([{
        kinds: [3],
        authors: [user.pubkey],
        limit: 1,
      }], { signal });

      if (events.length === 0) return [];

      // Extract pubkeys from p tags
      const followedPubkeys = events[0].tags
        .filter(tag => tag[0] === 'p' && tag[1])
        .map(tag => tag[1]);

      return followedPubkeys;
    },
    enabled: !!user?.pubkey,
    staleTime: 60000, // Cache for 1 minute
  });

  // Then, find which follows have HomeLog events
  const { data: homeLogFriends = [], isLoading: isLoadingFriends } = useQuery({
    queryKey: ['homelog-friends', follows],
    queryFn: async (c) => {
      if (follows.length === 0) return [];

      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(10000)]);

      // Query for HomeLog events from follows
      // We look for events with the HomeLog client tag
      // Since not all relays support filtering by #client, we also query by kinds
      // and filter client-side
      const events = await nostr.query([{
        kinds: HOMELOG_KINDS,
        authors: follows,
        limit: 500, // Get a reasonable sample
      }], { signal });

      // Filter to only events with the HomeLog client tag
      // This ensures we don't get false positives from kind collisions
      const homeLogEvents = events.filter(event => {
        const clientTag = event.tags.find(tag => tag[0] === 'client');
        return clientTag && clientTag[1] === HOMELOG_CLIENT_NAME;
      });

      // Count events per pubkey
      const pubkeyEventCounts = new Map<string, number>();
      homeLogEvents.forEach(event => {
        const count = pubkeyEventCounts.get(event.pubkey) ?? 0;
        pubkeyEventCounts.set(event.pubkey, count + 1);
      });

      // Convert to array and sort by event count (most active first)
      const friends: HomeLogFriend[] = Array.from(pubkeyEventCounts.entries())
        .map(([pubkey, eventCount]) => ({ pubkey, eventCount }))
        .sort((a, b) => b.eventCount - a.eventCount);

      return friends;
    },
    enabled: follows.length > 0,
    staleTime: 300000, // Cache for 5 minutes
  });

  return {
    friends: homeLogFriends,
    followCount: follows.length,
    isLoading: isLoadingFollows || isLoadingFriends,
  };
}
