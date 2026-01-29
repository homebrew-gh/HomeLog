import { useMemo } from 'react';
import { useUserPreferences } from '@/contexts/UserPreferencesContext';
import { DEFAULT_PET_TYPES } from '@/lib/types';

export function usePetTypes() {
  const { 
    preferences, 
    addCustomPetType, 
    removeCustomPetType,
    hideDefaultPetType,
    restoreDefaultPetType,
  } = useUserPreferences();

  // Ensure arrays are always defined with fallbacks
  const customPetTypes = preferences.customPetTypes || [];
  const hiddenDefaultPetTypes = preferences.hiddenDefaultPetTypes || [];

  // Get visible default types (excluding hidden ones)
  const visibleDefaultTypes = useMemo(() => {
    return DEFAULT_PET_TYPES.filter(type => !hiddenDefaultPetTypes.includes(type));
  }, [hiddenDefaultPetTypes]);

  // Combine and sort all visible types alphabetically
  const allPetTypes = useMemo(() => {
    return [...visibleDefaultTypes, ...customPetTypes].sort((a, b) =>
      a.toLowerCase().localeCompare(b.toLowerCase())
    );
  }, [visibleDefaultTypes, customPetTypes]);

  // Check if a type is a default type
  const isDefaultType = (type: string): boolean => {
    return DEFAULT_PET_TYPES.includes(type as typeof DEFAULT_PET_TYPES[number]);
  };

  // Remove a type (handles both custom and default types)
  const removeType = (type: string) => {
    if (isDefaultType(type)) {
      hideDefaultPetType(type);
    } else {
      removeCustomPetType(type);
    }
  };

  return {
    customPetTypes,
    hiddenDefaultPetTypes,
    visibleDefaultTypes,
    allPetTypes,
    addCustomPetType,
    removeCustomPetType,
    removeType,
    hideDefaultPetType,
    restoreDefaultPetType,
    isDefaultType,
  };
}
