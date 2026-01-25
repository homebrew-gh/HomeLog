import { cn } from '@/lib/utils';

interface LoadingAnimationProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  message?: string;
  subMessage?: string;
}

/**
 * LoadingAnimation - A hammer hitting a nail animation
 * 
 * Default loading animation for the site, matching the home/construction theme.
 * The hammer swings down to strike a nail in a board.
 */
export function LoadingAnimation({ 
  className, 
  size = 'md',
  message,
  subMessage,
}: LoadingAnimationProps) {
  const sizeClasses = {
    sm: 'w-24 h-24',
    md: 'w-36 h-36',
    lg: 'w-48 h-48',
  };

  const containerClasses = {
    sm: 'py-8',
    md: 'py-16',
    lg: 'py-24',
  };

  return (
    <div className={cn("flex flex-col items-center justify-center", containerClasses[size], className)}>
      <div className={cn("relative", sizeClasses[size])}>
        {/* SVG Animation Container */}
        <svg 
          viewBox="0 0 120 120" 
          className="w-full h-full overflow-visible"
          aria-label="Loading animation"
        >
          {/* Wood Board - at bottom */}
          <rect 
            x="10" 
            y="95" 
            width="60" 
            height="12" 
            rx="2"
            className="fill-amber-600 dark:fill-amber-700"
          />
          {/* Wood grain lines */}
          <line x1="15" y1="99" x2="65" y2="99" className="stroke-amber-800/30 dark:stroke-amber-900/40" strokeWidth="0.5" />
          <line x1="15" y1="103" x2="65" y2="103" className="stroke-amber-800/30 dark:stroke-amber-900/40" strokeWidth="0.5" />
          
          {/* Nail - sticking up from the board, gets driven in on impact */}
          <g className="animate-nail-drive">
            {/* Nail body */}
            <rect 
              x="38" 
              y="72" 
              width="4" 
              height="25" 
              className="fill-slate-400 dark:fill-slate-500"
            />
            {/* Nail head - flat top */}
            <rect 
              x="35" 
              y="68" 
              width="10" 
              height="5" 
              rx="1"
              className="fill-slate-500 dark:fill-slate-400"
            />
            {/* Nail tip - goes into the board */}
            <polygon 
              points="38,97 42,97 40,105" 
              className="fill-slate-400 dark:fill-slate-500"
            />
          </g>
          
          {/* Hammer image - swings to hit the nail */}
          {/* Pivot point at bottom of handle where hand would grip */}
          <g className="origin-[85px_90px] animate-hammer-swing">
            <image
              href="/hammer.webp"
              x="45"
              y="5"
              width="55"
              height="85"
              style={{ transform: 'rotate(-15deg)', transformOrigin: '72px 47px' }}
            />
          </g>
          
          {/* Impact effect - appears when hammer strikes nail */}
          <g className="animate-impact-flash">
            {/* Central flash */}
            <circle cx="40" cy="68" r="12" className="fill-yellow-400/60 dark:fill-yellow-300/40" />
            {/* Spark lines radiating from impact */}
            <line x1="28" y1="62" x2="20" y2="54" className="stroke-yellow-500 dark:stroke-yellow-400" strokeWidth="2" strokeLinecap="round" />
            <line x1="52" y1="62" x2="60" y2="54" className="stroke-yellow-500 dark:stroke-yellow-400" strokeWidth="2" strokeLinecap="round" />
            <line x1="30" y1="78" x2="22" y2="86" className="stroke-amber-500 dark:stroke-amber-400" strokeWidth="2" strokeLinecap="round" />
            <line x1="50" y1="78" x2="58" y2="86" className="stroke-amber-500 dark:stroke-amber-400" strokeWidth="2" strokeLinecap="round" />
            {/* Small sparks */}
            <circle cx="22" cy="58" r="2" className="fill-yellow-300 dark:fill-yellow-200" />
            <circle cx="58" cy="58" r="2" className="fill-yellow-300 dark:fill-yellow-200" />
            <circle cx="32" cy="52" r="1.5" className="fill-orange-400 dark:fill-orange-300" />
            <circle cx="48" cy="52" r="1.5" className="fill-orange-400 dark:fill-orange-300" />
          </g>
        </svg>
      </div>
      
      {/* Optional text messages */}
      {message && (
        <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mt-4 mb-2">
          {message}
        </h2>
      )}
      {subMessage && (
        <p className="text-muted-foreground">
          {subMessage}
        </p>
      )}
    </div>
  );
}
