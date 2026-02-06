import { useState, useEffect } from 'react';
import { HardDrive, Check, X, AlertTriangle, Info, Database, Shield, Settings, LogOut } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useToast } from '@/hooks/useToast';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { 
  INDEXED_DB_DATABASES,
  getAppLocalStorageKeys,
  formatBytes,
  LOGOUT_ON_CLOSE_KEY,
} from '@/hooks/usePersistentStorage';
import { logger } from '@/lib/logger';

interface StorageSettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

interface StorageEstimate {
  usage: number;
  quota: number;
  persisted: boolean;
}

export function StorageSettingsDialog({ isOpen, onClose }: StorageSettingsDialogProps) {
  const { toast } = useToast();
  const { user } = useCurrentUser();
  
  // Store the user's preference for persistent storage
  const [persistentStorageEnabled, setPersistentStorageEnabled] = useLocalStorage<boolean>(
    'cypherlog:persistent-storage-preference',
    false
  );
  
  // Store the user's preference for logout on browser close
  const [logoutOnClose, setLogoutOnClose] = useLocalStorage<boolean>(
    LOGOUT_ON_CLOSE_KEY,
    false
  );
  
  // Current storage state
  const [storageEstimate, setStorageEstimate] = useState<StorageEstimate | null>(null);
  const [isRequestingPersistence, setIsRequestingPersistence] = useState(false);
  const [persistenceSupported, setPersistenceSupported] = useState(true);
  const [showStorageDetails, setShowStorageDetails] = useState(false);
  const [appStorageKeys, setAppStorageKeys] = useState<string[]>([]);
  
  // Check current storage status when dialog opens
  useEffect(() => {
    if (isOpen) {
      if (navigator.storage) {
        checkStorageStatus();
      }
      // Get list of app storage keys
      setAppStorageKeys(getAppLocalStorageKeys());
    }
  }, [isOpen]);
  
  const checkStorageStatus = async () => {
    try {
      // Check if Storage API is available
      if (!navigator.storage || !navigator.storage.persist) {
        setPersistenceSupported(false);
        return;
      }
      
      // Get current persisted status
      const persisted = await navigator.storage.persisted();
      
      // Get storage estimate
      const estimate = await navigator.storage.estimate();
      
      setStorageEstimate({
        usage: estimate.usage || 0,
        quota: estimate.quota || 0,
        persisted,
      });
      
      // Sync local preference with actual state
      if (persisted && !persistentStorageEnabled) {
        setPersistentStorageEnabled(true);
      }
    } catch (error) {
      logger.error('Failed to check storage status:', error);
      setPersistenceSupported(false);
    }
  };
  
  const handleTogglePersistence = async (enabled: boolean) => {
    if (!navigator.storage || !navigator.storage.persist) {
      toast({
        title: 'Not Supported',
        description: 'Your browser does not support persistent storage.',
        variant: 'destructive',
      });
      return;
    }
    
    if (enabled) {
      setIsRequestingPersistence(true);
      try {
        const granted = await navigator.storage.persist();
        
        if (granted) {
          setPersistentStorageEnabled(true);
          setStorageEstimate(prev => prev ? { ...prev, persisted: true } : null);
          toast({
            title: 'Persistent Storage Enabled',
            description: 'Your data will be protected from automatic browser cleanup.',
          });
        } else {
          toast({
            title: 'Permission Denied',
            description: 'Your browser did not grant persistent storage. This may be due to browser settings or low engagement with this site.',
            variant: 'destructive',
          });
        }
      } catch (error) {
        logger.error('Failed to request persistent storage:', error);
        toast({
          title: 'Error',
          description: 'Failed to request persistent storage permission.',
          variant: 'destructive',
        });
      } finally {
        setIsRequestingPersistence(false);
      }
    } else {
      // User is opting out - we can only track their preference
      // Note: There's no API to "un-persist" storage, but we track the preference
      setPersistentStorageEnabled(false);
      toast({
        title: 'Preference Updated',
        description: 'Your preference has been saved. Note: Already-persisted storage cannot be reverted via browser API.',
      });
    }
  };
  
  const usagePercentage = storageEstimate 
    ? Math.round((storageEstimate.usage / storageEstimate.quota) * 100)
    : 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HardDrive className="h-5 w-5 text-sky-600" />
            Browser Storage Settings
          </DialogTitle>
          <DialogDescription>
            Control how your browser stores Home Log data locally.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* What is Persistent Storage - Info Section */}
          <Alert className="border-sky-200 bg-sky-50 dark:border-sky-800 dark:bg-sky-950">
            <Info className="h-4 w-4 text-sky-600" />
            <AlertDescription className="text-sm space-y-2">
              <p>
                <strong>What is Persistent Storage?</strong>
              </p>
              <p>
                Your browser stores Home Log data locally (in IndexedDB) to cache your information and improve performance. 
                By default, browsers may automatically clear this data when storage space is low, which could result in 
                you needing to re-sync your data from Nostr relays.
              </p>
              <p>
                <strong>Persistent storage</strong> tells your browser to protect Home Log's data from automatic cleanup. 
                When enabled, your cached data will only be deleted if you manually clear your browser data.
              </p>
            </AlertDescription>
          </Alert>

          <Separator />

          {!persistenceSupported ? (
            <Alert variant="destructive" className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-sm text-amber-800 dark:text-amber-200">
                Your browser does not support the Storage API. Persistent storage settings are not available.
              </AlertDescription>
            </Alert>
          ) : (
            <>
              {/* Current Storage Status */}
              {storageEstimate && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Current Storage Status
                  </h3>
                  
                  <div className="p-3 rounded-lg bg-slate-100 dark:bg-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600 dark:text-slate-400">Status</span>
                      {storageEstimate.persisted ? (
                        <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                          <Check className="h-3 w-3 mr-1" />
                          Persistent
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300">
                          <X className="h-3 w-3 mr-1" />
                          Not Persistent
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600 dark:text-slate-400">Storage Used</span>
                      <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                        {formatBytes(storageEstimate.usage)} of {formatBytes(storageEstimate.quota)} ({usagePercentage}%)
                      </span>
                    </div>
                    
                    {/* Progress bar */}
                    <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-sky-500 rounded-full transition-all"
                        style={{ width: `${Math.min(usagePercentage, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              )}

              <Separator />

              {/* Persistent Storage Toggle */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Storage Preference
                </h3>
                
                <div className={`rounded-lg border p-4 transition-colors ${
                  storageEstimate?.persisted 
                    ? 'border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/50' 
                    : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800'
                }`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <HardDrive className={`h-4 w-4 ${storageEstimate?.persisted ? 'text-green-600' : 'text-slate-400'}`} />
                        <span className="font-medium text-slate-800 dark:text-slate-200">
                          Enable Persistent Storage
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Protect your cached data from automatic browser cleanup. Your data will remain available 
                        even when your browser is low on storage space.
                      </p>
                    </div>
                    <Switch
                      checked={storageEstimate?.persisted || persistentStorageEnabled}
                      onCheckedChange={handleTogglePersistence}
                      disabled={isRequestingPersistence || storageEstimate?.persisted}
                    />
                  </div>
                  
                  {storageEstimate?.persisted && (
                    <p className="text-xs text-green-600 dark:text-green-400 mt-2">
                      Persistent storage is already enabled for this site.
                    </p>
                  )}
                </div>
              </div>

              <Separator />

              {/* Session Security */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Session Security
                </h3>
                
                <div className={`rounded-lg border p-4 transition-colors ${
                  logoutOnClose 
                    ? 'border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/50' 
                    : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800'
                }`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <LogOut className={`h-4 w-4 ${logoutOnClose ? 'text-amber-600' : 'text-slate-400'}`} />
                        <span className="font-medium text-slate-800 dark:text-slate-200">
                          Logout When Browser Closes
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Automatically log out when you close all browser tabs/windows. 
                        This is useful on shared computers to prevent others from accessing your account.
                      </p>
                    </div>
                    <Switch
                      checked={logoutOnClose}
                      onCheckedChange={(checked) => {
                        setLogoutOnClose(checked);
                        toast({
                          title: checked ? 'Logout on Close Enabled' : 'Logout on Close Disabled',
                          description: checked 
                            ? 'You will be logged out when you close the browser.'
                            : 'Your login session will persist across browser restarts.',
                        });
                      }}
                    />
                  </div>
                  
                  {logoutOnClose && (
                    <Alert className="mt-3 border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/50">
                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                      <AlertDescription className="text-xs text-amber-700 dark:text-amber-300">
                        {user 
                          ? "You'll need to log in again when you reopen the browser."
                          : "This will take effect once you log in."}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </div>

              {/* What's Stored Section */}
              <Collapsible open={showStorageDetails} onOpenChange={setShowStorageDetails}>
                <CollapsibleTrigger className="w-full flex items-center justify-between p-3 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                  <div className="flex items-center gap-2">
                    <Database className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      What's Being Stored?
                    </span>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {showStorageDetails ? 'Hide' : 'Show'} Details
                  </Badge>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-3 space-y-3">
                  {/* Safe Data */}
                  <div className="rounded-lg border border-green-200 dark:border-green-800 p-3 bg-green-50/50 dark:bg-green-950/30">
                    <div className="flex items-center gap-2 mb-2">
                      <Shield className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium text-green-700 dark:text-green-300">
                        Safe Data (Preferences Only)
                      </span>
                    </div>
                    <ul className="text-xs text-green-600 dark:text-green-400 space-y-1 ml-6">
                      <li>• Theme and display preferences</li>
                      <li>• Widget order and layout</li>
                      <li>• Relay configuration</li>
                      <li>• Encryption toggles (on/off settings)</li>
                      <li>• Cached Nostr events (already encrypted)</li>
                    </ul>
                  </div>

                  {/* Sensitive Data Info */}
                  <div className="rounded-lg border border-amber-200 dark:border-amber-800 p-3 bg-amber-50/50 dark:bg-amber-950/30">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                      <span className="text-sm font-medium text-amber-700 dark:text-amber-300">
                        Connection Data
                      </span>
                    </div>
                    <ul className="text-xs text-amber-600 dark:text-amber-400 space-y-1 ml-6">
                      <li>• Wallet connection strings (NWC)</li>
                      <li>• Login session state</li>
                    </ul>
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 ml-6">
                      Note: Your private key is never stored. It stays in your signer (extension/app).
                    </p>
                  </div>

                  {/* IndexedDB Info */}
                  <div className="rounded-lg border border-sky-200 dark:border-sky-800 p-3 bg-sky-50/50 dark:bg-sky-950/30">
                    <div className="flex items-center gap-2 mb-2">
                      <Settings className="h-4 w-4 text-sky-600" />
                      <span className="text-sm font-medium text-sky-700 dark:text-sky-300">
                        Cached Databases (IndexedDB)
                      </span>
                    </div>
                    <ul className="text-xs text-sky-600 dark:text-sky-400 space-y-1 ml-6">
                      <li>• <code className="bg-sky-100 dark:bg-sky-900 px-1 rounded">{INDEXED_DB_DATABASES.EVENT_CACHE}</code> - Cached events for fast loading</li>
                      <li>• <code className="bg-sky-100 dark:bg-sky-900 px-1 rounded">{INDEXED_DB_DATABASES.DM_MESSAGES}</code> - Cached direct messages</li>
                    </ul>
                    <p className="text-xs text-sky-600 dark:text-sky-400 mt-2 ml-6">
                      These contain encrypted data that can only be read with your private key.
                    </p>
                  </div>

                  {/* Current Keys */}
                  {appStorageKeys.length > 0 && (
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      <p className="mb-1">Active localStorage keys ({appStorageKeys.length}):</p>
                      <div className="flex flex-wrap gap-1">
                        {appStorageKeys.slice(0, 10).map(key => (
                          <Badge key={key} variant="outline" className="text-[10px] font-mono">
                            {key.length > 25 ? key.slice(0, 25) + '...' : key}
                          </Badge>
                        ))}
                        {appStorageKeys.length > 10 && (
                          <Badge variant="outline" className="text-[10px]">
                            +{appStorageKeys.length - 10} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                </CollapsibleContent>
              </Collapsible>

              {/* Additional Info */}
              <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1">
                <p>
                  <strong>Note:</strong> Your actual data (appliances, vehicles, etc.) is stored encrypted on 
                  Nostr relays. Local storage is only used for caching and preferences.
                </p>
                <p>
                  Some browsers automatically grant persistent storage to sites you use frequently or have 
                  installed as a PWA (Progressive Web App).
                </p>
              </div>
            </>
          )}

          {/* Close Button */}
          <div className="flex justify-end pt-2">
            <Button onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
