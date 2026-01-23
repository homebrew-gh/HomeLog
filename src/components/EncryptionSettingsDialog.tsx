import { Lock, Unlock, Shield, AlertTriangle, RotateCcw } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  useEncryptionSettings, 
  CATEGORY_INFO, 
  type EncryptableCategory 
} from '@/contexts/EncryptionContext';

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
  'contractors',
  'projects',
];

export function EncryptionSettingsDialog({ isOpen, onClose }: EncryptionSettingsDialogProps) {
  const { 
    settings, 
    setEncryptionEnabled, 
    resetToDefaults 
  } = useEncryptionSettings();

  const encryptedCount = Object.values(settings).filter(Boolean).length;
  const totalCount = Object.keys(settings).length;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-sky-600" />
            Data Encryption Settings
          </DialogTitle>
          <DialogDescription>
            Choose which data categories to encrypt with NIP-44. Encrypted data can only be read by you.
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
              
              return (
                <div
                  key={category}
                  className={`flex items-start justify-between p-3 rounded-lg border transition-colors ${
                    isEnabled 
                      ? 'border-sky-200 bg-sky-50/50 dark:border-sky-800 dark:bg-sky-950/50' 
                      : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800'
                  }`}
                >
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
              );
            })}
          </div>

          <Separator />

          {/* Warning for unencrypted sensitive data */}
          {(!settings.appliances || !settings.vehicles || !settings.maintenance) && (
            <Alert variant="destructive" className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-sm text-amber-800 dark:text-amber-200">
                Some sensitive data categories are unencrypted. This data will be visible to anyone 
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

          {/* Close Button */}
          <div className="flex justify-end pt-2">
            <Button onClick={onClose}>
              Done
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
