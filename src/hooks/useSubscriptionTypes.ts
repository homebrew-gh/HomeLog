import { useMemo } from 'react';
import { useUserPreferences } from '@/contexts/UserPreferencesContext';
import { DEFAULT_SUBSCRIPTION_TYPES } from '@/lib/types';

export function useSubscriptionTypes() {
  const { 
    preferences, 
    addCustomSubscriptionType, 
    removeCustomSubscriptionType,
    hideDefaultSubscriptionType,
    restoreDefaultSubscriptionType,
  } = useUserPreferences();

  // Ensure arrays are always defined with fallbacks
  const customSubscriptionTypes = preferences.customSubscriptionTypes || [];
  const hiddenDefaultSubscriptionTypes = preferences.hiddenDefaultSubscriptionTypes || [];

  // Get visible default types (excluding hidden ones)
  const visibleDefaultTypes = useMemo(() => {
    return DEFAULT_SUBSCRIPTION_TYPES.filter(type => !hiddenDefaultSubscriptionTypes.includes(type));
  }, [hiddenDefaultSubscriptionTypes]);

  // Combine and sort all visible types alphabetically
  const allSubscriptionTypes = useMemo(() => {
    return [...visibleDefaultTypes, ...customSubscriptionTypes].sort((a, b) =>
      a.toLowerCase().localeCompare(b.toLowerCase())
    );
  }, [visibleDefaultTypes, customSubscriptionTypes]);

  // Check if a type is a default type
  const isDefaultType = (type: string): boolean => {
    return DEFAULT_SUBSCRIPTION_TYPES.includes(type as typeof DEFAULT_SUBSCRIPTION_TYPES[number]);
  };

  // Remove a type (handles both custom and default types)
  const removeType = (type: string) => {
    if (isDefaultType(type)) {
      hideDefaultSubscriptionType(type);
    } else {
      removeCustomSubscriptionType(type);
    }
  };

  return {
    customSubscriptionTypes,
    hiddenDefaultSubscriptionTypes,
    visibleDefaultTypes,
    allSubscriptionTypes,
    addCustomSubscriptionType,
    removeCustomSubscriptionType,
    removeType,
    hideDefaultSubscriptionType,
    restoreDefaultSubscriptionType,
    isDefaultType,
  };
}
