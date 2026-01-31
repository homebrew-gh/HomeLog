import { useState, useEffect, useCallback } from 'react';
import { Lock, Unlock, Shield, AlertTriangle, RotateCcw, Eye, EyeOff, Search, CheckCircle2, XCircle, Loader2, Wifi, ChevronDown, ChevronRight } from 'lucide-react';
import { useNostr } from '@nostrify/react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useAppContext } from '@/hooks/useAppContext';
import { 
  useEncryptionSettings, 
  CATEGORY_INFO, 
  type EncryptableCategory,
  type CategoryRelayConfig,
  type EncryptionSettings,
} from '@/contexts/EncryptionContext';
import { APPLIANCE_KIND, VEHICLE_KIND, MAINTENANCE_KIND, PET_KIND } from '@/lib/types';

interface EncryptionSettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const CATEGORY_ORDER: EncryptableCategory[] = [
  'appliances',
  'vehicles',
  'maintenance',
  'warranties',
  'subscriptions',
  'pets',
  'companies',
  'projects',
];

// Encrypted content marker
const ENCRYPTED_MARKER = 'nip44:';

// Type for verification state
interface VerificationState {
  status: 'idle' | 'searching' | 'found' | 'decrypting' | 'success' | 'error' | 'no-data';
  rawContent?: string;
  decryptedContent?: string;
  eventKind?: number;
  eventId?: string;
  errorMessage?: string;
}

export function EncryptionSettingsDialog({ isOpen, onClose }: EncryptionSettingsDialogProps) {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const { config } = useAppContext();
  const { 
    settings: savedSettings, 
    categoryRelayConfig: savedCategoryRelayConfig,
    setEncryptionEnabled: persistEncryptionEnabled, 
    resetToDefaults: persistResetToDefaults,
    setRelayEnabledForCategory: persistRelayEnabledForCategory,
    isPrivateRelay,
  } = useEncryptionSettings();

  // Local state for editing - only saved when user clicks Save
  const [localSettings, setLocalSettings] = useState<EncryptionSettings>(savedSettings);
  const [localCategoryRelayConfig, setLocalCategoryRelayConfig] = useState<CategoryRelayConfig>(savedCategoryRelayConfig);

  // Trust but Verify state
  const [verifyState, setVerifyState] = useState<VerificationState>({ status: 'idle' });
  const [showDecrypted, setShowDecrypted] = useState(false);
  
  // Track which categories have their relay list expanded
  const [expandedCategories, setExpandedCategories] = useState<Set<EncryptableCategory>>(new Set());

  // Sync local state when dialog opens or saved settings change
  useEffect(() => {
    if (isOpen) {
      setLocalSettings(savedSettings);
      setLocalCategoryRelayConfig(savedCategoryRelayConfig);
    }
  }, [isOpen, savedSettings, savedCategoryRelayConfig]);

  // Local setters that update local state only
  const setEncryptionEnabled = useCallback((category: EncryptableCategory, enabled: boolean) => {
    setLocalSettings(prev => ({
      ...prev,
      [category]: enabled,
    }));
  }, []);

  const isRelayEnabledForCategory = useCallback((category: EncryptableCategory, relayUrl: string): boolean => {
    const categoryConfig = localCategoryRelayConfig[category];
    if (categoryConfig && relayUrl in categoryConfig) {
      return categoryConfig[relayUrl];
    }
    // Default: all relays are enabled
    return true;
  }, [localCategoryRelayConfig]);

  const setRelayEnabledForCategory = useCallback((category: EncryptableCategory, relayUrl: string, enabled: boolean) => {
    setLocalCategoryRelayConfig(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [relayUrl]: enabled,
      },
    }));
  }, []);

  const resetToDefaults = useCallback(() => {
    setLocalSettings({
      appliances: true,
      vehicles: true,
      maintenance: true,
      subscriptions: true,
      warranties: true,
      companies: true,
      projects: true,
      pets: true,
    });
    setLocalCategoryRelayConfig({
      appliances: {},
      vehicles: {},
      maintenance: {},
      subscriptions: {},
      warranties: {},
      companies: {},
      projects: {},
      pets: {},
    });
  }, []);

  // Save all settings to persistent storage
  const handleSave = useCallback(() => {
    // Save encryption settings
    CATEGORY_ORDER.forEach(category => {
      if (localSettings[category] !== savedSettings[category]) {
        persistEncryptionEnabled(category, localSettings[category]);
      }
    });

    // Save relay settings for each category
    CATEGORY_ORDER.forEach(category => {
      const localConfig = localCategoryRelayConfig[category];
      const savedConfig = savedCategoryRelayConfig[category];
      
      // Save any changed relay settings
      Object.entries(localConfig).forEach(([relayUrl, enabled]) => {
        if (savedConfig[relayUrl] !== enabled) {
          persistRelayEnabledForCategory(category, relayUrl, enabled);
        }
      });
    });

    onClose();
  }, [localSettings, localCategoryRelayConfig, savedSettings, savedCategoryRelayConfig, persistEncryptionEnabled, persistRelayEnabledForCategory, onClose]);

  // Use local settings for display
  const settings = localSettings;

  const encryptedCount = Object.values(settings).filter(Boolean).length;
  const totalCount = Object.keys(settings).length;

  // Get relays from config, sorted with private relays first
  const allRelays = config.relayMetadata.relays
    .filter(r => r.write) // Only show relays that can write
    .map(r => r.url)
    .sort((a, b) => {
      const aIsPrivate = isPrivateRelay(a);
      const bIsPrivate = isPrivateRelay(b);
      if (aIsPrivate && !bIsPrivate) return -1;
      if (!aIsPrivate && bIsPrivate) return 1;
      return 0;
    });

  const toggleCategoryExpanded = (category: EncryptableCategory) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  };

  // Helper to render relay URL nicely
  const renderRelayUrl = (url: string): string => {
    try {
      const parsed = new URL(url);
      if (parsed.protocol === 'wss:') {
        return parsed.pathname === '/' ? parsed.host : parsed.host + parsed.pathname;
      }
      return parsed.href;
    } catch {
      return url;
    }
  };

  // Count enabled relays for a category
  const getEnabledRelayCount = (category: EncryptableCategory): number => {
    return allRelays.filter(url => isRelayEnabledForCategory(category, url)).length;
  };

  // Find an encrypted event from relays
  const findEncryptedEvent = async () => {
    if (!user?.pubkey) return;

    setVerifyState({ status: 'searching' });
    setShowDecrypted(false);

    try {
      // Query for encrypted events (appliances, vehicles, maintenance, pets)
      const events = await nostr.query(
        [
          { kinds: [APPLIANCE_KIND, VEHICLE_KIND, MAINTENANCE_KIND, PET_KIND], authors: [user.pubkey], limit: 50 },
        ],
        { signal: AbortSignal.timeout(5000) }
      );

      // Find all events with encrypted content, then pick one at random
      const encryptedEvents = events.filter(e => e.content && e.content.startsWith(ENCRYPTED_MARKER));
      const encryptedEvent = encryptedEvents.length > 0 
        ? encryptedEvents[Math.floor(Math.random() * encryptedEvents.length)]
        : undefined;

      if (encryptedEvent) {
        setVerifyState({
          status: 'found',
          rawContent: encryptedEvent.content,
          eventKind: encryptedEvent.kind,
          eventId: encryptedEvent.id.slice(0, 16) + '...',
        });
      } else {
        setVerifyState({
          status: 'no-data',
          errorMessage: 'No encrypted data found on your relays. Try adding some data with encryption enabled first.',
        });
      }
    } catch (error) {
      setVerifyState({
        status: 'error',
        errorMessage: error instanceof Error ? error.message : 'Failed to query relays',
      });
    }
  };

  // Decrypt the found content
  const decryptContent = async () => {
    if (!user?.signer?.nip44 || !verifyState.rawContent) return;

    setVerifyState(prev => ({ ...prev, status: 'decrypting' }));

    try {
      // Remove marker and decrypt
      const encryptedData = verifyState.rawContent.slice(ENCRYPTED_MARKER.length);
      const decrypted = await user.signer.nip44.decrypt(user.pubkey, encryptedData);
      
      // Pretty print JSON if possible
      let formatted = decrypted;
      try {
        const parsed = JSON.parse(decrypted);
        formatted = JSON.stringify(parsed, null, 2);
      } catch {
        // Not JSON, keep as-is
      }

      setVerifyState(prev => ({
        ...prev,
        status: 'success',
        decryptedContent: formatted,
      }));
      setShowDecrypted(true);
    } catch (error) {
      setVerifyState(prev => ({
        ...prev,
        status: 'error',
        errorMessage: error instanceof Error ? error.message : 'Failed to decrypt content',
      }));
    }
  };

  // Get kind label
  const getKindLabel = (kind?: number) => {
    switch (kind) {
      case APPLIANCE_KIND: return 'Appliance';
      case VEHICLE_KIND: return 'Vehicle';
      case MAINTENANCE_KIND: return 'Maintenance';
      case PET_KIND: return 'Pet';
      default: return 'Event';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-sky-600" />
            Data Encryption Settings
          </DialogTitle>
          <DialogDescription>
            All data categories are encrypted by default with NIP-44. You can turn encryption off per category if desired. Encrypted data can only be read by you.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Status Overview */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-slate-100 dark:bg-slate-800">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-sky-600" />
              <span className="text-sm font-medium">
                {encryptedCount} of {totalCount} categories encrypted
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={resetToDefaults}
              className="text-xs"
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              Reset to Defaults
            </Button>
          </div>

          {/* Info Alert */}
          <Alert className="border-sky-200 bg-sky-50 dark:border-sky-800 dark:bg-sky-950">
            <Shield className="h-4 w-4 text-sky-600" />
            <AlertDescription className="text-sm">
              Encrypted data uses NIP-44 encryption. Only your private key can decrypt it. 
              Your signer (Amber, extension, etc.) will handle encryption automatically.
            </AlertDescription>
          </Alert>

          <Separator />

          {/* Category Settings */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Data Categories
            </h3>

            {CATEGORY_ORDER.map((category) => {
              const info = CATEGORY_INFO[category];
              const isEnabled = settings[category];
              const isExpanded = expandedCategories.has(category);
              const enabledRelayCount = getEnabledRelayCount(category);
              
              return (
                <div
                  key={category}
                  className={`rounded-lg border transition-colors ${
                    isEnabled 
                      ? 'border-sky-200 bg-sky-50/50 dark:border-sky-800 dark:bg-sky-950/50' 
                      : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800'
                  }`}
                >
                  {/* Category Header */}
                  <div className="flex items-start justify-between p-3">
                    <div className="flex-1 min-w-0 mr-4">
                      <div className="flex items-center gap-2 mb-1">
                        {isEnabled ? (
                          <Lock className="h-4 w-4 text-sky-600 flex-shrink-0" />
                        ) : (
                          <Unlock className="h-4 w-4 text-slate-400 flex-shrink-0" />
                        )}
                        <span className="font-medium text-slate-800 dark:text-slate-200">
                          {info.label}
                        </span>
                        {info.recommendEncryption ? (
                          <Badge variant="secondary" className="text-xs bg-sky-100 text-sky-700 dark:bg-sky-900 dark:text-sky-300">
                            Recommended
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">
                            Shareable
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {info.description}
                      </p>
                    </div>
                    <Switch
                      checked={isEnabled}
                      onCheckedChange={(checked) => setEncryptionEnabled(category, checked)}
                      className="flex-shrink-0"
                    />
                  </div>

                  {/* Relay List Collapsible */}
                  <Collapsible open={isExpanded} onOpenChange={() => toggleCategoryExpanded(category)}>
                    <CollapsibleTrigger className="w-full flex items-center justify-between px-3 py-2 border-t border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <Wifi className="h-3 w-3" />
                        <span>Publishing to {enabledRelayCount} of {allRelays.length} relays</span>
                      </div>
                      {isExpanded ? (
                        <ChevronDown className="h-3 w-3 text-slate-400" />
                      ) : (
                        <ChevronRight className="h-3 w-3 text-slate-400" />
                      )}
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="px-3 pb-3 space-y-1.5">
                        {/* Private relay recommendation */}
                        {allRelays.some(url => isPrivateRelay(url)) && (
                          <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1 pb-1">
                            <Shield className="h-3 w-3" />
                            Private relays are prioritized for sensitive data
                          </p>
                        )}
                        
                        {allRelays.length === 0 ? (
                          <p className="text-xs text-slate-400 dark:text-slate-500 py-2">
                            No write-enabled relays configured
                          </p>
                        ) : (
                          allRelays.map(relayUrl => {
                            const isRelayEnabled = isRelayEnabledForCategory(category, relayUrl);
                            const isPrivate = isPrivateRelay(relayUrl);
                            
                            return (
                              <div
                                key={relayUrl}
                                className={`flex items-center justify-between py-1.5 px-2 rounded text-xs ${
                                  isPrivate 
                                    ? 'bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50' 
                                    : 'bg-slate-50 dark:bg-slate-800/50'
                                }`}
                              >
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                  <Wifi className={`h-3 w-3 flex-shrink-0 ${
                                    isRelayEnabled 
                                      ? isPrivate ? 'text-amber-500' : 'text-green-500'
                                      : 'text-slate-300 dark:text-slate-600'
                                  }`} />
                                  <span className={`font-mono truncate ${
                                    isRelayEnabled 
                                      ? 'text-slate-600 dark:text-slate-300' 
                                      : 'text-slate-400 dark:text-slate-500'
                                  }`} title={relayUrl}>
                                    {renderRelayUrl(relayUrl)}
                                  </span>
                                  {isPrivate && (
                                    <Badge variant="secondary" className="text-[10px] px-1 py-0 bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300">
                                      Private
                                    </Badge>
                                  )}
                                </div>
                                <Switch
                                  checked={isRelayEnabled}
                                  onCheckedChange={(checked) => setRelayEnabledForCategory(category, relayUrl, checked)}
                                  className="scale-75 flex-shrink-0"
                                />
                              </div>
                            );
                          })
                        )}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </div>
              );
            })}
          </div>

          <Separator />

          {/* Warning for unencrypted data */}
          {Object.values(settings).some((v) => !v) && (
            <Alert variant="destructive" className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-sm text-amber-800 dark:text-amber-200">
                Some data categories are unencrypted. This data will be visible to anyone 
                who can read your relays.
              </AlertDescription>
            </Alert>
          )}

          {/* Note about existing data */}
          <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1">
            <p>
              <strong>Note:</strong> Changing these settings affects new data only. 
              Existing data will remain in its current format until edited.
            </p>
            <p>
              Encrypted data cannot be searched or filtered at the relay level.
            </p>
          </div>

          <Separator />

          {/* Trust but Verify Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <Eye className="h-4 w-4 text-sky-600" />
              Trust but Verify
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Fetch encrypted data from your relays and manually decrypt it to verify your data is truly encrypted.
            </p>

            {/* Action buttons based on state */}
            {verifyState.status === 'idle' && (
              <Button
                variant="outline"
                size="sm"
                onClick={findEncryptedEvent}
                disabled={!user}
                className="w-full border-sky-200 hover:bg-sky-50 dark:border-sky-800 dark:hover:bg-sky-900"
              >
                <Search className="h-4 w-4 mr-2" />
                Find Encrypted Data
              </Button>
            )}

            {verifyState.status === 'searching' && (
              <div className="flex items-center justify-center gap-2 py-4 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Searching relays for encrypted data...
              </div>
            )}

            {verifyState.status === 'no-data' && (
              <div className="space-y-3">
                <Alert className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-sm text-amber-800 dark:text-amber-200">
                    {verifyState.errorMessage}
                  </AlertDescription>
                </Alert>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setVerifyState({ status: 'idle' })}
                  className="w-full"
                >
                  Try Again
                </Button>
              </div>
            )}

            {verifyState.status === 'error' && (
              <div className="space-y-3">
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertDescription className="text-sm">
                    {verifyState.errorMessage}
                  </AlertDescription>
                </Alert>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setVerifyState({ status: 'idle' })}
                  className="w-full"
                >
                  Try Again
                </Button>
              </div>
            )}

            {(verifyState.status === 'found' || verifyState.status === 'decrypting' || verifyState.status === 'success') && (
              <div className="space-y-3">
                {/* Event info */}
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <Badge variant="secondary" className="text-xs">
                    {getKindLabel(verifyState.eventKind)}
                  </Badge>
                  <span>Event ID: {verifyState.eventId}</span>
                </div>

                {/* Raw encrypted content */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                    <Lock className="h-3 w-3" />
                    Raw Encrypted Data (from relay)
                  </label>
                  <ScrollArea className="h-24 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-2">
                    <code className="text-xs text-slate-600 dark:text-slate-400 break-all font-mono">
                      {verifyState.rawContent}
                    </code>
                  </ScrollArea>
                </div>

                {/* Decrypt button */}
                {verifyState.status === 'found' && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={decryptContent}
                    disabled={!user?.signer?.nip44}
                    className="w-full bg-sky-600 hover:bg-sky-700"
                  >
                    <Unlock className="h-4 w-4 mr-2" />
                    Decrypt with Your Key
                  </Button>
                )}

                {verifyState.status === 'decrypting' && (
                  <div className="flex items-center justify-center gap-2 py-2 text-sm text-slate-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Decrypting...
                  </div>
                )}

                {/* Decrypted content */}
                {verifyState.status === 'success' && verifyState.decryptedContent && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-green-600 dark:text-green-400 flex items-center gap-1.5">
                        <CheckCircle2 className="h-3 w-3" />
                        Decrypted Content
                      </label>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowDecrypted(!showDecrypted)}
                        className="h-6 px-2 text-xs"
                      >
                        {showDecrypted ? (
                          <>
                            <EyeOff className="h-3 w-3 mr-1" />
                            Hide
                          </>
                        ) : (
                          <>
                            <Eye className="h-3 w-3 mr-1" />
                            Show
                          </>
                        )}
                      </Button>
                    </div>
                    {showDecrypted && (
                      <ScrollArea className="h-32 rounded-md border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30 p-2">
                        <pre className="text-xs text-green-700 dark:text-green-300 whitespace-pre-wrap font-mono">
                          {verifyState.decryptedContent}
                        </pre>
                      </ScrollArea>
                    )}
                    <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/50">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <AlertDescription className="text-sm text-green-800 dark:text-green-200">
                        Your data is encrypted! Only your private key can decrypt it.
                      </AlertDescription>
                    </Alert>
                  </div>
                )}

                {/* Reset button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setVerifyState({ status: 'idle' });
                    setShowDecrypted(false);
                  }}
                  className="w-full"
                >
                  <RotateCcw className="h-3 w-3 mr-2" />
                  Start Over
                </Button>
              </div>
            )}

            {!user && (
              <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-2">
                Log in to verify your encrypted data
              </p>
            )}
          </div>

          {/* Save Button */}
          <div className="flex justify-end pt-2">
            <Button onClick={handleSave}>
              Save
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
