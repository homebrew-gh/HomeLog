// Re-export everything from the UserPreferencesContext for backward compatibility
export { 
  useTabPreferences,
  useUserPreferences,
  UserPreferencesProvider,
  AVAILABLE_TABS,
  type TabId, 
  type TabDefinition, 
  type UserPreferences,
} from '@/contexts/UserPreferencesContext';

// Export TabPreferences as an alias for backward compatibility
export type TabPreferences = {
  activeTabs: import('@/contexts/UserPreferencesContext').TabId[];
  activeTab: import('@/contexts/UserPreferencesContext').TabId;
};
