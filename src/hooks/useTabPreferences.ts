import { useLocalStorage } from './useLocalStorage';

export type TabId = 
  | 'home'
  | 'appliances'
  | 'maintenance'
  | 'vehicles'
  | 'subscriptions'
  | 'warranties'
  | 'contractors'
  | 'projects';

export interface TabDefinition {
  id: TabId;
  label: string;
  icon: string; // Lucide icon name
  description: string;
}

export const AVAILABLE_TABS: TabDefinition[] = [
  { id: 'appliances', label: 'Appliances', icon: 'Package', description: 'Track home appliances and equipment' },
  { id: 'maintenance', label: 'Home Maintenance', icon: 'Wrench', description: 'Schedule and track maintenance tasks' },
  { id: 'vehicles', label: 'Vehicles', icon: 'Car', description: 'Manage vehicle information and maintenance' },
  { id: 'subscriptions', label: 'Subscriptions', icon: 'CreditCard', description: 'Track recurring subscriptions and payments' },
  { id: 'warranties', label: 'Warranties', icon: 'Shield', description: 'Store warranty information and expiration dates' },
  { id: 'contractors', label: 'Contractors/Services', icon: 'Users', description: 'Keep contact info for service providers' },
  { id: 'projects', label: 'Projects', icon: 'FolderKanban', description: 'Plan and track home improvement projects' },
];

export interface TabPreferences {
  activeTabs: TabId[]; // Ordered list of active tabs (excluding 'home' which is always first)
  activeTab: TabId;
}

const DEFAULT_PREFERENCES: TabPreferences = {
  activeTabs: [],
  activeTab: 'home',
};

export function useTabPreferences() {
  const [preferences, setPreferences] = useLocalStorage<TabPreferences>(
    'homelog-tab-preferences',
    DEFAULT_PREFERENCES
  );

  const addTab = (tabId: TabId) => {
    if (tabId === 'home' || preferences.activeTabs.includes(tabId)) return;
    
    setPreferences({
      ...preferences,
      activeTabs: [...preferences.activeTabs, tabId],
      activeTab: tabId,
    });
  };

  const addTabs = (tabIds: TabId[]) => {
    const newTabs = tabIds.filter(
      id => id !== 'home' && !preferences.activeTabs.includes(id)
    );
    if (newTabs.length === 0) return;

    setPreferences({
      ...preferences,
      activeTabs: [...preferences.activeTabs, ...newTabs],
      activeTab: newTabs[0],
    });
  };

  const removeTab = (tabId: TabId) => {
    if (tabId === 'home') return;
    
    const newActiveTabs = preferences.activeTabs.filter(id => id !== tabId);
    const newActiveTab = preferences.activeTab === tabId ? 'home' : preferences.activeTab;
    
    setPreferences({
      ...preferences,
      activeTabs: newActiveTabs,
      activeTab: newActiveTab,
    });
  };

  const setActiveTab = (tabId: TabId) => {
    setPreferences({
      ...preferences,
      activeTab: tabId,
    });
  };

  const reorderTabs = (newOrder: TabId[]) => {
    // Filter out 'home' from the new order since it's always first
    const filteredOrder = newOrder.filter(id => id !== 'home');
    setPreferences({
      ...preferences,
      activeTabs: filteredOrder,
    });
  };

  const getTabDefinition = (tabId: TabId): TabDefinition | undefined => {
    if (tabId === 'home') {
      return { id: 'home', label: 'Home', icon: 'Home', description: 'Overview of all your tracked items' };
    }
    return AVAILABLE_TABS.find(tab => tab.id === tabId);
  };

  const getAvailableTabs = (): TabDefinition[] => {
    return AVAILABLE_TABS.filter(tab => !preferences.activeTabs.includes(tab.id));
  };

  return {
    preferences,
    addTab,
    addTabs,
    removeTab,
    setActiveTab,
    reorderTabs,
    getTabDefinition,
    getAvailableTabs,
  };
}
