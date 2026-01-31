import { useState, useEffect, useCallback, useRef } from 'react';
import { logger } from '@/lib/logger';

/**
 * Generic hook for managing localStorage state
 * 
 * Handles persistence across browser sessions and tab synchronization.
 */
export function useLocalStorage<T>(
  key: string,
  defaultValue: T,
  serializer?: {
    serialize: (value: T) => string;
    deserialize: (value: string) => T;
  }
) {
  // Memoize serializer functions and default value to prevent unnecessary re-renders
  const serializerRef = useRef(serializer);
  serializerRef.current = serializer;
  
  // Store defaultValue in a ref to avoid dependency issues
  const defaultValueRef = useRef(defaultValue);

  const serialize = useCallback((value: T): string => {
    return serializerRef.current?.serialize?.(value) ?? JSON.stringify(value);
  }, []);

  const deserialize = useCallback((value: string): T => {
    return serializerRef.current?.deserialize?.(value) ?? JSON.parse(value);
  }, []);

  // Read from localStorage - uses ref for defaultValue to maintain stable reference
  const readFromStorage = useCallback((): T => {
    try {
      const item = localStorage.getItem(key);
      if (item === null) {
        return defaultValueRef.current;
      }
      return deserialize(item);
    } catch {
      logger.warn(`[LocalStorage] Failed to load from localStorage`);
      return defaultValueRef.current;
    }
  }, [key, deserialize]);

  // Initialize state from localStorage (only runs once due to lazy initialization)
  const [state, setState] = useState<T>(() => readFromStorage());

  // Only re-read from storage when the key changes (not on every render)
  const prevKeyRef = useRef(key);
  useEffect(() => {
    if (prevKeyRef.current !== key) {
      prevKeyRef.current = key;
      const storedValue = readFromStorage();
      setState(storedValue);
    }
  }, [key, readFromStorage]);

  // setValue function that properly handles functional updates
  const setValue = useCallback((value: T | ((prev: T) => T)) => {
    setState((currentState) => {
      try {
        // Calculate new value based on whether it's a function or direct value
        const valueToStore = value instanceof Function ? value(currentState) : value;
        
        // Persist to localStorage
        localStorage.setItem(key, serialize(valueToStore));
        
        return valueToStore;
      } catch {
        logger.warn(`[LocalStorage] Failed to save to localStorage`);
        return currentState;
      }
    });
  }, [key, serialize]);

  // Sync with localStorage changes from other tabs/windows
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key) {
        try {
          if (e.newValue === null) {
            // Item was removed, reset to default
            setState(defaultValue);
          } else {
            setState(deserialize(e.newValue));
          }
        } catch {
          logger.warn(`[LocalStorage] Failed to sync from localStorage`);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [key, defaultValue, deserialize]);

  return [state, setValue] as const;
}