import { useState, useEffect, useCallback } from 'react';
import { useUserPreferences } from '@/contexts/UserPreferencesContext';
import { generateFallbackUrls } from '@/lib/blossom';

interface UseBlossomUrlOptions {
  /** Whether to automatically try fallbacks on error (default: true) */
  autoFallback?: boolean;
}

interface UseBlossomUrlResult {
  /** The current URL to use (may be original or a fallback) */
  currentUrl: string;
  /** Whether the URL is currently being resolved */
  isLoading: boolean;
  /** Whether all URLs have been tried and failed */
  hasFailed: boolean;
  /** Manually trigger fallback to next URL */
  tryNextUrl: () => void;
  /** Reset to original URL */
  reset: () => void;
  /** The index of the current URL in the fallback list */
  currentIndex: number;
  /** Total number of available URLs */
  totalUrls: number;
}

/**
 * Hook to manage Blossom URL fallback for file viewing
 * 
 * When a file fails to load from the primary server, this hook
 * automatically tries alternative servers that may have the same file
 * (identified by its SHA-256 hash).
 * 
 * @param originalUrl - The original Blossom file URL
 * @param options - Configuration options
 * @returns Object with current URL and fallback controls
 * 
 * @example
 * ```tsx
 * function MyImage({ url }: { url: string }) {
 *   const { currentUrl, tryNextUrl, hasFailed } = useBlossomUrl(url);
 *   
 *   if (hasFailed) return <p>Image unavailable</p>;
 *   
 *   return <img src={currentUrl} onError={tryNextUrl} />;
 * }
 * ```
 */
export function useBlossomUrl(
  originalUrl: string,
  options: UseBlossomUrlOptions = {}
): UseBlossomUrlResult {
  const { autoFallback = true } = options;
  const { getPrivateBlossomServers } = useUserPreferences();
  
  // Generate all fallback URLs
  const [fallbackUrls, setFallbackUrls] = useState<string[]>(() => {
    const servers = getPrivateBlossomServers();
    return generateFallbackUrls(originalUrl, servers);
  });
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  
  // Regenerate fallback URLs when original URL or servers change
  useEffect(() => {
    const servers = getPrivateBlossomServers();
    const urls = generateFallbackUrls(originalUrl, servers);
    setFallbackUrls(urls);
    setCurrentIndex(0);
  }, [originalUrl, getPrivateBlossomServers]);
  
  const tryNextUrl = useCallback(() => {
    if (autoFallback && currentIndex < fallbackUrls.length - 1) {
      setIsLoading(true);
      setCurrentIndex(prev => prev + 1);
      // Small delay to show loading state
      setTimeout(() => setIsLoading(false), 100);
    }
  }, [autoFallback, currentIndex, fallbackUrls.length]);
  
  const reset = useCallback(() => {
    setCurrentIndex(0);
    setIsLoading(false);
  }, []);
  
  return {
    currentUrl: fallbackUrls[currentIndex] || originalUrl,
    isLoading,
    hasFailed: currentIndex >= fallbackUrls.length - 1 && fallbackUrls.length > 0,
    tryNextUrl,
    reset,
    currentIndex,
    totalUrls: fallbackUrls.length,
  };
}
