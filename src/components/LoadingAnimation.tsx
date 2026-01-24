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
          className="w-full h-full overflow-visible"
          aria-label="Loading animation"
        >
          {/* Wood Board - at bottom */}
          <rect 
            x="10" 
            y="82" 
            width="50" 
            height="10" 
            rx="2"
            className="fill-amber-600 dark:fill-amber-700"
          />
          {/* Wood grain lines */}
          <line x1="15" y1="85" x2="55" y2="85" className="stroke-amber-800/30 dark:stroke-amber-900/40" strokeWidth="0.5" />
          <line x1="15" y1="89" x2="55" y2="89" className="stroke-amber-800/30 dark:stroke-amber-900/40" strokeWidth="0.5" />
          
          {/* Nail - sticking up from the board, gets driven in on impact */}
          <g className="animate-nail-drive">
            {/* Nail body */}
            <rect 
              x="33" 
              y="62" 
              width="4" 
              height="22" 
              className="fill-slate-400 dark:fill-slate-500"
            />
            {/* Nail head - flat top */}
            <rect 
              x="30" 
              y="59" 
              width="10" 
              height="4" 
              rx="1"
              className="fill-slate-500 dark:fill-slate-400"
            />
            {/* Nail tip - goes into the board */}
            <polygon 
              points="33,84 37,84 35,90" 
              className="fill-slate-400 dark:fill-slate-500"
            />
          </g>
          
          {/* Hammer - head on top, handle below, pivots from bottom of handle (hand position) */}
          {/* Pivot point centered more: (65, 75) - where hand would hold it */}
          {/* Hammer swings in a smaller arc to stay within bounds */}
          <g className="origin-[65px_75px] animate-hammer-swing">
            {/* Hammer handle - extends upward from pivot */}
            <rect 
              x="62" 
              y="35" 
              width="6" 
              height="40" 
              rx="2"
              className="fill-amber-800 dark:fill-amber-900"
            />
            {/* Handle grip lines near bottom */}
            <line x1="63" y1="68" x2="67" y2="68" className="stroke-amber-950/30" strokeWidth="0.5" />
            <line x1="63" y1="63" x2="67" y2="63" className="stroke-amber-950/30" strokeWidth="0.5" />
            <line x1="63" y1="58" x2="67" y2="58" className="stroke-amber-950/30" strokeWidth="0.5" />
            
            {/* Hammer head - at top of handle, extends to left (striking direction) */}
            <rect 
              x="42" 
              y="27" 
              width="26" 
              height="11" 
              rx="2"
              className="fill-sky-600 dark:fill-sky-500"
            />
            {/* Hammer head highlight (top edge) */}
            <rect 
              x="42" 
              y="27" 
              width="26" 
              height="3" 
              rx="1"
              className="fill-sky-400/50 dark:fill-sky-400/30"
            />
            {/* Hammer face (striking surface) - left side of head */}
            <rect 
              x="38" 
              y="29" 
              width="5" 
              height="7" 
              rx="1"
              className="fill-sky-700 dark:fill-sky-600"
            />
            {/* Claw end of hammer (right side) - simplified */}
            <path 
              d="M68 29 L73 27 L73 29 L70 31 L70 34 L73 36 L73 38 L68 35 Z"
              className="fill-sky-700 dark:fill-sky-600"
            />
          </g>
          
          {/* Impact effect - appears when hammer strikes nail */}
          <g className="animate-impact-flash">
            {/* Central flash */}
            <circle cx="35" cy="59" r="10" className="fill-yellow-400/60 dark:fill-yellow-300/40" />
            {/* Spark lines radiating from impact */}
            <line x1="25" y1="54" x2="18" y2="48" className="stroke-yellow-500 dark:stroke-yellow-400" strokeWidth="2" strokeLinecap="round" />
            <line x1="45" y1="54" x2="52" y2="48" className="stroke-yellow-500 dark:stroke-yellow-400" strokeWidth="2" strokeLinecap="round" />
            <line x1="26" y1="66" x2="19" y2="72" className="stroke-amber-500 dark:stroke-amber-400" strokeWidth="2" strokeLinecap="round" />
            <line x1="44" y1="66" x2="51" y2="72" className="stroke-amber-500 dark:stroke-amber-400" strokeWidth="2" strokeLinecap="round" />
            {/* Small sparks */}
            <circle cx="20" cy="52" r="2" className="fill-yellow-300 dark:fill-yellow-200" />
            <circle cx="50" cy="52" r="2" className="fill-yellow-300 dark:fill-yellow-200" />
            <circle cx="28" cy="46" r="1.5" className="fill-orange-400 dark:fill-orange-300" />
            <circle cx="42" cy="46" r="1.5" className="fill-orange-400 dark:fill-orange-300" />
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
