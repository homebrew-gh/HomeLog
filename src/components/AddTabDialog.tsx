import { useState } from 'react';
import { 
  Package, 
  Wrench, 
  Car, 
  CreditCard, 
  Shield, 
  Users, 
  FolderKanban,
  PawPrint,
  Check
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useTabPreferences, type TabId, type TabDefinition } from '@/hooks/useTabPreferences';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Package,
  Wrench,
  Car,
  CreditCard,
  Shield,
  Users,
  FolderKanban,
  PawPrint,
};

interface AddTabDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AddTabDialog({ isOpen, onClose }: AddTabDialogProps) {
  const { getAvailableTabs, addTabs } = useTabPreferences();
  const [selectedTabs, setSelectedTabs] = useState<Set<TabId>>(new Set());

  const availableTabs = getAvailableTabs();

  const toggleTab = (tabId: TabId) => {
    setSelectedTabs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(tabId)) {
        newSet.delete(tabId);
      } else {
        newSet.add(tabId);
      }
      return newSet;
    });
  };

  const handleAdd = () => {
    if (selectedTabs.size > 0) {
      addTabs(Array.from(selectedTabs));
      setSelectedTabs(new Set());
      onClose();
    }
  };

  const handleClose = () => {
    setSelectedTabs(new Set());
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sky-700 dark:text-sky-300">
            Add Sections
          </DialogTitle>
          <DialogDescription>
            Select one or more sections to add to your dashboard. You can reorder them by dragging after adding.
          </DialogDescription>
        </DialogHeader>

        {availableTabs.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            <p>All sections have already been added!</p>
          </div>
        ) : (
          <div className="grid gap-3 py-4">
            {availableTabs.map((tab) => (
              <TabOption
                key={tab.id}
                tab={tab}
                isSelected={selectedTabs.has(tab.id)}
                onToggle={() => toggleTab(tab.id)}
              />
            ))}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleAdd}
            disabled={selectedTabs.size === 0}
            className="bg-sky-600 hover:bg-sky-700 text-white"
          >
            Add {selectedTabs.size > 0 ? `(${selectedTabs.size})` : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface TabOptionProps {
  tab: TabDefinition;
  isSelected: boolean;
  onToggle: () => void;
}

function TabOption({ tab, isSelected, onToggle }: TabOptionProps) {
  const IconComponent = ICON_MAP[tab.icon] || Package;

  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all duration-200",
        "hover:shadow-md",
        isSelected
          ? "border-sky-500 bg-sky-50 dark:bg-sky-900/30 shadow-sm"
          : "border-slate-200 dark:border-slate-700 hover:border-sky-300 dark:hover:border-sky-700"
      )}
    >
      <div className={cn(
        "flex items-center justify-center w-12 h-12 rounded-lg transition-colors",
        isSelected
          ? "bg-sky-500 text-white"
          : "bg-sky-100 dark:bg-sky-900 text-sky-600 dark:text-sky-400"
      )}>
        <IconComponent className="h-6 w-6" />
      </div>

      <div className="flex-1 min-w-0">
        <h3 className={cn(
          "font-semibold transition-colors",
          isSelected
            ? "text-sky-700 dark:text-sky-300"
            : "text-slate-700 dark:text-slate-200"
        )}>
          {tab.label}
        </h3>
        <p className="text-sm text-muted-foreground truncate">
          {tab.description}
        </p>
      </div>

      <div className={cn(
        "flex items-center justify-center w-6 h-6 rounded-full border-2 transition-all",
        isSelected
          ? "border-sky-500 bg-sky-500 text-white"
          : "border-slate-300 dark:border-slate-600"
      )}>
        {isSelected && <Check className="h-4 w-4" />}
      </div>
    </button>
  );
}
