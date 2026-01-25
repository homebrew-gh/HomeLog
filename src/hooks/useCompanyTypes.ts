import { useMemo } from 'react';
import { useUserPreferences } from '@/contexts/UserPreferencesContext';
import { DEFAULT_COMPANY_TYPES } from '@/lib/types';

export function useCompanyTypes() {
  const { 
    preferences, 
    addCustomCompanyType, 
    removeCustomCompanyType,
    hideDefaultCompanyType,
    restoreDefaultCompanyType,
  } = useUserPreferences();

  // Ensure arrays are always defined with fallbacks
  const customCompanyTypes = preferences.customCompanyTypes || [];
  const hiddenDefaultCompanyTypes = preferences.hiddenDefaultCompanyTypes || [];

  // Get visible default types (excluding hidden ones)
  const visibleDefaultTypes = useMemo(() => {
    return DEFAULT_COMPANY_TYPES.filter(type => !hiddenDefaultCompanyTypes.includes(type));
  }, [hiddenDefaultCompanyTypes]);

  // Combine and sort all visible types alphabetically
  const allCompanyTypes = useMemo(() => {
    return [...visibleDefaultTypes, ...customCompanyTypes].sort((a, b) =>
      a.toLowerCase().localeCompare(b.toLowerCase())
    );
  }, [visibleDefaultTypes, customCompanyTypes]);

  // Check if a type is a default type
  const isDefaultType = (type: string): boolean => {
    return DEFAULT_COMPANY_TYPES.includes(type as typeof DEFAULT_COMPANY_TYPES[number]);
  };

  // Remove a type (handles both custom and default types)
  const removeType = (type: string) => {
    if (isDefaultType(type)) {
      hideDefaultCompanyType(type);
    } else {
      removeCustomCompanyType(type);
    }
  };

  return {
    customCompanyTypes,
    hiddenDefaultCompanyTypes,
    visibleDefaultTypes,
    allCompanyTypes,
    addCustomCompanyType,
    removeCustomCompanyType,
    removeType,
    hideDefaultCompanyType,
    restoreDefaultCompanyType,
    isDefaultType,
  };
}
