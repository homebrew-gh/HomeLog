import { useState, useCallback, useEffect } from 'react';
import { 
  X, 
  Download, 
  ExternalLink, 
  ZoomIn, 
  ZoomOut, 
  RotateCw,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  FileText,
  Image as ImageIcon,
  AlertCircle,
  RefreshCw,
  Loader2
} from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useBlossomUrl } from '@/hooks/useBlossomUrl';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';

/** File types that can be viewed */
type ViewableFileType = 'image' | 'pdf' | 'unknown';

/** Detect file type from URL */
function getFileType(url: string): ViewableFileType {
  try {
    const pathname = new URL(url).pathname.toLowerCase();
    
    // Image extensions
    if (/\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)$/i.test(pathname)) {
      return 'image';
    }
    
    // PDF
    if (/\.pdf$/i.test(pathname)) {
      return 'pdf';
    }
    
    return 'unknown';
  } catch {
    return 'unknown';
  }
}

/** Get filename from URL */
function getFileName(url: string): string {
  try {
    const pathname = new URL(url).pathname;
    const filename = pathname.split('/').pop() || 'file';
    // Truncate long hash-based filenames
    if (filename.length > 40) {
      const ext = filename.split('.').pop();
      return `${filename.substring(0, 12)}...${ext ? `.${ext}` : ''}`;
    }
    return filename;
  } catch {
    return 'file';
  }
}

interface FileViewerProps {
  /** URL of the file to view */
  url: string;
  /** Whether the viewer is open */
  isOpen: boolean;
  /** Callback when the viewer is closed */
  onClose: () => void;
  /** Optional title to display */
  title?: string;
  /** Optional array of URLs for gallery navigation */
  gallery?: string[];
  /** Current index in gallery (if using gallery mode) */
  galleryIndex?: number;
  /** Callback when navigating in gallery */
  onGalleryNavigate?: (index: number) => void;
}

/**
 * Full-screen file viewer with support for images and PDFs
 * Features automatic Blossom server fallback
 */
export function FileViewer({
  url,
  isOpen,
  onClose,
  title,
  gallery,
  galleryIndex = 0,
  onGalleryNavigate,
}: FileViewerProps) {
  const { currentUrl, tryNextUrl, hasFailed, reset, currentIndex, totalUrls } = useBlossomUrl(url);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  
  const fileType = getFileType(url);
  const fileName = title || getFileName(url);
  const isGalleryMode = gallery && gallery.length > 1;
  
  // Reset state when URL changes
  useEffect(() => {
    setIsLoading(true);
    setHasError(false);
    setZoom(1);
    setRotation(0);
    reset();
  }, [url, reset]);
  
  const handleImageLoad = useCallback(() => {
    setIsLoading(false);
    setHasError(false);
  }, []);
  
  const handleImageError = useCallback(() => {
    if (!hasFailed) {
      tryNextUrl();
    } else {
      setIsLoading(false);
      setHasError(true);
    }
  }, [hasFailed, tryNextUrl]);
  
  const handleRetry = useCallback(() => {
    setIsLoading(true);
    setHasError(false);
    reset();
  }, [reset]);
  
  const handleZoomIn = useCallback(() => {
    setZoom(prev => Math.min(prev + 0.25, 3));
  }, []);
  
  const handleZoomOut = useCallback(() => {
    setZoom(prev => Math.max(prev - 0.25, 0.25));
  }, []);
  
  const handleRotate = useCallback(() => {
    setRotation(prev => (prev + 90) % 360);
  }, []);
  
  const handleResetView = useCallback(() => {
    setZoom(1);
    setRotation(0);
  }, []);
  
  const handleDownload = useCallback(() => {
    const link = document.createElement('a');
    link.href = currentUrl;
    link.download = getFileName(url);
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [currentUrl, url]);
  
  const handleOpenExternal = useCallback(() => {
    window.open(currentUrl, '_blank', 'noopener,noreferrer');
  }, [currentUrl]);
  
  const handlePrevious = useCallback(() => {
    if (gallery && onGalleryNavigate && galleryIndex > 0) {
      onGalleryNavigate(galleryIndex - 1);
    }
  }, [gallery, galleryIndex, onGalleryNavigate]);
  
  const handleNext = useCallback(() => {
    if (gallery && onGalleryNavigate && galleryIndex < gallery.length - 1) {
      onGalleryNavigate(galleryIndex + 1);
    }
  }, [gallery, galleryIndex, onGalleryNavigate]);
  
  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
          if (isGalleryMode) handlePrevious();
          break;
        case 'ArrowRight':
          if (isGalleryMode) handleNext();
          break;
        case '+':
        case '=':
          handleZoomIn();
          break;
        case '-':
          handleZoomOut();
          break;
        case 'r':
          handleRotate();
          break;
        case '0':
          handleResetView();
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isGalleryMode, handlePrevious, handleNext, handleZoomIn, handleZoomOut, handleRotate, handleResetView, onClose]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent 
        className="max-w-[95vw] max-h-[95vh] w-full h-full p-0 bg-black/95 border-none overflow-hidden"
        hideCloseButton
      >
        <VisuallyHidden>
          <DialogTitle>{fileName}</DialogTitle>
        </VisuallyHidden>
        
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent">
          {/* File info */}
          <div className="flex items-center gap-3 text-white">
            {fileType === 'image' ? (
              <ImageIcon className="h-5 w-5" />
            ) : (
              <FileText className="h-5 w-5" />
            )}
            <span className="font-medium truncate max-w-[200px] sm:max-w-[400px]">
              {fileName}
            </span>
            {currentIndex > 0 && (
              <span className="text-xs bg-yellow-500/80 text-yellow-950 px-1.5 py-0.5 rounded">
                Fallback {currentIndex + 1}/{totalUrls}
              </span>
            )}
          </div>
          
          {/* Actions */}
          <div className="flex items-center gap-1">
            {fileType === 'image' && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/20"
                  onClick={handleZoomOut}
                  title="Zoom out (-)"
                >
                  <ZoomOut className="h-5 w-5" />
                </Button>
                <span className="text-white text-sm min-w-[3rem] text-center">
                  {Math.round(zoom * 100)}%
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/20"
                  onClick={handleZoomIn}
                  title="Zoom in (+)"
                >
                  <ZoomIn className="h-5 w-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/20"
                  onClick={handleRotate}
                  title="Rotate (R)"
                >
                  <RotateCw className="h-5 w-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/20"
                  onClick={handleResetView}
                  title="Reset view (0)"
                >
                  <Maximize2 className="h-5 w-5" />
                </Button>
                <div className="w-px h-6 bg-white/30 mx-1" />
              </>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20"
              onClick={handleDownload}
              title="Download"
            >
              <Download className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20"
              onClick={handleOpenExternal}
              title="Open in new tab"
            >
              <ExternalLink className="h-5 w-5" />
            </Button>
            <div className="w-px h-6 bg-white/30 mx-1" />
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20"
              onClick={onClose}
              title="Close (Esc)"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>
        
        {/* Gallery navigation */}
        {isGalleryMode && (
          <>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "absolute left-4 top-1/2 -translate-y-1/2 z-10 text-white hover:bg-white/20 h-12 w-12",
                galleryIndex === 0 && "opacity-30 pointer-events-none"
              )}
              onClick={handlePrevious}
              disabled={galleryIndex === 0}
            >
              <ChevronLeft className="h-8 w-8" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "absolute right-4 top-1/2 -translate-y-1/2 z-10 text-white hover:bg-white/20 h-12 w-12",
                galleryIndex === gallery.length - 1 && "opacity-30 pointer-events-none"
              )}
              onClick={handleNext}
              disabled={galleryIndex === gallery.length - 1}
            >
              <ChevronRight className="h-8 w-8" />
            </Button>
            
            {/* Gallery indicator */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 bg-black/60 text-white px-3 py-1.5 rounded-full text-sm">
              {galleryIndex + 1} / {gallery.length}
            </div>
          </>
        )}
        
        {/* Content area */}
        <div className="flex items-center justify-center w-full h-full pt-16 pb-4 px-4 overflow-auto">
          {/* Loading state */}
          {isLoading && fileType === 'image' && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="h-12 w-12 text-white animate-spin" />
            </div>
          )}
          
          {/* Error state */}
          {hasError && (
            <div className="flex flex-col items-center justify-center text-white text-center p-8">
              <AlertCircle className="h-16 w-16 text-red-400 mb-4" />
              <p className="text-lg font-medium mb-2">Unable to load file</p>
              <p className="text-sm text-white/70 mb-4">
                Tried {totalUrls} server{totalUrls !== 1 ? 's' : ''} without success
              </p>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={handleRetry}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry
                </Button>
                <Button variant="secondary" onClick={handleOpenExternal}>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open in browser
                </Button>
              </div>
            </div>
          )}
          
          {/* Image viewer */}
          {fileType === 'image' && !hasError && (
            <img
              src={currentUrl}
              alt={fileName}
              className={cn(
                "max-w-full max-h-full object-contain transition-transform duration-200",
                isLoading && "opacity-0"
              )}
              style={{
                transform: `scale(${zoom}) rotate(${rotation}deg)`,
              }}
              onLoad={handleImageLoad}
              onError={handleImageError}
              draggable={false}
            />
          )}
          
          {/* PDF viewer */}
          {fileType === 'pdf' && !hasError && (
            <iframe
              src={`${currentUrl}#toolbar=1&navpanes=0`}
              className="w-full h-full bg-white rounded-lg"
              title={fileName}
              onLoad={() => setIsLoading(false)}
              onError={handleImageError}
            />
          )}
          
          {/* Unknown file type */}
          {fileType === 'unknown' && !hasError && (
            <div className="flex flex-col items-center justify-center text-white text-center p-8">
              <FileText className="h-16 w-16 text-white/50 mb-4" />
              <p className="text-lg font-medium mb-2">Preview not available</p>
              <p className="text-sm text-white/70 mb-4">
                This file type cannot be previewed in the browser
              </p>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={handleDownload}>
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
                <Button variant="secondary" onClick={handleOpenExternal}>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open in browser
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface FileViewerTriggerProps {
  /** URL of the file to view */
  url: string;
  /** Optional title to display in viewer */
  title?: string;
  /** Children to render as the trigger */
  children: React.ReactNode;
  /** Additional class for the trigger wrapper */
  className?: string;
  /** Whether to disable the viewer (falls back to opening in new tab) */
  disabled?: boolean;
}

/**
 * Wrapper component that opens FileViewer when clicked
 */
export function FileViewerTrigger({
  url,
  title,
  children,
  className,
  disabled,
}: FileViewerTriggerProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  const handleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (disabled) {
      window.open(url, '_blank', 'noopener,noreferrer');
      return;
    }
    
    setIsOpen(true);
  }, [disabled, url]);
  
  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className={cn("cursor-pointer", className)}
      >
        {children}
      </button>
      
      <FileViewer
        url={url}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title={title}
      />
    </>
  );
}

/** Hook to manage file viewer state */
export function useFileViewer() {
  const [viewerState, setViewerState] = useState<{
    isOpen: boolean;
    url: string;
    title?: string;
    gallery?: string[];
    galleryIndex?: number;
  }>({
    isOpen: false,
    url: '',
  });
  
  const openFile = useCallback((url: string, title?: string) => {
    setViewerState({
      isOpen: true,
      url,
      title,
    });
  }, []);
  
  const openGallery = useCallback((urls: string[], startIndex: number = 0, title?: string) => {
    setViewerState({
      isOpen: true,
      url: urls[startIndex],
      title,
      gallery: urls,
      galleryIndex: startIndex,
    });
  }, []);
  
  const closeViewer = useCallback(() => {
    setViewerState(prev => ({ ...prev, isOpen: false }));
  }, []);
  
  const navigateGallery = useCallback((index: number) => {
    setViewerState(prev => {
      if (!prev.gallery) return prev;
      return {
        ...prev,
        url: prev.gallery[index],
        galleryIndex: index,
      };
    });
  }, []);
  
  return {
    ...viewerState,
    openFile,
    openGallery,
    closeViewer,
    navigateGallery,
  };
}
