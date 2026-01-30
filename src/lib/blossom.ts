/**
 * Blossom URL utilities for content-addressable file handling
 * 
 * Blossom servers use SHA-256 hashes as filenames, allowing the same file
 * to be retrieved from any server that has it stored.
 */

/**
 * Extract the file hash (SHA-256) and extension from a Blossom URL
 * URLs typically look like:
 * - https://blossom.example.com/abc123def456.jpg
 * - https://image.nostr.build/abc123def456.png
 */
export function extractFileInfo(url: string): { hash: string; extension: string } | null {
  try {
    const parsed = new URL(url);
    const pathname = parsed.pathname;
    // Get the filename from the path (last segment)
    const filename = pathname.split('/').pop();
    if (!filename) return null;
    
    // Extract hash and extension
    const lastDotIndex = filename.lastIndexOf('.');
    if (lastDotIndex === -1) return null;
    
    const hash = filename.substring(0, lastDotIndex);
    const extension = filename.substring(lastDotIndex); // includes the dot
    
    // SHA-256 hashes are 64 hex characters
    if (/^[a-f0-9]{64}$/i.test(hash)) {
      return { hash: hash.toLowerCase(), extension };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Generate a Blossom URL for a given server and file info
 */
export function buildBlossomUrl(serverUrl: string, hash: string, extension: string): string {
  // Normalize server URL (ensure it ends with /)
  const normalizedServer = serverUrl.endsWith('/') ? serverUrl : `${serverUrl}/`;
  return `${normalizedServer}${hash}${extension}`;
}

/**
 * Generate fallback URLs for a Blossom file across multiple servers
 * Returns the original URL first, followed by alternatives
 */
export function generateFallbackUrls(originalUrl: string, serverUrls: string[]): string[] {
  const fileInfo = extractFileInfo(originalUrl);
  
  // If we can't extract file info, just return the original URL
  if (!fileInfo) {
    return [originalUrl];
  }
  
  const { hash, extension } = fileInfo;
  const urls: string[] = [originalUrl];
  
  // Add fallback URLs from other servers
  for (const serverUrl of serverUrls) {
    const fallbackUrl = buildBlossomUrl(serverUrl, hash, extension);
    // Don't add duplicates
    if (!urls.includes(fallbackUrl)) {
      urls.push(fallbackUrl);
    }
  }
  
  return urls;
}

/**
 * Try to fetch a URL and return true if successful (2xx status)
 */
export async function checkUrlAvailability(url: string, signal?: AbortSignal): Promise<boolean> {
  try {
    const response = await fetch(url, {
      method: 'HEAD',
      signal,
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Find the first working URL from a list of fallback URLs
 */
export async function findWorkingUrl(urls: string[], signal?: AbortSignal): Promise<string | null> {
  for (const url of urls) {
    if (await checkUrlAvailability(url, signal)) {
      return url;
    }
  }
  return null;
}
