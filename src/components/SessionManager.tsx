import { useEffect } from 'react';
import { useNostrLogin } from '@nostrify/react/login';

/**
 * Session key to track if the session is active
 * This is stored in sessionStorage (cleared on browser close) rather than localStorage
 */
const SESSION_ACTIVE_KEY = 'homelog:session-active';

/**
 * SessionManager
 * 
 * Ensures the session marker is set when a user logs in.
 * The actual logout-on-close logic is handled by sessionGuard.ts which
 * runs synchronously before React initializes.
 * 
 * This component just ensures the session marker stays in sync with login state.
 */
export function SessionManager() {
  const { logins } = useNostrLogin();

  // Keep session marker in sync with login state
  useEffect(() => {
    if (logins.length > 0) {
      // User is logged in, ensure session marker is set
      sessionStorage.setItem(SESSION_ACTIVE_KEY, 'true');
    }
  }, [logins.length]);

  // This component doesn't render anything
  return null;
}
