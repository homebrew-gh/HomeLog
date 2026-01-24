import { useMemo } from 'react';
import { useUserPreferences } from '@/contexts/UserPreferencesContext';
import { DEFAULT_CONTRACTOR_TYPES } from '@/lib/types';

export function useContractorTypes() {
  const { 
    preferences, 
    addCustomContractorType, 
    removeCustomContractorType,
    hideDefaultContractorType,
    restoreDefaultContractorType,
  } = useUserPreferences();

  // Ensure arrays are always defined with fallbacks
  const customContractorTypes = preferences.customContractorTypes || [];
  const hiddenDefaultContractorTypes = preferences.hiddenDefaultContractorTypes || [];

  // Get visible default types (excluding hidden ones)
  const visibleDefaultTypes = useMemo(() => {
    return DEFAULT_CONTRACTOR_TYPES.filter(type => !hiddenDefaultContractorTypes.includes(type));
  }, [hiddenDefaultContractorTypes]);

  // Combine and sort all visible types alphabetically
  const allContractorTypes = useMemo(() => {
    return [...visibleDefaultTypes, ...customContractorTypes].sort((a, b) =>
      a.toLowerCase().localeCompare(b.toLowerCase())
    );
  }, [visibleDefaultTypes, customContractorTypes]);

  // Check if a type is a default type
  const isDefaultType = (type: string): boolean => {
    return DEFAULT_CONTRACTOR_TYPES.includes(type as typeof DEFAULT_CONTRACTOR_TYPES[number]);
  };

  // Remove a type (handles both custom and default types)
  const removeType = (type: string) => {
    if (isDefaultType(type)) {
      hideDefaultContractorType(type);
    } else {
      removeCustomContractorType(type);
    }
  };

  return {
    customContractorTypes,
    hiddenDefaultContractorTypes,
    visibleDefaultTypes,
    allContractorTypes,
    addCustomContractorType,
    removeCustomContractorType,
    removeType,
    hideDefaultContractorType,
    restoreDefaultContractorType,
    isDefaultType,
  };
}
