import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Date validation utilities for MM/DD/YYYY format
 * 
 * SECURITY: These validators prevent malformed dates from causing calculation
 * errors and ensure data integrity across the application.
 */

/**
 * Validate a date string in MM/DD/YYYY format
 * @param dateStr The date string to validate
 * @returns true if valid, false otherwise
 */
export function isValidDateString(dateStr: string | undefined | null): boolean {
  if (!dateStr || typeof dateStr !== 'string') return false;
  
  // Check format: MM/DD/YYYY
  const dateRegex = /^(0[1-9]|1[0-2])\/(0[1-9]|[12][0-9]|3[01])\/\d{4}$/;
  if (!dateRegex.test(dateStr)) {
    // Also allow single-digit month/day: M/D/YYYY
    const relaxedRegex = /^([1-9]|0[1-9]|1[0-2])\/([1-9]|0[1-9]|[12][0-9]|3[01])\/\d{4}$/;
    if (!relaxedRegex.test(dateStr)) return false;
  }
  
  // Parse and validate the actual date
  const parts = dateStr.split('/');
  const month = parseInt(parts[0], 10);
  const day = parseInt(parts[1], 10);
  const year = parseInt(parts[2], 10);
  
  // Check ranges
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  if (year < 1900 || year > 2100) return false;
  
  // Check days in month
  const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  
  // Handle leap year for February
  if (month === 2) {
    const isLeapYear = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
    const maxDays = isLeapYear ? 29 : 28;
    if (day > maxDays) return false;
  } else if (day > daysInMonth[month - 1]) {
    return false;
  }
  
  // Final validation: create a Date and check it matches
  const date = new Date(year, month - 1, day);
  if (isNaN(date.getTime())) return false;
  
  return date.getMonth() === month - 1 && 
         date.getDate() === day && 
         date.getFullYear() === year;
}

/**
 * Parse a date string in MM/DD/YYYY format to a Date object
 * Returns null if the date is invalid
 */
export function parseDateString(dateStr: string | undefined | null): Date | null {
  if (!isValidDateString(dateStr)) return null;
  
  const parts = dateStr!.split('/');
  const month = parseInt(parts[0], 10) - 1; // JS months are 0-indexed
  const day = parseInt(parts[1], 10);
  const year = parseInt(parts[2], 10);
  
  return new Date(year, month, day);
}

/**
 * Format a Date object to MM/DD/YYYY string
 */
export function formatDateString(date: Date | null | undefined): string {
  if (!date || isNaN(date.getTime())) return '';
  
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const year = date.getFullYear();
  
  return `${month}/${day}/${year}`;
}

/**
 * Safely get a tag value with optional date validation
 * Returns undefined if the date is invalid
 */
export function getValidatedDateTag(
  value: string | undefined, 
  validateDate: boolean = true
): string | undefined {
  if (!value) return undefined;
  
  if (validateDate && !isValidDateString(value)) {
    return undefined;
  }
  
  return value;
}

/**
 * Concurrency limit for decrypt operations.
 * Keeps parallel decryption fast while avoiding overwhelming remote signers (e.g. NostrConnect).
 */
export const DECRYPT_CONCURRENCY = 8;

/**
 * Run an async mapper over items with at most `limit` concurrent executions.
 * Preserves result order. Use for decrypt/encrypt batches to avoid overwhelming signers.
 */
export async function runWithConcurrencyLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  if (items.length === 0) return [];
  const results: R[] = new Array(items.length);
  let index = 0;
  async function worker(): Promise<void> {
    while (index < items.length) {
      const i = index++;
      results[i] = await fn(items[i], i);
    }
  }
  const workerCount = Math.min(Math.max(limit, 1), items.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return results;
}
