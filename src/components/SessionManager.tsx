import { useEffect, useRef } from 'react';
import { useNostrLogin } from '@nostrify/react/login';
import { LOGOUT_ON_CLOSE_KEY, SENSITIVE_STORAGE_KEYS } from '@/hooks/usePersistentStorage';

/**
 * Session key to track if the session is active
 * This is stored in sessionStorage (cleared on browser close) rather than localStorage
 */
const SESSION_ACTIVE_KEY = 'homelog:session-active';

/**
 * SessionManager
 * 
 * Handles automatic logout when the browser is closed, if the user has enabled
 * the "Logout on browser close" preference.
 * 
 * How it works:
 * 1. On mount, checks if "logout on close" is enabled AND if the session was active
 * 2. If enabled and no active session marker exists, clears the login state
 * 3. Sets a session marker in sessionStorage (which is cleared when browser closes)
 * 4. On next browser open, the session marker will be gone, triggering logout
 */
export function SessionManager() {
  const { logins, removeLogin } = useNostrLogin();
  const hasInitialized = useRef(false);

  useEffect(() => {
    // Only run once on mount
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const handleSessionCheck = () => {
      try {
        // Check if logout on close is enabled
        const logoutOnCloseValue = localStorage.getItem(LOGOUT_ON_CLOSE_KEY);
        const logoutOnCloseEnabled = logoutOnCloseValue ? JSON.parse(logoutOnCloseValue) === true : false;

        if (!logoutOnCloseEnabled) {
          // Feature is disabled, ensure session marker exists for consistency
          sessionStorage.setItem(SESSION_ACTIVE_KEY, 'true');
          return;
        }

        // Check if there was an active session (sessionStorage survives tab refresh but not browser close)
        const sessionWasActive = sessionStorage.getItem(SESSION_ACTIVE_KEY) === 'true';

        if (!sessionWasActive) {
          // Session marker is missing - this is a new browser session
          // Clear the login state to log the user out
          console.log('[SessionManager] New browser session detected, clearing login state');
          
          // Clear the nostr:login key directly from localStorage
          localStorage.removeItem(SENSITIVE_STORAGE_KEYS.NOSTR_LOGIN);
          
          // Also clear NWC connections for security
          localStorage.removeItem(SENSITIVE_STORAGE_KEYS.NWC_CONNECTIONS);
          localStorage.removeItem(SENSITIVE_STORAGE_KEYS.NWC_ACTIVE_CONNECTION);
          
          // Note: The NostrLoginProvider will pick up the cleared state on next render
          // We don't need to call removeLogin here as the state will be synced
        }

        // Set the session marker for this browser session
        sessionStorage.setItem(SESSION_ACTIVE_KEY, 'true');
        
      } catch (error) {
        console.error('[SessionManager] Error checking session:', error);
        // On error, set session marker to avoid repeated logout attempts
        sessionStorage.setItem(SESSION_ACTIVE_KEY, 'true');
      }
    };

    // Run the check
    handleSessionCheck();
  }, []);

  // Also handle the case where user enables logout-on-close while already logged in
  // We need to ensure the session marker is set
  useEffect(() => {
    if (logins.length > 0) {
      // User is logged in, ensure session marker is set
      sessionStorage.setItem(SESSION_ACTIVE_KEY, 'true');
    }
  }, [logins.length]);

  // This component doesn't render anything
  return null;
}
