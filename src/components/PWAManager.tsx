import { useState, useEffect, useCallback } from 'react';
import { WifiOff, RefreshCw, X, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * PWAManager - Handles PWA-specific features
 * 
 * Features:
 * - Offline status indicator
 * - App update notification
 * - Install prompt (Add to Home Screen)
 */
export function PWAManager() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [showUpdateBanner, setShowUpdateBanner] = useState(false);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  // Handle online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Expose handler for index.html script
    (window as WindowWithPWA).handleOnlineStatus = (online: boolean) => {
      setIsOffline(!online);
    };

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Handle update notification from service worker
  useEffect(() => {
    (window as WindowWithPWA).showUpdateNotification = () => {
      setShowUpdateBanner(true);
    };

    return () => {
      delete (window as WindowWithPWA).showUpdateNotification;
    };
  }, []);

  // Handle install prompt (beforeinstallprompt event)
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      
      // Show install prompt after a delay (don't interrupt initial experience)
      const hasSeenPrompt = localStorage.getItem('homelog-install-prompt-seen');
      if (!hasSeenPrompt) {
        setTimeout(() => {
          setShowInstallPrompt(true);
        }, 30000); // Show after 30 seconds
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Check if app was installed
    window.addEventListener('appinstalled', () => {
      setDeferredPrompt(null);
      setShowInstallPrompt(false);
      localStorage.setItem('homelog-install-prompt-seen', 'installed');
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  // Handle app update
  const handleUpdate = useCallback(() => {
    // Tell service worker to skip waiting
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
    }
    // Reload the page
    window.location.reload();
  }, []);

  // Handle install prompt
  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('[PWA] App installed');
    }
    
    setDeferredPrompt(null);
    setShowInstallPrompt(false);
    localStorage.setItem('homelog-install-prompt-seen', 'true');
  }, [deferredPrompt]);

  // Dismiss install prompt
  const dismissInstallPrompt = useCallback(() => {
    setShowInstallPrompt(false);
    localStorage.setItem('homelog-install-prompt-seen', 'true');
  }, []);

  return (
    <>
      {/* Offline Indicator */}
      <div
        className={cn(
          'fixed top-0 left-0 right-0 z-[100] flex items-center justify-center gap-2 py-2 px-4 text-sm font-medium transition-transform duration-300',
          'bg-amber-500 text-white',
          isOffline ? 'translate-y-0' : '-translate-y-full'
        )}
      >
        <WifiOff className="h-4 w-4" />
        <span>You're offline. Some features may be limited.</span>
      </div>

      {/* Update Banner */}
      {showUpdateBanner && (
        <div className="fixed bottom-4 left-4 right-4 z-[100] mx-auto max-w-md animate-in slide-in-from-bottom-4">
          <div className="flex items-center gap-3 rounded-lg bg-sky-600 p-4 text-white shadow-lg">
            <RefreshCw className="h-5 w-5 shrink-0" />
            <div className="flex-1">
              <p className="font-medium">Update Available</p>
              <p className="text-sm text-sky-100">A new version of Home Log is ready.</p>
            </div>
            <Button
              size="sm"
              variant="secondary"
              onClick={handleUpdate}
              className="shrink-0"
            >
              Update
            </Button>
            <button
              onClick={() => setShowUpdateBanner(false)}
              className="shrink-0 rounded p-1 hover:bg-sky-500"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Install Prompt */}
      {showInstallPrompt && deferredPrompt && (
        <div className="fixed bottom-4 left-4 right-4 z-[100] mx-auto max-w-md animate-in slide-in-from-bottom-4">
          <div className="flex items-center gap-3 rounded-lg bg-slate-800 dark:bg-slate-700 p-4 text-white shadow-lg">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sky-600">
              <Download className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="font-medium">Install Home Log</p>
              <p className="text-sm text-slate-300">Add to your home screen for quick access.</p>
            </div>
            <Button
              size="sm"
              onClick={handleInstall}
              className="shrink-0 bg-sky-600 hover:bg-sky-700"
            >
              Install
            </Button>
            <button
              onClick={dismissInstallPrompt}
              className="shrink-0 rounded p-1 hover:bg-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}

// Type definitions for PWA events
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface WindowWithPWA extends Window {
  handleOnlineStatus?: (online: boolean) => void;
  showUpdateNotification?: () => void;
}
