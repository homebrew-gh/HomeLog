import { Shield, Globe, Lock, ExternalLink } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { RelayListManager } from '@/components/RelayListManager';

interface RelayManagementDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function RelayManagementDialog({ isOpen, onClose }: RelayManagementDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] sm:max-w-lg max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Relays</DialogTitle>
        </DialogHeader>

        <div className="py-4 space-y-6">
          {/* Public Relays Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-sky-600" />
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Public Relays
              </h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Nostr relays are servers that store and distribute your data. Add or remove relays to control where your appliance and maintenance data is saved.
            </p>
            
            <RelayListManager />
          </div>

          <Separator />

          {/* Private Relays Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-amber-600" />
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Private Relays
              </h3>
            </div>

            <Alert className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/50">
              <Shield className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-sm text-amber-800 dark:text-amber-200">
                <strong>Recommended for sensitive data:</strong> While Home Log encrypts your private data with NIP-44, using a private relay adds an extra layer of security. Private relays restrict who can read and write data, ensuring your encrypted information isn't stored on public servers.
              </AlertDescription>
            </Alert>

            <div className="rounded-lg border border-dashed border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/30 p-4 space-y-3">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                To use a private relay:
              </p>
              <ol className="text-sm text-slate-600 dark:text-slate-400 list-decimal list-inside space-y-1.5">
                <li>Set up your own relay or use a paid private relay service</li>
                <li>Add the relay URL in the Public Relays section above</li>
                <li>Configure it for both read and write access</li>
                <li>Optionally disable write access on public relays</li>
              </ol>
              
              <div className="pt-2">
                <p className="text-xs text-slate-500 dark:text-slate-500">
                  Popular private relay options:
                </p>
                <div className="flex flex-wrap gap-2 mt-2">
                  <a 
                    href="https://relay.tools" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-amber-700 dark:text-amber-400 hover:underline"
                  >
                    relay.tools
                    <ExternalLink className="h-3 w-3" />
                  </a>
                  <span className="text-slate-300 dark:text-slate-600">•</span>
                  <a 
                    href="https://github.com/hoytech/strfry" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-amber-700 dark:text-amber-400 hover:underline"
                  >
                    strfry (self-hosted)
                    <ExternalLink className="h-3 w-3" />
                  </a>
                  <span className="text-slate-300 dark:text-slate-600">•</span>
                  <a 
                    href="https://github.com/nostr-relay/nostr-relay" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-amber-700 dark:text-amber-400 hover:underline"
                  >
                    nostr-relay (self-hosted)
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
