import { useState, useEffect, useRef, useCallback } from 'react';

/** Detect if the app is running as a PWA (standalone display mode or iOS home screen) */
function isStandalonePWA(): boolean {
  if (typeof window === 'undefined') return false;
  // Standard display-mode media query (e.g. when launched from home screen)
  if (window.matchMedia('(display-mode: standalone)').matches) return true;
  // Safari iOS when added to home screen
  const nav = navigator as { standalone?: boolean };
  if (nav.standalone === true) return true;
  // Some Android PWAs
  if (document.referrer.includes('android-app://')) return true;
  return false;
}

/** Check if URL is eligible for blob proxy (https, not already blob/data) */
function canProxyToBlob(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch {
    return false;
  }
}

interface UseViewerBlobUrlOptions {
  /** When true, viewer is open and we may try to proxy to blob for PWA compatibility */
  isActive: boolean;
  /** File type hint: use blob proxy for PDF and image when in PWA to avoid cross-origin restrictions */
  fileType?: 'image' | 'pdf' | 'unknown';
}

interface UseViewerBlobUrlResult {
  /** URL to use for display: blob URL when proxy succeeded, otherwise original URL */
  displayUrl: string;
  /** True when the displayed URL is a blob (same-origin), so iframe/img should work in PWA */
  isBlob: boolean;
  /** True while fetching to create blob URL */
  isLoadingBlob: boolean;
  /** Reset (e.g. when switching to next fallback URL) */
  reset: () => void;
}

/**
 * Proxies a file URL through fetch + blob URL when running as PWA so that
 * images and PDFs can be displayed in iframe/img (same-origin) and are not
 * blocked by standalone cross-origin restrictions (e.g. on iOS).
 */
export function useViewerBlobUrl(
  url: string,
  options: UseViewerBlobUrlOptions
): UseViewerBlobUrlResult {
  const { isActive, fileType = 'unknown' } = options;
  const [displayUrl, setDisplayUrl] = useState(url);
  const [isBlob, setIsBlob] = useState(false);
  const [isLoadingBlob, setIsLoadingBlob] = useState(false);
  const revokedRef = useRef<string | null>(null);

  const revokePrevious = useCallback(() => {
    if (revokedRef.current) {
      try {
        URL.revokeObjectURL(revokedRef.current);
      } catch {
        // ignore
      }
      revokedRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    revokePrevious();
    setDisplayUrl(url);
    setIsBlob(false);
    setIsLoadingBlob(false);
  }, [url, revokePrevious]);

  useEffect(() => {
    if (!isActive || !canProxyToBlob(url) || (fileType !== 'image' && fileType !== 'pdf')) {
      reset();
      return () => revokePrevious();
    }

    // Only proxy when in PWA standalone to avoid unnecessary fetch in normal browser
    if (!isStandalonePWA()) {
      setDisplayUrl(url);
      setIsBlob(false);
      setIsLoadingBlob(false);
      return () => revokePrevious();
    }

    let cancelled = false;
    setIsLoadingBlob(true);
    setDisplayUrl(url);
    setIsBlob(false);

    fetch(url, { mode: 'cors' })
      .then((res) => {
        if (cancelled || !res.ok) return null;
        return res.blob();
      })
      .then((blob) => {
        if (cancelled || !blob) return;
        revokePrevious();
        const blobUrl = URL.createObjectURL(blob);
        revokedRef.current = blobUrl;
        setDisplayUrl(blobUrl);
        setIsBlob(true);
      })
      .catch(() => {
        if (!cancelled) {
          setDisplayUrl(url);
          setIsBlob(false);
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoadingBlob(false);
      });

    return () => {
      cancelled = true;
      revokePrevious();
    };
  }, [url, isActive, fileType, revokePrevious, reset]);

  return {
    displayUrl,
    isBlob,
    isLoadingBlob,
    reset,
  };
}
