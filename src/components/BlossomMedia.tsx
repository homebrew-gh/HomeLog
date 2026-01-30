import { useState, useCallback } from 'react';
import { ExternalLink, AlertCircle, RefreshCw, FileText, Eye } from 'lucide-react';
import { useBlossomUrl } from '@/hooks/useBlossomUrl';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { FileViewer } from '@/components/FileViewer';

interface BlossomImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src' | 'onError'> {
  /** The original Blossom file URL */
  src: string;
  /** Alt text for the image */
  alt: string;
  /** Fallback content to show when all URLs fail */
  fallback?: React.ReactNode;
  /** Whether to show a loading skeleton while loading */
  showSkeleton?: boolean;
  /** Additional class for the skeleton */
  skeletonClassName?: string;
  /** Whether clicking the image opens a full-screen viewer */
  enableViewer?: boolean;
  /** Title to display in the viewer */
  viewerTitle?: string;
}

/**
 * Image component with automatic Blossom server fallback
 * 
 * When the primary server fails, automatically tries loading
 * the same file (by hash) from other configured Blossom servers.
 * 
 * @example
 * ```tsx
 * <BlossomImage
 *   src="https://blossom.example.com/abc123...def.jpg"
 *   alt="My photo"
 *   className="w-full h-48 object-cover rounded-lg"
 * />
 * ```
 */
export function BlossomImage({
  src,
  alt,
  fallback,
  showSkeleton = true,
  skeletonClassName,
  className,
  enableViewer = false,
  viewerTitle,
  ...props
}: BlossomImageProps) {
  const { currentUrl, tryNextUrl, hasFailed, currentIndex, totalUrls } = useBlossomUrl(src);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  
  const handleLoad = useCallback(() => {
    setIsLoaded(true);
    setHasError(false);
  }, []);
  
  const handleError = useCallback(() => {
    setHasError(true);
    if (!hasFailed) {
      // Try next URL
      tryNextUrl();
      setHasError(false);
    }
  }, [hasFailed, tryNextUrl]);
  
  const handleRetry = useCallback(() => {
    setHasError(false);
    setIsLoaded(false);
  }, []);

  const handleClick = useCallback(() => {
    if (enableViewer && isLoaded) {
      setViewerOpen(true);
    }
  }, [enableViewer, isLoaded]);

  // All URLs exhausted - show fallback
  if (hasFailed && hasError) {
    if (fallback) {
      return <>{fallback}</>;
    }
    return (
      <div className={cn(
        "flex flex-col items-center justify-center bg-muted/50 rounded-lg p-4 text-center",
        className
      )}>
        <AlertCircle className="h-8 w-8 text-muted-foreground/50 mb-2" />
        <p className="text-sm text-muted-foreground">Image unavailable</p>
        <p className="text-xs text-muted-foreground/70 mt-1">
          Tried {totalUrls} server{totalUrls !== 1 ? 's' : ''}
        </p>
        <Button 
          variant="ghost" 
          size="sm" 
          className="mt-2"
          onClick={handleRetry}
        >
          <RefreshCw className="h-3 w-3 mr-1" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <>
      <div 
        className={cn("relative", enableViewer && isLoaded && "cursor-pointer group")}
        onClick={handleClick}
      >
        {/* Skeleton while loading */}
        {showSkeleton && !isLoaded && (
          <Skeleton className={cn("absolute inset-0", skeletonClassName || className)} />
        )}
        
        {/* Actual image */}
        <img
          src={currentUrl}
          alt={alt}
          className={cn(
            className,
            !isLoaded && showSkeleton && "invisible"
          )}
          onLoad={handleLoad}
          onError={handleError}
          {...props}
        />
        
        {/* View overlay for clickable images */}
        {enableViewer && isLoaded && (
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
            <Eye className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        )}
        
        {/* Fallback indicator */}
        {currentIndex > 0 && isLoaded && (
          <div 
            className="absolute bottom-1 right-1 bg-yellow-500/80 text-yellow-950 text-xs px-1.5 py-0.5 rounded"
            title={`Loaded from fallback server ${currentIndex + 1}/${totalUrls}`}
          >
            Fallback
          </div>
        )}
      </div>
      
      {/* File viewer */}
      {enableViewer && (
        <FileViewer
          url={src}
          isOpen={viewerOpen}
          onClose={() => setViewerOpen(false)}
          title={viewerTitle || alt}
        />
      )}
    </>
  );
}

interface BlossomLinkProps extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  /** The original Blossom file URL */
  href: string;
  /** Link text/children */
  children: React.ReactNode;
  /** Whether to show external link icon */
  showIcon?: boolean;
  /** Whether to verify URL before showing (may cause delay) */
  verifyUrl?: boolean;
}

/**
 * Link component with automatic Blossom server fallback
 * 
 * When clicked, if the primary server fails, automatically tries
 * the same file (by hash) from other configured Blossom servers.
 * 
 * @example
 * ```tsx
 * <BlossomLink
 *   href="https://blossom.example.com/abc123...def.pdf"
 *   className="text-primary hover:underline"
 * >
 *   View Document
 * </BlossomLink>
 * ```
 */
export function BlossomLink({
  href,
  children,
  showIcon = true,
  className,
  ...props
}: BlossomLinkProps) {
  const { currentUrl, tryNextUrl, hasFailed, currentIndex, totalUrls } = useBlossomUrl(href);
  const [isChecking, setIsChecking] = useState(false);
  
  const handleClick = useCallback(async (e: React.MouseEvent<HTMLAnchorElement>) => {
    // Don't interfere if user wants to open in new tab with modifier keys
    if (e.metaKey || e.ctrlKey || e.shiftKey) {
      return;
    }
    
    // Check if current URL works
    setIsChecking(true);
    try {
      const response = await fetch(currentUrl, { method: 'HEAD' });
      if (!response.ok && !hasFailed) {
        e.preventDefault();
        tryNextUrl();
        // Retry click after a short delay
        setTimeout(() => {
          window.open(currentUrl, '_blank', 'noopener,noreferrer');
        }, 100);
      }
    } catch {
      if (!hasFailed) {
        e.preventDefault();
        tryNextUrl();
        setTimeout(() => {
          window.open(currentUrl, '_blank', 'noopener,noreferrer');
        }, 100);
      }
    } finally {
      setIsChecking(false);
    }
  }, [currentUrl, hasFailed, tryNextUrl]);

  return (
    <a
      href={currentUrl}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleClick}
      className={cn(
        "inline-flex items-center gap-1",
        isChecking && "opacity-70 cursor-wait",
        className
      )}
      title={currentIndex > 0 ? `Using fallback server ${currentIndex + 1}/${totalUrls}` : undefined}
      {...props}
    >
      {children}
      {showIcon && <ExternalLink className="h-3 w-3 shrink-0" />}
      {currentIndex > 0 && (
        <span className="text-xs bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 px-1 rounded">
          fallback
        </span>
      )}
    </a>
  );
}

interface BlossomDocumentLinkProps {
  /** The document URL */
  href: string;
  /** Document name to display */
  name?: string;
  /** Icon to show before the link */
  icon?: React.ReactNode;
  /** Link text/children */
  children?: React.ReactNode;
  /** Additional className */
  className?: string;
  /** Whether to show external link icon */
  showIcon?: boolean;
  /** Whether to open in viewer (default: true) */
  enableViewer?: boolean;
}

/**
 * Document link with icon and name, opens in-app file viewer
 * 
 * @example
 * ```tsx
 * <BlossomDocumentLink
 *   href={doc.url}
 *   name={doc.name}
 *   icon={<FileText className="h-4 w-4" />}
 * />
 * ```
 */
export function BlossomDocumentLink({
  href,
  name,
  icon,
  children,
  className,
  showIcon = true,
  enableViewer = true,
}: BlossomDocumentLinkProps) {
  const [viewerOpen, setViewerOpen] = useState(false);
  const displayName = children || name || 'View Document';
  
  const handleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (enableViewer) {
      setViewerOpen(true);
    } else {
      window.open(href, '_blank', 'noopener,noreferrer');
    }
  }, [enableViewer, href]);

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className={cn(
          "text-primary hover:underline flex items-center gap-1 text-sm cursor-pointer",
          className
        )}
      >
        {icon || <FileText className="h-4 w-4" />}
        <span className="truncate">{displayName}</span>
        {showIcon && <Eye className="h-3 w-3 shrink-0" />}
      </button>
      
      {enableViewer && (
        <FileViewer
          url={href}
          isOpen={viewerOpen}
          onClose={() => setViewerOpen(false)}
          title={typeof displayName === 'string' ? displayName : name}
        />
      )}
    </>
  );
}
