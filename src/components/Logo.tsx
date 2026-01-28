interface LogoProps {
  className?: string;
  alt?: string;
}

/**
 * Logo component that automatically switches between light and dark mode versions.
 * - Light mode: /logo.png (metallic gray on light background) - scaled up 150% to match dark logo size
 * - Dark mode: /logo-dark.png (glowing metallic on dark background)
 */
export function Logo({ className = 'h-10 w-10', alt = 'Cypher Log' }: LogoProps) {
  return (
    <>
      {/* Light mode logo - scaled up 150% because the source image has more padding */}
      <img 
        src="/logo.png" 
        alt={alt} 
        className={`${className} dark:hidden scale-150`}
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
