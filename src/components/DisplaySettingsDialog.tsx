import { Check } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useUserPreferences, COLOR_THEMES, type ColorTheme } from '@/contexts/UserPreferencesContext';

interface DisplaySettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DisplaySettingsDialog({ isOpen, onClose }: DisplaySettingsDialogProps) {
  const { preferences, setColorTheme } = useUserPreferences();

  const handleColorSelect = (colorTheme: ColorTheme) => {
    setColorTheme(colorTheme);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Display Settings</DialogTitle>
          <DialogDescription>
            Customize the look and feel of your Cypher Log experience.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Color Theme Section */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Color Theme</Label>
            <p className="text-sm text-muted-foreground">
              Choose a color that suits your style. This will change the accent colors throughout the app.
            </p>
            
            <div className="grid grid-cols-3 gap-3 pt-2">
              {COLOR_THEMES.map((theme) => (
                <button
                  key={theme.id}
                  onClick={() => handleColorSelect(theme.id)}
                  className={cn(
                    "relative flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all hover:scale-105",
                    preferences.colorTheme === theme.id
                      ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                      : "border-border hover:border-primary/50 bg-card"
                  )}
                >
                  {/* Color Swatch */}
                  <div
                    className="w-10 h-10 rounded-full shadow-sm flex items-center justify-center"
                    style={{ backgroundColor: theme.color }}
                  >
                    {preferences.colorTheme === theme.id && (
                      <Check className="h-5 w-5 text-white" />
                    )}
                  </div>
                  
                  {/* Label */}
                  <span className="text-xs font-medium text-center">
                    {theme.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
