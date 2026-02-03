import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import { useUserPreferences } from '@/contexts/UserPreferencesContext';
import { 
  fetchExchangeRates, 
  convertCurrency, 
  formatCurrency, 
  parseCurrencyAmount,
  getCurrency,
  type ExchangeRates,
  type CurrencyCode,
} from '@/lib/currency';

/**
 * Hook for currency management and conversion
 * 
 * Provides:
 * - User's entry and display currency preferences
 * - Exchange rates (cached, user-triggered refresh)
 * - Conversion utilities
 * - Formatting utilities
 */
export function useCurrency() {
  const { preferences, setEntryCurrency, setDisplayCurrency, setExchangeRates } = useUserPreferences();
  const _queryClient = useQueryClient();
  
  // Get stored exchange rates from preferences (persisted)
  const storedRates = preferences.exchangeRates;
  
  // Query for fetching fresh rates (only runs when user triggers refresh)
  const { 
    refetch: refreshRates, 
    isLoading: isRefreshing,
    isFetching: isFetchingRates 
  } = useQuery({
    queryKey: ['exchange-rates'],
    queryFn: async () => {
      const rates = await fetchExchangeRates('USD');
      // Store rates in preferences for persistence
      setExchangeRates(rates);
      return rates;
    },
    enabled: false, // Don't auto-fetch, only when user requests
    staleTime: Infinity, // Never consider stale, user controls refresh
  });

  // Use stored rates or empty fallback
  const rates: ExchangeRates = storedRates || {
    base: 'USD',
    rates: {},
    timestamp: 0,
    btcPrice: 0,
  };

  // Check if we have valid rates
  const hasRates = Object.keys(rates.rates).length > 0 || (rates.btcPrice ?? 0) > 0;

  // Get last update time as readable string
  const lastUpdated = useMemo(() => {
    if (!rates.timestamp) return null;
    const date = new Date(rates.timestamp);
    return date.toLocaleString();
  }, [rates.timestamp]);

  // Convert an amount from one currency to another
  const convert = useCallback((
    amount: number,
    fromCurrency: CurrencyCode | string,
    toCurrency?: CurrencyCode | string
  ): number => {
    const targetCurrency = toCurrency || preferences.displayCurrency;
    if (!hasRates) {
      // No rates available, return original amount if same currency
      if (fromCurrency === targetCurrency) return amount;
      return amount; // Can't convert without rates
    }
    return convertCurrency(amount, fromCurrency, targetCurrency, rates);
  }, [rates, hasRates, preferences.displayCurrency]);

  // Format an amount in a specific currency
  const format = useCallback((
    amount: number,
    currencyCode?: CurrencyCode | string
  ): string => {
    return formatCurrency(amount, currencyCode || preferences.displayCurrency);
  }, [preferences.displayCurrency]);

  // Convert and format in one step
  const convertAndFormat = useCallback((
    amount: number,
    fromCurrency: CurrencyCode | string,
    toCurrency?: CurrencyCode | string
  ): string => {
    const targetCurrency = toCurrency || preferences.displayCurrency;
    
    if (fromCurrency === targetCurrency) {
      return formatCurrency(amount, targetCurrency);
    }
    
    if (!hasRates) {
      // No rates, show original with note
      return formatCurrency(amount, fromCurrency);
    }
    
    const converted = convertCurrency(amount, fromCurrency, targetCurrency, rates);
    return formatCurrency(converted, targetCurrency);
  }, [rates, hasRates, preferences.displayCurrency]);

  // Parse a cost string and get the numeric value
  const parseAmount = useCallback((costString: string): number => {
    return parseCurrencyAmount(costString);
  }, []);

  /**
   * Format any price/cost/amount for display using the user's display currency.
   * Converts from source currency when entry and display differ and rates are available.
   * Use for all read-only display of amounts (not in form inputs).
   * @param value - Amount as string (e.g. "$100.00") or number
   * @param sourceCurrency - Currency the amount is stored in; defaults to entry currency
   */
  const formatForDisplay = useCallback((
    value: string | number,
    sourceCurrency?: CurrencyCode | string
  ): string => {
    const amount = typeof value === 'string' ? parseCurrencyAmount(value) : value;
    const from = sourceCurrency ?? preferences.entryCurrency;
    return convertAndFormat(amount, from, preferences.displayCurrency);
  }, [preferences.entryCurrency, preferences.displayCurrency, convertAndFormat]);

  // Get currency info
  const getEntryCurrencyInfo = useCallback(() => {
    return getCurrency(preferences.entryCurrency);
  }, [preferences.entryCurrency]);

  const getDisplayCurrencyInfo = useCallback(() => {
    return getCurrency(preferences.displayCurrency);
  }, [preferences.displayCurrency]);

  // Trigger a rate refresh
  const updateRates = useCallback(async () => {
    await refreshRates();
  }, [refreshRates]);

  return {
    // Preferences
    entryCurrency: preferences.entryCurrency,
    displayCurrency: preferences.displayCurrency,
    setEntryCurrency,
    setDisplayCurrency,
    
    // Currency info
    getEntryCurrencyInfo,
    getDisplayCurrencyInfo,
    
    // Rates
    rates,
    hasRates,
    lastUpdated,
    isRefreshing: isRefreshing || isFetchingRates,
    updateRates,
    
    // Utilities
    convert,
    format,
    convertAndFormat,
    formatForDisplay,
    parseAmount,
  };
}

/**
 * Hook for formatting subscription costs with proper currency display
 */
export function useSubscriptionCurrency() {
  const { 
    entryCurrency, 
    displayCurrency, 
    convertAndFormat, 
    parseAmount,
    hasRates,
    format 
  } = useCurrency();

  // Format a subscription cost for display
  // Takes the stored cost string and optional stored currency
  const formatSubscriptionCost = useCallback((
    costString: string,
    storedCurrency?: string
  ): string => {
    const amount = parseAmount(costString);
    const sourceCurrency = storedCurrency || entryCurrency;
    
    // If same currency or no conversion needed, just format
    if (sourceCurrency === displayCurrency || !hasRates) {
      return format(amount, sourceCurrency);
    }
    
    // Convert and format
    return convertAndFormat(amount, sourceCurrency, displayCurrency);
  }, [entryCurrency, displayCurrency, convertAndFormat, parseAmount, hasRates, format]);

  // Get the original amount with its currency
  const getOriginalCost = useCallback((
    costString: string,
    storedCurrency?: string
  ): { amount: number; currency: string; formatted: string } => {
    const amount = parseAmount(costString);
    const currency = storedCurrency || entryCurrency;
    return {
      amount,
      currency,
      formatted: format(amount, currency),
    };
  }, [entryCurrency, parseAmount, format]);

  return {
    formatSubscriptionCost,
    getOriginalCost,
    entryCurrency,
    displayCurrency,
    hasRates,
  };
}
