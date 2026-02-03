// Currency definitions and utilities for Cypher Log
// Supports top 20 world currencies plus Bitcoin (base and satoshi)

import { logger } from '@/lib/logger';

export interface Currency {
  code: string;
  name: string;
  symbol: string;
  symbolPosition: 'before' | 'after';
  decimals: number;
  // For Bitcoin conversions
  isCrypto?: boolean;
  // For display grouping
  category: 'crypto' | 'major' | 'other';
}

// Top 20 world currencies by relevance/usage + Bitcoin
export const CURRENCIES: Currency[] = [
  // Crypto
  { code: 'BTC', name: 'Bitcoin', symbol: '₿', symbolPosition: 'before', decimals: 8, isCrypto: true, category: 'crypto' },
  { code: 'SATS', name: 'Satoshis', symbol: 'sats', symbolPosition: 'after', decimals: 0, isCrypto: true, category: 'crypto' },
  
  // Major currencies
  { code: 'USD', name: 'US Dollar', symbol: '$', symbolPosition: 'before', decimals: 2, category: 'major' },
  { code: 'EUR', name: 'Euro', symbol: '€', symbolPosition: 'before', decimals: 2, category: 'major' },
  { code: 'GBP', name: 'British Pound', symbol: '£', symbolPosition: 'before', decimals: 2, category: 'major' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥', symbolPosition: 'before', decimals: 0, category: 'major' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥', symbolPosition: 'before', decimals: 2, category: 'major' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF', symbolPosition: 'before', decimals: 2, category: 'major' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', symbolPosition: 'before', decimals: 2, category: 'major' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', symbolPosition: 'before', decimals: 2, category: 'major' },
  
  // Other important currencies
  { code: 'INR', name: 'Indian Rupee', symbol: '₹', symbolPosition: 'before', decimals: 2, category: 'other' },
  { code: 'KRW', name: 'South Korean Won', symbol: '₩', symbolPosition: 'before', decimals: 0, category: 'other' },
  { code: 'BRL', name: 'Brazilian Real', symbol: 'R$', symbolPosition: 'before', decimals: 2, category: 'other' },
  { code: 'MXN', name: 'Mexican Peso', symbol: 'MX$', symbolPosition: 'before', decimals: 2, category: 'other' },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', symbolPosition: 'before', decimals: 2, category: 'other' },
  { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$', symbolPosition: 'before', decimals: 2, category: 'other' },
  { code: 'NOK', name: 'Norwegian Krone', symbol: 'kr', symbolPosition: 'after', decimals: 2, category: 'other' },
  { code: 'SEK', name: 'Swedish Krona', symbol: 'kr', symbolPosition: 'after', decimals: 2, category: 'other' },
  { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$', symbolPosition: 'before', decimals: 2, category: 'other' },
  { code: 'ZAR', name: 'South African Rand', symbol: 'R', symbolPosition: 'before', decimals: 2, category: 'other' },
  { code: 'RUB', name: 'Russian Ruble', symbol: '₽', symbolPosition: 'after', decimals: 2, category: 'other' },
  { code: 'PLN', name: 'Polish Zloty', symbol: 'zł', symbolPosition: 'after', decimals: 2, category: 'other' },
];

export type CurrencyCode = typeof CURRENCIES[number]['code'];

// Get currency by code
export function getCurrency(code: string): Currency | undefined {
  return CURRENCIES.find(c => c.code === code);
}

// Get default currency (USD)
export function getDefaultCurrency(): Currency {
  return CURRENCIES.find(c => c.code === 'USD')!;
}

// Format a number with currency symbol
export function formatCurrency(amount: number, currencyCode: string): string {
  const currency = getCurrency(currencyCode);
  if (!currency) {
    return `${amount.toFixed(2)} ${currencyCode}`;
  }

  // Format the number
  let formattedNumber: string;
  
  if (currency.code === 'SATS') {
    // Satoshis are whole numbers, use comma separators
    formattedNumber = Math.round(amount).toLocaleString('en-US');
  } else if (currency.code === 'BTC') {
    // Bitcoin shows up to 8 decimals, but trim trailing zeros
    formattedNumber = amount.toFixed(8).replace(/\.?0+$/, '');
    // Ensure at least 2 decimal places for readability
    if (!formattedNumber.includes('.')) {
      formattedNumber += '.00';
    } else if (formattedNumber.split('.')[1].length < 2) {
      formattedNumber += '0';
    }
  } else {
    // Regular currencies
    formattedNumber = amount.toFixed(currency.decimals);
    // Add thousand separators
    const parts = formattedNumber.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    formattedNumber = parts.join('.');
  }

  // Apply symbol position
  if (currency.symbolPosition === 'before') {
    return `${currency.symbol}${formattedNumber}`;
  } else {
    return `${formattedNumber} ${currency.symbol}`;
  }
}

// Parse a currency amount from string (removes currency symbols and commas)
export function parseCurrencyAmount(value: string): number {
  // Remove all non-numeric characters except decimal point and minus
  const cleaned = value.replace(/[^0-9.-]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

// Exchange rate cache type
export interface ExchangeRates {
  base: string; // Base currency (usually USD)
  rates: Record<string, number>; // Currency code -> rate relative to base
  timestamp: number; // When these rates were fetched
  btcPrice?: number; // BTC price in base currency
}

// Satoshis per Bitcoin constant
const SATS_PER_BTC = 100_000_000;

// Convert amount between currencies
export function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  rates: ExchangeRates
): number {
  if (fromCurrency === toCurrency) {
    return amount;
  }

  // Handle satoshi <-> BTC conversions directly (no rates needed)
  if (fromCurrency === 'BTC' && toCurrency === 'SATS') {
    return amount * SATS_PER_BTC;
  }
  if (fromCurrency === 'SATS' && toCurrency === 'BTC') {
    return amount / SATS_PER_BTC;
  }

  // Get the BTC price in the base currency (e.g., USD)
  // btcPrice is stored as "how many USD per 1 BTC"
  const btcPrice = rates.btcPrice || 0;
  
  if (btcPrice === 0 && (fromCurrency === 'BTC' || fromCurrency === 'SATS' || toCurrency === 'BTC' || toCurrency === 'SATS')) {
    logger.warn('[Currency] No BTC price available for conversion');
    return amount;
  }

  // Convert from source currency to base currency (USD)
  let amountInBase: number;
  
  if (fromCurrency === 'BTC') {
    // BTC -> USD: multiply by BTC price
    amountInBase = amount * btcPrice;
  } else if (fromCurrency === 'SATS') {
    // SATS -> USD: convert to BTC first, then to USD
    const amountInBtc = amount / SATS_PER_BTC;
    amountInBase = amountInBtc * btcPrice;
  } else if (fromCurrency === rates.base) {
    amountInBase = amount;
  } else {
    // Fiat -> USD: divide by exchange rate
    const fromRate = rates.rates[fromCurrency];
    if (!fromRate) {
      logger.warn(`[Currency] No exchange rate found for ${fromCurrency}`);
      return amount;
    }
    amountInBase = amount / fromRate;
  }

  // Convert from base currency (USD) to target currency
  if (toCurrency === 'BTC') {
    // USD -> BTC: divide by BTC price
    return amountInBase / btcPrice;
  } else if (toCurrency === 'SATS') {
    // USD -> SATS: convert to BTC first, then to sats
    const amountInBtc = amountInBase / btcPrice;
    return amountInBtc * SATS_PER_BTC;
  } else if (toCurrency === rates.base) {
    return amountInBase;
  } else {
    // USD -> Fiat: multiply by exchange rate
    const toRate = rates.rates[toCurrency];
    if (!toRate) {
      logger.warn(`[Currency] No exchange rate found for ${toCurrency}`);
      return amountInBase;
    }
    return amountInBase * toRate;
  }
}

// Fetch current exchange rates from a free API
export async function fetchExchangeRates(baseCurrency: string = 'USD'): Promise<ExchangeRates> {
  try {
    // Use exchangerate-api (free tier) for fiat rates
    // We'll use a CORS proxy since we're in the browser
    const fiatResponse = await fetch(
      `https://proxy.shakespeare.diy/?url=${encodeURIComponent(`https://api.exchangerate-api.com/v4/latest/${baseCurrency}`)}`
    );
    
    if (!fiatResponse.ok) {
      throw new Error('Failed to fetch exchange rates');
    }
    
    const fiatData = await fiatResponse.json();
    
    // Fetch Bitcoin price from CoinGecko (free, no API key needed)
    let btcPrice = 0;
    try {
      const btcResponse = await fetch(
        `https://proxy.shakespeare.diy/?url=${encodeURIComponent('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd')}`
      );
      if (btcResponse.ok) {
        const btcData = await btcResponse.json();
        // CoinGecko returns { bitcoin: { usd: number } }; handle string or number
        const raw = btcData.bitcoin?.usd ?? btcData.bitcoin?.USD;
        btcPrice = typeof raw === 'number' ? raw : Number(raw) || 0;
        
        // If base isn't USD, convert BTC price from USD to base currency
        if (baseCurrency !== 'USD' && btcPrice > 0 && fiatData.rates?.USD != null) {
          btcPrice = btcPrice / fiatData.rates.USD;
        }
      }
    } catch {
      logger.warn('[Currency] Failed to fetch BTC price');
    }

    const rates: Record<string, number> = { ...(fiatData.rates || {}) };
    // Ensure base currency is present in rates (some APIs omit it)
    if (rates[baseCurrency] == null) {
      rates[baseCurrency] = 1;
    }

    return {
      base: baseCurrency,
      rates,
      timestamp: Date.now(),
      btcPrice: typeof btcPrice === 'number' ? btcPrice : 0,
    };
  } catch {
    logger.error('[Currency] Failed to fetch exchange rates');
    // Return empty rates on error
    return {
      base: baseCurrency,
      rates: {},
      timestamp: Date.now(),
      btcPrice: 0,
    };
  }
}

// Get grouped currencies for display in selects
export function getGroupedCurrencies(): { label: string; currencies: Currency[] }[] {
  return [
    { label: 'Bitcoin', currencies: CURRENCIES.filter(c => c.category === 'crypto') },
    { label: 'Major Currencies', currencies: CURRENCIES.filter(c => c.category === 'major') },
    { label: 'Other Currencies', currencies: CURRENCIES.filter(c => c.category === 'other') },
  ];
}
