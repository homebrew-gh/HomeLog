interface LogoProps {
  className?: string;
  alt?: string;
}

/**
 * Logo component using SVG that adapts to theme colors.
 * Uses CSS filters to colorize the dark gray SVG to match the current theme.
 * - Light mode: Dark version with theme-tinted appearance
 * - Dark mode: Inverted to light with neon glow effect
 */
export function Logo({ className = 'h-10 w-10', alt = 'Cypher Log' }: LogoProps) {
  return (
    <img 
      src="/logo-dark.svg" 
      alt={alt} 
      className={`${className} transition-all duration-200 dark:invert dark:brightness-110 dark:drop-shadow-[0_0_8px_hsl(var(--primary)/0.6)]`}
    />
  );
}
