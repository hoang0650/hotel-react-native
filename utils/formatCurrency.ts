/**
 * Format a number as Vietnamese currency
 * @param value - The number to format
 * @returns Formatted string (e.g., "1,000,000")
 */
export function formatCurrency(value: number | undefined | null): string {
  if (value === undefined || value === null || isNaN(value)) {
    return '0';
  }
  return new Intl.NumberFormat('vi-VN').format(value);
}

// --- Currency exchange utils (align with Angular CurrencyService) ---

let ratesCache: { [key: string]: number } | null = null;
let ratesTimestamp = 0;
const CACHE_TTL_MS = 60 * 60 * 1000;
const API_URL = 'https://v6.exchangerate-api.com/v6/f69c17a8a7bded3db484e7e5/latest/USD';

// Fallback default rates when API not available (USD base)
const defaultRates: { [key: string]: number } = {
  EUR: 0.8588,
  GBP: 0.7506,
  JPY: 155.7349,
  AUD: 1.5086,
  CAD: 1.3839,
  CHF: 0.8063,
  CNY: 7.0779,
  SGD: 1.2972,
  HKD: 7.7805,
  THB: 31.8760,
  VND: 26254.1183,
};

function isCacheValid(): boolean {
  return !!ratesCache && (Date.now() - ratesTimestamp) < CACHE_TTL_MS;
}

async function fetchAllRates(): Promise<{ [key: string]: number }> {
  if (isCacheValid()) {
    return ratesCache as { [key: string]: number };
  }
  try {
    const res = await fetch(API_URL);
    const data = await res.json();
    if (data?.result === 'success' && data?.conversion_rates) {
      ratesCache = data.conversion_rates;
      ratesTimestamp = Date.now();
      return data.conversion_rates;
    }
    throw new Error('Invalid API response');
  } catch (err) {
    ratesCache = defaultRates;
    ratesTimestamp = Date.now();
    return defaultRates;
  }
}

export async function getExchangeRate(fromCurrency: string, toCurrency: string): Promise<number> {
  const from = (fromCurrency || 'VND').toUpperCase();
  const to = (toCurrency || 'USD').toUpperCase();
  if (from === to) return 1;
  const rates = await fetchAllRates();
  if (from === 'USD') {
    return rates[to] || defaultRates[to] || 1;
  }
  if (to === 'USD') {
    const fromRate = rates[from] || defaultRates[from] || 1;
    return 1 / fromRate;
  }
  // Cross conversion via USD
  const toRate = rates[to] || defaultRates[to] || 1;
  const fromRate = rates[from] || defaultRates[from] || 1;
  return toRate / fromRate;
}

export async function getUsdRateFromVnd(): Promise<number> {
  return getExchangeRate('VND', 'USD');
}

export function roundAmount(amount: number, currency: string): number {
  const noDecimal = ['JPY', 'VND', 'KRW'];
  if (noDecimal.includes(currency.toUpperCase())) {
    return Math.round(amount);
  }
  return Math.round(amount * 100) / 100;
}

export function formatUSDLocal(amountVND: number, usdRate: number): string {
  const value = Number(amountVND || 0) * (usdRate || 0);
  const rounded = roundAmount(value, 'USD');
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(rounded);
}

