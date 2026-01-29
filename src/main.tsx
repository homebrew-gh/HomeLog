import { createRoot } from 'react-dom/client';

// Import polyfills first
import './lib/polyfills.ts';

// Session guard must run before any React components initialize
// to handle "logout on browser close" feature
import './lib/sessionGuard.ts';

import { ErrorBoundary } from '@/components/ErrorBoundary';
import App from './App.tsx';
import './index.css';

// Cyberpunk-style fonts - Space Grotesk for headings, JetBrains Mono for accents
import '@fontsource-variable/space-grotesk';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/500.css';

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
