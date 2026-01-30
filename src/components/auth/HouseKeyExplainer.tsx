import { Home, Shield, Users, KeyRound, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface HouseKeyExplainerProps {
  isOpen: boolean;
  onClose: () => void;
  onContinue: () => void;
}

/**
 * House Key Explainer Dialog
 * 
 * Educates users about the benefits of creating a dedicated "House Key" 
 * for Cypher Log instead of using their main social Nostr identity.
 */
export function HouseKeyExplainer({ isOpen, onClose, onContinue }: HouseKeyExplainerProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] sm:max-w-md max-h-[90dvh] p-0 gap-0 overflow-hidden rounded-2xl">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="text-xl font-semibold leading-tight tracking-tight text-center flex items-center justify-center gap-2">
            <Home className="h-6 w-6 text-primary" />
            Create Your House Key
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 pb-6 space-y-5 overflow-y-auto">
          {/* Hero section */}
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-primary/10 mb-4">
              <KeyRound className="h-10 w-10 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground">
              A House Key is a dedicated Nostr identity just for managing your home — separate from your social profile.
            </p>
          </div>

          {/* Benefits */}
          <div className="space-y-3">
            <div className="flex gap-3 p-3 rounded-lg bg-muted/50">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <Shield className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h4 className="text-sm font-medium">Security Buffer</h4>
                <p className="text-xs text-muted-foreground">
                  If your social profile key is ever compromised, your home data stays safe with a separate key.
                </p>
              </div>
            </div>

            <div className="flex gap-3 p-3 rounded-lg bg-muted/50">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h4 className="text-sm font-medium">Household Sharing</h4>
                <p className="text-xs text-muted-foreground">
                  Share access with family members without connecting anyone's social profiles to your home data.
                </p>
              </div>
            </div>

            <div className="flex gap-3 p-3 rounded-lg bg-muted/50">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <Home className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h4 className="text-sm font-medium">Privacy by Design</h4>
                <p className="text-xs text-muted-foreground">
                  Keep your home management separate from your social identity on other Nostr apps.
                </p>
              </div>
            </div>
          </div>

          {/* Tip box */}
          <div className="p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
            <div className="flex items-start gap-2">
              <span className="text-lg">💡</span>
              <div>
                <p className="text-xs text-amber-900 dark:text-amber-300">
                  <strong>Pro tip:</strong> Give your House Key a name like "Smith Family Home" so it's easy to identify. You can share the key file with your household members.
                </p>
              </div>
            </div>
          </div>

          {/* Action button */}
          <Button
            className="w-full h-12"
            onClick={onContinue}
          >
            Generate House Key
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>

          {/* Alternative option */}
          <div className="text-center">
            <button
              onClick={onClose}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
            >
              I'll use my existing Nostr key instead
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default HouseKeyExplainer;
