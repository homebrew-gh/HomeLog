/**
 * Session Guard
 * 
 * This module runs synchronously BEFORE React initializes to handle
 * the "logout on browser close" feature. It must execute before
 * NostrLoginProvider reads from localStorage.
 * 
 * How it works:
 * 1. Check if "logout on close" is enabled (localStorage)
 * 2. Check if session marker exists (sessionStorage - cleared on browser close)
 * 3. If enabled AND marker is missing, clear login state from localStorage
 * 4. Set the session marker for this browser session
 */

const LOGOUT_ON_CLOSE_KEY = 'homelog:logout-on-close';
const SESSION_ACTIVE_KEY = 'homelog:session-active';
const NOSTR_LOGIN_KEY = 'nostr:login';
const NWC_CONNECTIONS_KEY = 'nwc-connections';
const NWC_ACTIVE_CONNECTION_KEY = 'nwc-active-connection';

/**
 * Check and handle session on app startup
 * This MUST be called synchronously before React renders
 */
export function checkSessionOnStartup(): void {
  try {
    // Check if logout on close is enabled
    const logoutOnCloseValue = localStorage.getItem(LOGOUT_ON_CLOSE_KEY);
    const logoutOnCloseEnabled = logoutOnCloseValue ? JSON.parse(logoutOnCloseValue) === true : false;

    console.log('[SessionGuard] Logout on close enabled:', logoutOnCloseEnabled);

    if (!logoutOnCloseEnabled) {
      // Feature is disabled, ensure session marker exists for consistency
      sessionStorage.setItem(SESSION_ACTIVE_KEY, 'true');
      return;
    }

    // Check if there was an active session
    // sessionStorage survives tab refresh but NOT browser close
    const sessionWasActive = sessionStorage.getItem(SESSION_ACTIVE_KEY) === 'true';

    console.log('[SessionGuard] Session was active:', sessionWasActive);

    if (!sessionWasActive) {
      // Session marker is missing - this is a new browser session
      // Clear the login state BEFORE NostrLoginProvider reads it
      console.log('[SessionGuard] New browser session detected, clearing login state');
      
      // Check if there's actually a login to clear
      const hasLogin = localStorage.getItem(NOSTR_LOGIN_KEY);
      if (hasLogin) {
        console.log('[SessionGuard] Removing stored login');
        localStorage.removeItem(NOSTR_LOGIN_KEY);
      }
      
      // Also clear NWC connections for security
      localStorage.removeItem(NWC_CONNECTIONS_KEY);
      localStorage.removeItem(NWC_ACTIVE_CONNECTION_KEY);
    }

    // Set the session marker for this browser session
    sessionStorage.setItem(SESSION_ACTIVE_KEY, 'true');
    
  } catch (error) {
    console.error('[SessionGuard] Error checking session:', error);
    // On error, set session marker to avoid issues
    sessionStorage.setItem(SESSION_ACTIVE_KEY, 'true');
  }
}

// Run immediately when this module is imported
checkSessionOnStartup();
