import { useState, useEffect, useCallback, useRef } from 'react';

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
  // Memoize serializer functions to prevent unnecessary re-renders
  const serializerRef = useRef(serializer);
  serializerRef.current = serializer;

  const serialize = useCallback((value: T): string => {
    return serializerRef.current?.serialize?.(value) ?? JSON.stringify(value);
  }, []);

  const deserialize = useCallback((value: string): T => {
    return serializerRef.current?.deserialize?.(value) ?? JSON.parse(value);
  }, []);

  // Read from localStorage on every render to ensure we have the latest value
  const readFromStorage = useCallback((): T => {
    try {
      const item = localStorage.getItem(key);
      if (item === null) {
        return defaultValue;
      }
      return deserialize(item);
    } catch (error) {
      console.warn(`Failed to load ${key} from localStorage:`, error);
      return defaultValue;
    }
  }, [key, defaultValue, deserialize]);

  // Initialize state from localStorage
  const [state, setState] = useState<T>(readFromStorage);

  // Re-read from storage on mount to handle browser restarts
  // This ensures we always have the latest value from localStorage
  useEffect(() => {
    const storedValue = readFromStorage();
    setState(storedValue);
  }, [key, readFromStorage]);

  // setValue function that properly handles functional updates
  const setValue = useCallback((value: T | ((prev: T) => T)) => {
    // Use setState with functional update to ensure we have latest state
    setState((currentState) => {
      try {
        // Also read from localStorage to get the most up-to-date value
        // This handles cases where localStorage was updated externally
        let latestValue: T;
        try {
          const item = localStorage.getItem(key);
          latestValue = item !== null ? deserialize(item) : currentState;
        } catch {
          latestValue = currentState;
        }

        // Calculate new value based on whether it's a function or direct value
        const valueToStore = value instanceof Function ? value(latestValue) : value;
        
        // Persist to localStorage
        localStorage.setItem(key, serialize(valueToStore));
        
        return valueToStore;
      } catch (error) {
        console.warn(`Failed to save ${key} to localStorage:`, error);
        return currentState;
      }
    });
  }, [key, serialize, deserialize]);

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
        } catch (error) {
          console.warn(`Failed to sync ${key} from localStorage:`, error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [key, defaultValue, deserialize]);

  return [state, setValue] as const;
}