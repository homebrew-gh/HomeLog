import { useUserPreferences, type ColorTheme } from '@/contexts/UserPreferencesContext';
import { useTheme } from '@/hooks/useTheme';

interface LogoProps {
  className?: string;
  alt?: string;
}

// Map of theme colors to their logo image paths
const LOGO_PATHS: Record<ColorTheme, { light: string; dark: string }> = {
  blue: { light: '/logo-blue-light.webp', dark: '/logo-blue-dark.webp' },
  orange: { light: '/logo-orange-light.webp', dark: '/logo-orange-dark.webp' },
  green: { light: '/logo-green-light.webp', dark: '/logo-green-dark.webp' },
  red: { light: '/logo-red-light.webp', dark: '/logo-red-dark.webp' },
  pink: { light: '/logo-pink-light.webp', dark: '/logo-pink-dark.webp' },
  purple: { light: '/logo-purple-light.webp', dark: '/logo-purple-dark.webp' },
};

/**
 * Logo component with theme-specific cyberpunk neon styling.
 * Displays the appropriate logo based on the current color theme and dark/light mode.
 */
export function Logo({ className = 'h-10 w-10', alt = 'Cypher Log' }: LogoProps) {
  const { preferences } = useUserPreferences();
  const { theme } = useTheme();
  
  const colorTheme = preferences.colorTheme || 'purple';
  const isDark = theme === 'dark';
  
  const logoPath = LOGO_PATHS[colorTheme]?.[isDark ? 'dark' : 'light'] || LOGO_PATHS.purple.dark;

  return (
    <img 
      src={logoPath} 
      alt={alt} 
      className={`${className} transition-all duration-200`}
    />
  );
}
