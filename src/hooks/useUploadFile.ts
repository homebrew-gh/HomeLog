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

/** Result of an upload attempt to a single server */
interface UploadResult {
  server: string;
  success: boolean;
  tags?: string[][];
  error?: string;
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
      
      console.log('Uploading to ALL configured servers for redundancy:', servers);

      // Separate nostr.build native URLs from Blossom URLs
      const nostrBuildUrls = servers.filter(isNostrBuildNativeUrl);
      const blossomUrls = servers.filter(url => !isNostrBuildNativeUrl(url));

      const uploadPromises: Promise<UploadResult>[] = [];

      // Upload to nostr.build using their native API
      if (nostrBuildUrls.length > 0) {
        console.log('Using NostrBuildUploader for:', nostrBuildUrls);
        const nostrBuildUploader = new NostrBuildUploader({
          signer: user.signer,
        });
        uploadPromises.push(
          nostrBuildUploader.upload(file)
            .then((tags) => ({ server: 'nostr.build', success: true, tags }))
            .catch((error) => ({ server: 'nostr.build', success: false, error: error.message }))
        );
      }

      // Upload to each Blossom server individually for redundancy
      for (const serverUrl of blossomUrls) {
        console.log('Using BlossomUploader for:', serverUrl);
        const blossomUploader = new BlossomUploader({
          servers: [serverUrl],
          signer: user.signer,
        });
        uploadPromises.push(
          blossomUploader.upload(file)
            .then((tags) => ({ server: serverUrl, success: true, tags }))
            .catch((error) => ({ server: serverUrl, success: false, error: error.message }))
        );
      }

      if (uploadPromises.length === 0) {
        throw new Error('No valid upload servers configured');
      }

      // Wait for ALL uploads to complete (success or failure)
      const results = await Promise.all(uploadPromises);
      
      // Log results for each server
      const succeeded = results.filter(r => r.success);
      const failed = results.filter(r => !r.success);
      
      console.log(`Upload complete: ${succeeded.length}/${results.length} servers succeeded`);
      succeeded.forEach(r => console.log(`  ✓ ${r.server}`));
      failed.forEach(r => console.log(`  ✗ ${r.server}: ${r.error}`));

      // Check if at least one upload succeeded
      if (succeeded.length === 0) {
        const errorMessages = failed.map(r => `${r.server}: ${r.error}`).join('; ');
        throw new Error(`All uploads failed: ${errorMessages}`);
      }

      // Warn if some servers failed but continue with successful upload
      if (failed.length > 0) {
        console.warn(`Warning: Upload failed on ${failed.length} server(s):`, 
          failed.map(r => r.server).join(', '));
      }

      // Return tags from first successful upload (all should have same content hash)
      const tags = succeeded[0].tags!;
      console.log('Upload successful, tags:', tags);
      return tags;
    },
  });
}

/** Hook to check if file uploads are available (i.e., a private server is configured) */
export function useCanUploadFiles(): boolean {
  const { hasPrivateBlossomServer } = useUserPreferences();
  return hasPrivateBlossomServer();
}

/**
 * Extract the file hash (SHA-256) from a Blossom/nostr.build URL
 * URLs typically look like:
 * - https://image.nostr.build/abc123def456.jpg
 * - https://blossom.primal.net/abc123def456.png
 * - https://cdn.satellite.earth/abc123def456.webp
 */
function extractFileHash(url: string): string | null {
  try {
    const parsed = new URL(url);
    const pathname = parsed.pathname;
    // Get the filename from the path (last segment)
    const filename = pathname.split('/').pop();
    if (!filename) return null;
    // Remove extension to get hash
    const hash = filename.replace(/\.[^.]+$/, '');
    // SHA-256 hashes are 64 hex characters
    if (/^[a-f0-9]{64}$/i.test(hash)) {
      return hash.toLowerCase();
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Get the base server URL from a file URL
 */
function getServerFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    // Handle different nostr.build subdomains -> use blossom.nostr.build for deletion
    if (parsed.hostname === 'image.nostr.build' || 
        parsed.hostname === 'media.nostr.build' ||
        parsed.hostname === 'video.nostr.build') {
      return 'https://blossom.nostr.build/';
    }
    // For other URLs, use the origin
    return parsed.origin + '/';
  } catch {
    return null;
  }
}

/**
 * Hook to delete a file from the media server
 * 
 * Blossom DELETE endpoint (BUD-02):
 * DELETE /<sha256> with signed authorization header
 */
export function useDeleteFile() {
  const { user } = useCurrentUser();

  return useMutation({
    mutationFn: async (fileUrl: string) => {
      if (!user) {
        throw new Error('Must be logged in to delete files');
      }

      const hash = extractFileHash(fileUrl);
      if (!hash) {
        console.warn('Could not extract file hash from URL:', fileUrl);
        throw new Error('Could not determine file hash from URL. The file may need to be deleted manually from your media server.');
      }

      const server = getServerFromUrl(fileUrl);
      if (!server) {
        throw new Error('Could not determine server from URL');
      }

      console.log('Attempting to delete file:', { url: fileUrl, hash, server });

      // Create Blossom delete authorization event (kind 24242)
      const now = Math.floor(Date.now() / 1000);
      const deleteEvent = await user.signer.signEvent({
        kind: 24242,
        content: 'Delete file',
        created_at: now,
        tags: [
          ['t', 'delete'],
          ['x', hash],
          ['expiration', String(now + 60)], // 1 minute expiration
        ],
      });

      // Base64 encode the signed event for the Authorization header
      const authHeader = 'Nostr ' + btoa(JSON.stringify(deleteEvent));

      // Make DELETE request to the server
      const deleteUrl = `${server}${hash}`;
      console.log('Sending DELETE request to:', deleteUrl);

      const response = await fetch(deleteUrl, {
        method: 'DELETE',
        headers: {
          'Authorization': authHeader,
        },
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        console.error('Delete failed:', response.status, errorText);
        
        if (response.status === 404) {
          // File already deleted or doesn't exist - treat as success
          console.log('File not found on server (may already be deleted)');
          return { success: true, alreadyDeleted: true };
        }
        
        throw new Error(`Failed to delete file: ${response.status} ${errorText}`);
      }

      console.log('File deleted successfully');
      return { success: true, alreadyDeleted: false };
    },
  });
}