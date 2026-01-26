import { createRoot } from 'react-dom/client';

// Import polyfills first
import './lib/polyfills.ts';

// Session guard must run before any React components initialize
// to handle "logout on browser close" feature
import './lib/sessionGuard.ts';

import { ErrorBoundary } from '@/components/ErrorBoundary';
import App from './App.tsx';
import './index.css';

// FIXME: a custom font should be used. Eg:
// import '@fontsource-variable/<font-name>';

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
