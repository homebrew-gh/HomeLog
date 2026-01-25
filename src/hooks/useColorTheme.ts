import { useEffect } from 'react';
import { useUserPreferences, type ColorTheme } from '@/contexts/UserPreferencesContext';

/**
 * Hook to apply the user's color theme preference to the document root.
 * This should be called once near the root of the app to ensure the theme
 * classes are applied correctly.
 */
export function useApplyColorTheme(): ColorTheme {
  const { preferences } = useUserPreferences();
  const colorTheme = preferences.colorTheme;

  useEffect(() => {
    const root = window.document.documentElement;

    // Remove all existing theme classes
    root.classList.remove(
      'theme-blue',
      'theme-orange',
      'theme-green',
      'theme-red',
      'theme-pink',
      'theme-purple'
    );

    // Add the current theme class
    root.classList.add(`theme-${colorTheme}`);
  }, [colorTheme]);

  return colorTheme;
}
