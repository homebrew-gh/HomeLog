interface LogoProps {
  className?: string;
  alt?: string;
}

/**
 * Logo component with cyberpunk neon styling.
 * Uses a single image that works on both light and dark backgrounds.
 * - Light mode: Slightly reduced brightness to blend with light backgrounds
 * - Dark mode: Full neon glow effect
 */
export function Logo({ className = 'h-10 w-10', alt = 'Cypher Log' }: LogoProps) {
  return (
    <img 
      src="/logo-cyber.png" 
      alt={alt} 
      className={`${className} transition-all duration-200 brightness-75 dark:brightness-100 dark:drop-shadow-[0_0_12px_hsl(var(--primary)/0.5)]`}
    />
  );
}
