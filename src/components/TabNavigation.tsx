import { useState, useRef } from 'react';
import { 
  Home, 
  Plus, 
  Package, 
  Wrench, 
  Car, 
  CreditCard, 
  Shield, 
  Users, 
  FolderKanban,
  X,
  Pencil,
  Check,
  AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { useTabPreferences, type TabId } from '@/hooks/useTabPreferences';
import { useAllTabsData, type TabDataInfo } from '@/hooks/useTabData';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Home,
  Package,
  Wrench,
  Car,
  CreditCard,
  Shield,
  Users,
  FolderKanban,
  Plus,
};

interface TabNavigationProps {
  onAddTabClick: () => void;
}

export function TabNavigation({ onAddTabClick }: TabNavigationProps) {
  const { preferences, setActiveTab, removeTab, reorderTabs, getTabDefinition } = useTabPreferences();
  const tabsData = useAllTabsData(preferences.activeTabs);
  
  const [isEditMode, setIsEditMode] = useState(false);
  const [draggedTab, setDraggedTab] = useState<TabId | null>(null);
  const [dragOverTab, setDragOverTab] = useState<TabId | null>(null);
  const [warningDialog, setWarningDialog] = useState<{ open: boolean; tabId: TabId | null; dataInfo: TabDataInfo | null }>({
    open: false,
    tabId: null,
    dataInfo: null,
  });
  const dragCounter = useRef(0);

  // Build the full tab list: Home first, then active tabs, then +
  const allTabs: (TabId | 'add')[] = ['home', ...preferences.activeTabs, 'add'];

  const handleRemoveTab = (tabId: TabId) => {
    const dataInfo = tabsData[tabId];
    
    if (dataInfo?.hasData) {
      // Show warning dialog - can't delete tab with data
      setWarningDialog({ open: true, tabId, dataInfo });
    } else {
      // No data, safe to remove
      removeTab(tabId);
    }
  };

  const handleDragStart = (e: React.DragEvent, tabId: TabId) => {
    if (tabId === 'home' || !isEditMode) return; // Can't drag home or when not in edit mode
    setDraggedTab(tabId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', tabId);
  };

  const handleDragEnd = () => {
    setDraggedTab(null);
    setDragOverTab(null);
    dragCounter.current = 0;
  };

  const handleDragEnter = (e: React.DragEvent, tabId: TabId) => {
    e.preventDefault();
    if (tabId === 'home' || tabId === draggedTab || !isEditMode) return;
    dragCounter.current++;
    setDragOverTab(tabId);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setDragOverTab(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetTabId: TabId) => {
    e.preventDefault();
    if (!draggedTab || targetTabId === 'home' || draggedTab === targetTabId || !isEditMode) return;

    const currentTabs = [...preferences.activeTabs];
    const draggedIndex = currentTabs.indexOf(draggedTab);
    const targetIndex = currentTabs.indexOf(targetTabId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    // Remove dragged item and insert at target position
    currentTabs.splice(draggedIndex, 1);
    currentTabs.splice(targetIndex, 0, draggedTab);

    reorderTabs(currentTabs);
    handleDragEnd();
  };

  // Get wiggle animation class based on tab index
  const getWiggleClass = (index: number) => {
    const wiggleClasses = [
      'animate-wiggle animate-wiggle-1',
      'animate-wiggle animate-wiggle-2',
      'animate-wiggle animate-wiggle-3',
      'animate-wiggle animate-wiggle-4',
      'animate-wiggle animate-wiggle-5',
      'animate-wiggle animate-wiggle-6',
      'animate-wiggle animate-wiggle-7',
    ];
    return wiggleClasses[index % wiggleClasses.length];
  };

  return (
    <>
      <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm border-b border-sky-200 dark:border-slate-700">
        <div className="container mx-auto px-4">
          <nav className="flex items-center gap-1 py-2 overflow-x-auto scrollbar-hide">
            {allTabs.map((tabId, index) => {
              if (tabId === 'add') {
                return (
                  <Button
                    key="add"
                    variant="ghost"
                    size="sm"
                    onClick={onAddTabClick}
                    className={cn(
                      "flex-shrink-0 gap-1.5 px-3 py-2 h-auto rounded-lg",
                      "text-sky-600 dark:text-sky-400 hover:bg-sky-100 dark:hover:bg-slate-800",
                      "border border-dashed border-sky-300 dark:border-sky-700",
                      "transition-all duration-200 hover:border-sky-400 dark:hover:border-sky-600"
                    )}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                );
              }

              const tab = getTabDefinition(tabId);
              if (!tab) return null;

              const IconComponent = ICON_MAP[tab.icon] || Home;
              const isActive = preferences.activeTab === tabId;
              const isHome = tabId === 'home';
              const isDragging = draggedTab === tabId;
              const isDragOver = dragOverTab === tabId;
              const hasData = !isHome && tabsData[tabId]?.hasData;
              const canEdit = !isHome && isEditMode;

              return (
                <div
                  key={tabId}
                  className={cn(
                    "relative flex-shrink-0",
                    isDragging && "opacity-50",
                    canEdit && getWiggleClass(index)
                  )}
                  draggable={canEdit}
                  onDragStart={(e) => handleDragStart(e, tabId)}
                  onDragEnd={handleDragEnd}
                  onDragEnter={(e) => handleDragEnter(e, tabId)}
                  onDragLeave={handleDragLeave}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, tabId)}
                >
                  {/* Drop indicator */}
                  {isDragOver && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-0.5 h-8 bg-sky-500 rounded-full" />
                  )}

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => !isEditMode && setActiveTab(tabId)}
                    className={cn(
                      "flex-shrink-0 gap-1.5 px-3 py-2 h-auto rounded-lg transition-all duration-200",
                      isActive
                        ? "bg-sky-100 dark:bg-sky-900/50 text-sky-700 dark:text-sky-300 shadow-sm"
                        : "text-slate-600 dark:text-slate-400 hover:bg-sky-50 dark:hover:bg-slate-800",
                      canEdit && "cursor-grab active:cursor-grabbing"
                    )}
                  >
                    <IconComponent className="h-4 w-4" />
                    <span className="text-sm font-medium">{tab.label}</span>
                  </Button>

                  {/* Remove button - only visible in edit mode for non-home tabs */}
                  {canEdit && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveTab(tabId);
                      }}
                      className={cn(
                        "absolute -top-1.5 -left-1.5 p-0.5 rounded-full",
                        "bg-red-500 text-white shadow-sm",
                        "hover:bg-red-600 transition-colors",
                        hasData && "bg-amber-500 hover:bg-amber-600"
                      )}
                      title={hasData ? "Cannot remove - section contains data" : "Remove section"}
                    >
                      <X className="h-3.5 w-3.5" strokeWidth={2.5} />
                    </button>
                  )}
                </div>
              );
            })}

            {/* Spacer to push edit button to the right */}
            <div className="flex-grow" />

            {/* Edit/Done button */}
            {preferences.activeTabs.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditMode(!isEditMode)}
                className={cn(
                  "flex-shrink-0 gap-1.5 px-3 py-2 h-auto rounded-lg ml-2",
                  "transition-all duration-200",
                  isEditMode
                    ? "bg-sky-600 text-white hover:bg-sky-700"
                    : "text-slate-500 dark:text-slate-400 hover:bg-sky-50 dark:hover:bg-slate-800 hover:text-sky-600 dark:hover:text-sky-400"
                )}
              >
                {isEditMode ? (
                  <>
                    <Check className="h-4 w-4" />
                    <span className="text-sm font-medium">Done</span>
                  </>
                ) : (
                  <Pencil className="h-4 w-4" />
                )}
              </Button>
            )}
          </nav>
        </div>
      </div>

      {/* Warning Dialog - Cannot delete tab with data */}
      <AlertDialog 
        open={warningDialog.open} 
        onOpenChange={(open) => setWarningDialog({ open, tabId: null, dataInfo: null })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="h-5 w-5" />
              Cannot Remove Section
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              {warningDialog.dataInfo && (
                <>
                  This section contains{' '}
                  <span className="font-semibold text-slate-700 dark:text-slate-200">
                    {warningDialog.dataInfo.count} {warningDialog.dataInfo.count === 1 
                      ? warningDialog.dataInfo.itemName 
                      : warningDialog.dataInfo.itemNamePlural}
                  </span>
                  . To remove this section, you must first delete all {warningDialog.dataInfo.itemNamePlural} within it.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction className="bg-sky-600 hover:bg-sky-700 text-white">
              Got it
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
