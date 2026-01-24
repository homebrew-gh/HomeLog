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
 * The hammer has its head at the top and handle at the bottom, held from the bottom-right.
 * It swings down and to the left to strike a nail in a board.
 */
export function LoadingAnimation({ 
  className, 
  size = 'md',
  message,
  subMessage,
}: LoadingAnimationProps) {
  const sizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-24 h-24',
    lg: 'w-32 h-32',
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
          viewBox="0 0 100 100" 
          className="w-full h-full"
          aria-label="Loading animation"
        >
          {/* Wood Board - at bottom left */}
          <rect 
            x="5" 
            y="80" 
            width="55" 
            height="12" 
            rx="2"
            className="fill-amber-600 dark:fill-amber-700"
          />
          {/* Wood grain lines */}
          <line x1="10" y1="84" x2="55" y2="84" className="stroke-amber-800/30 dark:stroke-amber-900/40" strokeWidth="0.5" />
          <line x1="10" y1="88" x2="55" y2="88" className="stroke-amber-800/30 dark:stroke-amber-900/40" strokeWidth="0.5" />
          
          {/* Nail - sticking up from the board, gets driven in on impact */}
          <g className="animate-nail-drive">
            {/* Nail body */}
            <rect 
              x="28" 
              y="58" 
              width="4" 
              height="24" 
              className="fill-slate-400 dark:fill-slate-500"
            />
            {/* Nail head - flat top */}
            <rect 
              x="25" 
              y="55" 
              width="10" 
              height="4" 
              rx="1"
              className="fill-slate-500 dark:fill-slate-400"
            />
            {/* Nail tip - goes into the board */}
            <polygon 
              points="28,82 32,82 30,88" 
              className="fill-slate-400 dark:fill-slate-500"
            />
          </g>
          
          {/* Hammer - head on top, handle below, pivots from bottom of handle (hand position) */}
          {/* Pivot point at bottom-right where hand would hold it: (80, 85) */}
          {/* Hammer starts raised up (tilted back to the right), swings down-left to hit nail */}
          <g className="origin-[80px_85px] animate-hammer-swing">
            {/* Hammer handle - from pivot point going up */}
            <rect 
              x="77" 
              y="40" 
              width="6" 
              height="45" 
              rx="2"
              className="fill-amber-800 dark:fill-amber-900"
            />
            {/* Handle grip lines near bottom (where hand grips) */}
            <line x1="78" y1="75" x2="82" y2="75" className="stroke-amber-950/30" strokeWidth="0.5" />
            <line x1="78" y1="70" x2="82" y2="70" className="stroke-amber-950/30" strokeWidth="0.5" />
            <line x1="78" y1="65" x2="82" y2="65" className="stroke-amber-950/30" strokeWidth="0.5" />
            
            {/* Hammer head - at top of handle, extends to left (striking direction) */}
            <rect 
              x="58" 
              y="32" 
              width="28" 
              height="12" 
              rx="2"
              className="fill-sky-600 dark:fill-sky-500"
            />
            {/* Hammer head highlight (top edge) */}
            <rect 
              x="58" 
              y="32" 
              width="28" 
              height="4" 
              rx="1"
              className="fill-sky-400/50 dark:fill-sky-400/30"
            />
            {/* Hammer face (striking surface) - left side of head */}
            <rect 
              x="54" 
              y="34" 
              width="6" 
              height="8" 
              rx="1"
              className="fill-sky-700 dark:fill-sky-600"
            />
            {/* Claw end of hammer (right side) */}
            <path 
              d="M86 35 L92 32 L92 34 L88 36 L88 40 L92 42 L92 44 L86 41 Z"
              className="fill-sky-700 dark:fill-sky-600"
            />
          </g>
          
          {/* Impact effect - appears when hammer strikes nail */}
          <g className="animate-impact-flash">
            {/* Central flash */}
            <circle cx="30" cy="55" r="12" className="fill-yellow-400/60 dark:fill-yellow-300/40" />
            {/* Spark lines radiating from impact */}
            <line x1="18" y1="50" x2="10" y2="44" className="stroke-yellow-500 dark:stroke-yellow-400" strokeWidth="2" strokeLinecap="round" />
            <line x1="42" y1="50" x2="50" y2="44" className="stroke-yellow-500 dark:stroke-yellow-400" strokeWidth="2" strokeLinecap="round" />
            <line x1="20" y1="62" x2="12" y2="68" className="stroke-amber-500 dark:stroke-amber-400" strokeWidth="2" strokeLinecap="round" />
            <line x1="40" y1="62" x2="48" y2="68" className="stroke-amber-500 dark:stroke-amber-400" strokeWidth="2" strokeLinecap="round" />
            {/* Small sparks */}
            <circle cx="15" cy="48" r="2" className="fill-yellow-300 dark:fill-yellow-200" />
            <circle cx="45" cy="48" r="2" className="fill-yellow-300 dark:fill-yellow-200" />
            <circle cx="22" cy="42" r="1.5" className="fill-orange-400 dark:fill-orange-300" />
            <circle cx="38" cy="42" r="1.5" className="fill-orange-400 dark:fill-orange-300" />
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
