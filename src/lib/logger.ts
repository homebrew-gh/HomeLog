/**
 * Production-safe logging utility
 * 
 * SECURITY: This logger respects production mode to prevent sensitive
 * information from being logged to the browser console where it could
 * be captured by:
 * - Shoulder surfing on shared computers
 * - Browser extensions that capture console output
 * - Forensic analysis of crash reports
 * 
 * In production:
 * - console.log and console.debug are completely suppressed
 * - console.warn is suppressed (use sparingly for development debugging)
 * - console.error is still logged (genuine errors need to be visible)
 * 
 * In development:
 * - All log levels are enabled for debugging
 */

const isDevelopment = import.meta.env.DEV;

/**
 * Safe logger that only logs in development mode
 * 
 * Usage:
 * ```typescript
 * import { logger } from '@/lib/logger';
 * 
 * logger.log('Debug info'); // Only in dev
 * logger.warn('Warning'); // Only in dev
 * logger.error('Error'); // Always logged (errors are important)
 * logger.debug('Verbose debug'); // Only in dev
 * ```
 */
export const logger = {
  /**
   * Log general information (development only)
   * NEVER log: pubkeys, file hashes, connection strings, event counts, or other sensitive data
   */
  log: (...args: unknown[]): void => {
    if (isDevelopment) {
      console.log(...args);
    }
  },

  /**
   * Log warnings (development only)
   * Use for non-critical issues that should be addressed
   */
  warn: (...args: unknown[]): void => {
    if (isDevelopment) {
      console.warn(...args);
    }
  },

  /**
   * Log errors (always logged, even in production)
   * Use only for genuine errors that need attention
   * CAUTION: Avoid including sensitive data in error messages
   */
  error: (...args: unknown[]): void => {
    // Always log errors - they indicate real problems
    console.error(...args);
  },

  /**
   * Log debug information (development only)
   * Use for verbose debugging that's too noisy for regular logs
   */
  debug: (...args: unknown[]): void => {
    if (isDevelopment) {
      console.debug(...args);
    }
  },

  /**
   * Log with a specific prefix/tag (development only)
   * Useful for categorizing logs from different modules
   */
  tagged: (tag: string, ...args: unknown[]): void => {
    if (isDevelopment) {
      console.log(`[${tag}]`, ...args);
    }
  },
};

/**
 * Type-safe assertion that logs in development and throws in production
 * Use for invariants that should never be violated
 */
export function assertDev(condition: boolean, message: string): asserts condition {
  if (!condition) {
    if (isDevelopment) {
      console.error(`Assertion failed: ${message}`);
    }
    throw new Error(`Assertion failed: ${message}`);
  }
}
