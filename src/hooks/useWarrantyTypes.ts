import { useMemo } from 'react';
import { useUserPreferences } from '@/contexts/UserPreferencesContext';
import { DEFAULT_WARRANTY_TYPES } from '@/lib/types';

export function useWarrantyTypes() {
  const { 
    preferences, 
    addCustomWarrantyType, 
    removeCustomWarrantyType,
    hideDefaultWarrantyType,
    restoreDefaultWarrantyType,
  } = useUserPreferences();

  // Ensure arrays are always defined with fallbacks
  const customWarrantyTypes = preferences.customWarrantyTypes || [];
  const hiddenDefaultWarrantyTypes = preferences.hiddenDefaultWarrantyTypes || [];

  // Get visible default types (excluding hidden ones)
  const visibleDefaultTypes = useMemo(() => {
    return DEFAULT_WARRANTY_TYPES.filter(type => !hiddenDefaultWarrantyTypes.includes(type));
  }, [hiddenDefaultWarrantyTypes]);

  // Combine and sort all visible types alphabetically
  const allWarrantyTypes = useMemo(() => {
    return [...visibleDefaultTypes, ...customWarrantyTypes].sort((a, b) =>
      a.toLowerCase().localeCompare(b.toLowerCase())
    );
  }, [visibleDefaultTypes, customWarrantyTypes]);

  // Check if a type is a default type
  const isDefaultType = (type: string): boolean => {
    return DEFAULT_WARRANTY_TYPES.includes(type as typeof DEFAULT_WARRANTY_TYPES[number]);
  };

  // Remove a type (handles both custom and default types)
  const removeType = (type: string) => {
    if (isDefaultType(type)) {
      hideDefaultWarrantyType(type);
    } else {
      removeCustomWarrantyType(type);
    }
  };

  return {
    customWarrantyTypes,
    hiddenDefaultWarrantyTypes,
    visibleDefaultTypes,
    allWarrantyTypes,
    addCustomWarrantyType,
    removeCustomWarrantyType,
    removeType,
    hideDefaultWarrantyType,
    restoreDefaultWarrantyType,
    isDefaultType,
  };
}
