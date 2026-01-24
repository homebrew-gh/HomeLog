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
 * Use this component whenever a loading state is needed.
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
          {/* Wood Board */}
          <rect 
            x="10" 
            y="78" 
            width="50" 
            height="12" 
            rx="2"
            className="fill-amber-600 dark:fill-amber-700"
          />
          {/* Wood grain lines */}
          <line x1="15" y1="82" x2="55" y2="82" className="stroke-amber-800/30 dark:stroke-amber-900/40" strokeWidth="0.5" />
          <line x1="15" y1="86" x2="55" y2="86" className="stroke-amber-800/30 dark:stroke-amber-900/40" strokeWidth="0.5" />
          
          {/* Nail (stationary, gets "driven" in) - positioned on left side of board */}
          <g className="animate-nail-drive">
            {/* Nail head */}
            <ellipse 
              cx="35" 
              cy="64" 
              rx="5" 
              ry="2"
              className="fill-slate-400 dark:fill-slate-500"
            />
            {/* Nail body */}
            <rect 
              x="33" 
              y="64" 
              width="4" 
              height="16" 
              className="fill-slate-400 dark:fill-slate-500"
            />
            {/* Nail tip */}
            <polygon 
              points="33,80 37,80 35,85" 
              className="fill-slate-400 dark:fill-slate-500"
            />
          </g>
          
          {/* Hammer (animated) - on right side, pivots from top-right corner of handle */}
          {/* Pivot point is at (85, 20), hammer swings from vertical down 90 degrees to hit nail */}
          <g className="origin-[85px_20px] animate-hammer-swing">
            {/* Hammer handle - extends from pivot point */}
            <rect 
              x="82" 
              y="20" 
              width="6" 
              height="40" 
              rx="2"
              className="fill-amber-800 dark:fill-amber-900"
            />
            {/* Handle grip lines */}
            <line x1="83" y1="25" x2="87" y2="25" className="stroke-amber-950/30" strokeWidth="0.5" />
            <line x1="83" y1="30" x2="87" y2="30" className="stroke-amber-950/30" strokeWidth="0.5" />
            <line x1="83" y1="35" x2="87" y2="35" className="stroke-amber-950/30" strokeWidth="0.5" />
            
            {/* Hammer head - at bottom of handle, extends to the left (toward nail) */}
            <rect 
              x="62" 
              y="57" 
              width="26" 
              height="10" 
              rx="2"
              className="fill-sky-600 dark:fill-sky-500"
            />
            {/* Hammer head highlight */}
            <rect 
              x="62" 
              y="57" 
              width="26" 
              height="3" 
              rx="1"
              className="fill-sky-400/50 dark:fill-sky-400/30"
            />
            {/* Hammer face (striking surface) - left side of head */}
            <rect 
              x="58" 
              y="59" 
              width="6" 
              height="6" 
              rx="1"
              className="fill-sky-700 dark:fill-sky-600"
            />
          </g>
          
          {/* Impact effect (appears on hit) - centered on nail head */}
          <g className="animate-impact-flash">
            <circle cx="35" cy="64" r="10" className="fill-amber-400/50 dark:fill-amber-300/30" />
            {/* Impact lines - radiating outward */}
            <line x1="23" y1="60" x2="17" y2="55" className="stroke-amber-500 dark:stroke-amber-400" strokeWidth="2" strokeLinecap="round" />
            <line x1="47" y1="60" x2="53" y2="55" className="stroke-amber-500 dark:stroke-amber-400" strokeWidth="2" strokeLinecap="round" />
            <line x1="21" y1="68" x2="13" y2="72" className="stroke-amber-500 dark:stroke-amber-400" strokeWidth="2" strokeLinecap="round" />
            <line x1="49" y1="68" x2="57" y2="72" className="stroke-amber-500 dark:stroke-amber-400" strokeWidth="2" strokeLinecap="round" />
            {/* Extra spark lines */}
            <line x1="25" y1="56" x2="23" y2="50" className="stroke-yellow-400 dark:stroke-yellow-300" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="45" y1="56" x2="47" y2="50" className="stroke-yellow-400 dark:stroke-yellow-300" strokeWidth="1.5" strokeLinecap="round" />
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
