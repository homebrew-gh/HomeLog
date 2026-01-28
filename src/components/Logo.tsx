import { useTheme } from '@/hooks/useTheme';

interface LogoProps {
  className?: string;
  alt?: string;
}

/**
 * Logo component that automatically switches between light and dark mode versions.
 * - Light mode: /logo.png (metallic gray on light background)
 * - Dark mode: /logo-dark.png (glowing metallic on dark background)
 */
export function Logo({ className = 'h-10 w-10', alt = 'Cypher Log' }: LogoProps) {
  const { theme } = useTheme();
  
  // Determine which logo to show based on theme
  // For 'system' theme, we need to check the actual applied theme
  const isDark = theme === 'dark' || 
    (theme === 'system' && typeof window !== 'undefined' && 
     window.matchMedia('(prefers-color-scheme: dark)').matches);
  
  const logoSrc = isDark ? '/logo-dark.png' : '/logo.png';
  
  return (
    <>
      {/* Light mode logo */}
      <img 
        src="/logo.png" 
        alt={alt} 
        className={`${className} dark:hidden`}
      />
      {/* Dark mode logo */}
      <img 
        src="/logo-dark.png" 
        alt={alt} 
        className={`${className} hidden dark:block`}
      />
    </>
  );
}
