import { useMutation } from "@tanstack/react-query";
import { BlossomUploader, NostrBuildUploader } from '@nostrify/nostrify/uploaders';

import { useCurrentUser } from "./useCurrentUser";
import { useUserPreferences } from "@/contexts/UserPreferencesContext";

/** Error thrown when no private Blossom server is configured */
export class NoPrivateServerError extends Error {
  constructor() {
    super('No private Blossom server configured. Please configure a private media server in Settings > Server Settings > Media to upload files.');
    this.name = 'NoPrivateServerError';
  }
}

/**
 * Check if a URL is a nostr.build URL (not their Blossom endpoint)
 * nostr.build has two APIs:
 * - Native API: https://nostr.build/ or https://nostr.build/api/v2/upload/files
 * - Blossom API: https://blossom.nostr.build/
 */
function isNostrBuildNativeUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    // nostr.build native (not blossom.nostr.build)
    return parsed.hostname === 'nostr.build' || 
           parsed.hostname === 'www.nostr.build' ||
           parsed.hostname === 'media.nostr.build';
  } catch {
    return false;
  }
}

export function useUploadFile() {
  const { user } = useCurrentUser();
  const { getPrivateBlossomServers, hasPrivateBlossomServer } = useUserPreferences();

  return useMutation({
    mutationFn: async (file: File) => {
      if (!user) {
        throw new Error('Must be logged in to upload files');
      }

      // Only use private Blossom servers for uploads to protect sensitive data
      if (!hasPrivateBlossomServer()) {
        throw new NoPrivateServerError();
      }

      const servers = getPrivateBlossomServers();
      
      console.log('Attempting upload to servers:', servers);

      // Separate nostr.build native URLs from Blossom URLs
      const nostrBuildUrls = servers.filter(isNostrBuildNativeUrl);
      const blossomUrls = servers.filter(url => !isNostrBuildNativeUrl(url));

      const uploadPromises: Promise<string[][]>[] = [];

      // Try nostr.build native API for nostr.build URLs
      if (nostrBuildUrls.length > 0) {
        console.log('Using NostrBuildUploader for:', nostrBuildUrls);
        const nostrBuildUploader = new NostrBuildUploader({
          signer: user.signer,
        });
        uploadPromises.push(nostrBuildUploader.upload(file));
      }

      // Try Blossom protocol for other URLs
      if (blossomUrls.length > 0) {
        console.log('Using BlossomUploader for:', blossomUrls);
        const blossomUploader = new BlossomUploader({
          servers: blossomUrls,
          signer: user.signer,
        });
        uploadPromises.push(blossomUploader.upload(file));
      }

      if (uploadPromises.length === 0) {
        throw new Error('No valid upload servers configured');
      }

      // Try all uploaders, return first success
      try {
        const tags = await Promise.any(uploadPromises);
        console.log('Upload successful, tags:', tags);
        return tags;
      } catch (error) {
        console.error('All upload attempts failed:', error);
        if (error instanceof AggregateError) {
          // Log individual errors for debugging
          error.errors.forEach((e, i) => {
            console.error(`Upload attempt ${i + 1} failed:`, e);
          });
          throw new Error(`Upload failed: ${error.errors.map(e => e.message).join('; ')}`);
        }
        throw error;
      }
    },
  });
}

/** Hook to check if file uploads are available (i.e., a private server is configured) */
export function useCanUploadFiles(): boolean {
  const { hasPrivateBlossomServer } = useUserPreferences();
  return hasPrivateBlossomServer();
}