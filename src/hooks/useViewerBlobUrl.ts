import { useState, useEffect, useRef, useCallback } from 'react';

/** Check if URL is eligible for blob proxy (https, not already blob/data) */
function canProxyToBlob(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch {
    return false;
  }
}

/** True when URL is on a different origin than the current page (needs proxy for in-app display in PWA) */
function isCrossOrigin(url: string): boolean {
  try {
    return new URL(url).origin !== window.location.origin;
  } catch {
    return true;
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
  /** True when we tried to fetch for blob but failed (e.g. CORS); caller can show "open in browser" hint */
  blobAttemptFailed: boolean;
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
  const [blobAttemptFailed, setBlobAttemptFailed] = useState(false);
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
    setBlobAttemptFailed(false);
  }, [url, revokePrevious]);

  useEffect(() => {
    if (!isActive || !canProxyToBlob(url) || (fileType !== 'image' && fileType !== 'pdf')) {
      reset();
      return () => revokePrevious();
    }

    // Same-origin URLs can be used directly; no need to proxy
    if (!isCrossOrigin(url)) {
      setDisplayUrl(url);
      setIsBlob(false);
      setIsLoadingBlob(false);
      setBlobAttemptFailed(false);
      return () => revokePrevious();
    }

    // Cross-origin: fetch and create blob so img/iframe work in PWA (avoids cross-origin blocking)
    let cancelled = false;
    setIsLoadingBlob(true);
    setDisplayUrl(url);
    setIsBlob(false);
    setBlobAttemptFailed(false);

    fetch(url, { mode: 'cors', credentials: 'omit' })
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
          setBlobAttemptFailed(true);
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
    blobAttemptFailed,
    reset,
  };
}
