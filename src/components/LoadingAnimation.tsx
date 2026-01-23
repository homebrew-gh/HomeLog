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
            x="20" 
            y="70" 
            width="60" 
            height="12" 
            rx="2"
            className="fill-amber-600 dark:fill-amber-700"
          />
          {/* Wood grain lines */}
          <line x1="25" y1="74" x2="75" y2="74" className="stroke-amber-800/30 dark:stroke-amber-900/40" strokeWidth="0.5" />
          <line x1="25" y1="78" x2="75" y2="78" className="stroke-amber-800/30 dark:stroke-amber-900/40" strokeWidth="0.5" />
          
          {/* Nail (stationary, gets "driven" in) */}
          <g className="animate-nail-drive">
            {/* Nail head */}
            <ellipse 
              cx="50" 
              cy="58" 
              rx="6" 
              ry="2"
              className="fill-slate-400 dark:fill-slate-500"
            />
            {/* Nail body */}
            <rect 
              x="48" 
              y="58" 
              width="4" 
              height="14" 
              className="fill-slate-400 dark:fill-slate-500"
            />
            {/* Nail tip */}
            <polygon 
              points="48,72 52,72 50,76" 
              className="fill-slate-400 dark:fill-slate-500"
            />
          </g>
          
          {/* Hammer (animated) */}
          <g className="origin-[70px_30px] animate-hammer-swing">
            {/* Hammer handle */}
            <rect 
              x="45" 
              y="25" 
              width="5" 
              height="35" 
              rx="1.5"
              className="fill-amber-800 dark:fill-amber-900"
            />
            {/* Handle grip lines */}
            <line x1="46" y1="45" x2="49" y2="45" className="stroke-amber-950/30" strokeWidth="0.5" />
            <line x1="46" y1="48" x2="49" y2="48" className="stroke-amber-950/30" strokeWidth="0.5" />
            <line x1="46" y1="51" x2="49" y2="51" className="stroke-amber-950/30" strokeWidth="0.5" />
            
            {/* Hammer head */}
            <rect 
              x="32" 
              y="18" 
              width="30" 
              height="12" 
              rx="2"
              className="fill-sky-600 dark:fill-sky-500"
            />
            {/* Hammer head highlight */}
            <rect 
              x="32" 
              y="18" 
              width="30" 
              height="3" 
              rx="1"
              className="fill-sky-400/50 dark:fill-sky-400/30"
            />
            {/* Hammer face (striking surface) */}
            <rect 
              x="32" 
              y="18" 
              width="6" 
              height="12" 
              rx="1"
              className="fill-sky-700 dark:fill-sky-600"
            />
            {/* Claw side */}
            <path 
              d="M58 18 L62 18 L62 22 Q65 24 62 28 L60 28 Q62 25 60 23 L58 23 Z"
              className="fill-sky-700 dark:fill-sky-600"
            />
          </g>
          
          {/* Impact effect (appears on hit) */}
          <g className="animate-impact-flash">
            <circle cx="50" cy="58" r="8" className="fill-amber-400/60 dark:fill-amber-300/40" />
            {/* Impact lines */}
            <line x1="38" y1="55" x2="34" y2="52" className="stroke-amber-500 dark:stroke-amber-400" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="62" y1="55" x2="66" y2="52" className="stroke-amber-500 dark:stroke-amber-400" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="40" y1="62" x2="35" y2="65" className="stroke-amber-500 dark:stroke-amber-400" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="60" y1="62" x2="65" y2="65" className="stroke-amber-500 dark:stroke-amber-400" strokeWidth="1.5" strokeLinecap="round" />
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
