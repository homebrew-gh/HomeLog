import { useMemo } from 'react';
import { useUserPreferences } from '@/contexts/UserPreferencesContext';
import { DEFAULT_VEHICLE_TYPES } from '@/lib/types';

export function useVehicleTypes() {
  const { 
    preferences, 
    addCustomVehicleType, 
    removeCustomVehicleType,
    hideDefaultVehicleType,
    restoreDefaultVehicleType,
  } = useUserPreferences();

  // Ensure arrays are always defined with fallbacks
  const customVehicleTypes = preferences.customVehicleTypes || [];
  const hiddenDefaultVehicleTypes = preferences.hiddenDefaultVehicleTypes || [];

  // Get visible default types (excluding hidden ones)
  const visibleDefaultTypes = useMemo(() => {
    return DEFAULT_VEHICLE_TYPES.filter(type => !hiddenDefaultVehicleTypes.includes(type));
  }, [hiddenDefaultVehicleTypes]);

  // Combine and sort all visible types alphabetically
  const allVehicleTypes = useMemo(() => {
    return [...visibleDefaultTypes, ...customVehicleTypes].sort((a, b) =>
      a.toLowerCase().localeCompare(b.toLowerCase())
    );
  }, [visibleDefaultTypes, customVehicleTypes]);

  // Check if a type is a default type
  const isDefaultType = (type: string): boolean => {
    return DEFAULT_VEHICLE_TYPES.includes(type as typeof DEFAULT_VEHICLE_TYPES[number]);
  };

  // Remove a type (handles both custom and default types)
  const removeType = (type: string) => {
    if (isDefaultType(type)) {
      hideDefaultVehicleType(type);
    } else {
      removeCustomVehicleType(type);
    }
  };

  return {
    customVehicleTypes,
    hiddenDefaultVehicleTypes,
    visibleDefaultTypes,
    allVehicleTypes,
    addCustomVehicleType,
    removeCustomVehicleType,
    removeType,
    hideDefaultVehicleType,
    restoreDefaultVehicleType,
    isDefaultType,
  };
}
