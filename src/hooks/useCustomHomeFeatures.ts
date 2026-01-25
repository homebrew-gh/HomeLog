import { useMemo } from 'react';
import { useUserPreferences } from '@/contexts/UserPreferencesContext';
import { DEFAULT_HOME_FEATURES } from '@/lib/types';

export function useCustomHomeFeatures() {
  const { 
    preferences, 
    addCustomHomeFeature, 
    removeCustomHomeFeature,
    hideDefaultHomeFeature,
    restoreDefaultHomeFeature,
  } = useUserPreferences();

  // Ensure arrays are always defined with fallbacks
  const customHomeFeatures = preferences.customHomeFeatures || [];
  const hiddenDefaultHomeFeatures = preferences.hiddenDefaultHomeFeatures || [];

  // Get visible default home features (excluding hidden ones)
  const visibleDefaultHomeFeatures = useMemo(() => {
    return DEFAULT_HOME_FEATURES.filter(feature => !hiddenDefaultHomeFeatures.includes(feature));
  }, [hiddenDefaultHomeFeatures]);

  // Combine and sort all visible home features alphabetically
  const allHomeFeatures = useMemo(() => {
    return [...visibleDefaultHomeFeatures, ...customHomeFeatures].sort((a, b) =>
      a.toLowerCase().localeCompare(b.toLowerCase())
    );
  }, [visibleDefaultHomeFeatures, customHomeFeatures]);

  // Check if a home feature is a default home feature
  const isDefaultHomeFeature = (feature: string): boolean => {
    return DEFAULT_HOME_FEATURES.includes(feature as typeof DEFAULT_HOME_FEATURES[number]);
  };

  // Remove a home feature (handles both custom and default home features)
  const removeHomeFeature = (feature: string) => {
    if (isDefaultHomeFeature(feature)) {
      hideDefaultHomeFeature(feature);
    } else {
      removeCustomHomeFeature(feature);
    }
  };

  return {
    customHomeFeatures,
    hiddenDefaultHomeFeatures,
    visibleDefaultHomeFeatures,
    allHomeFeatures,
    addCustomHomeFeature,
    removeCustomHomeFeature,
    removeHomeFeature,
    hideDefaultHomeFeature,
    restoreDefaultHomeFeature,
    isDefaultHomeFeature,
  };
}
