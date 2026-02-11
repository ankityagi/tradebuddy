// Greeks Calculation Service
// Uses Black-Scholes model to calculate option Greeks

import * as blackScholes from '@uqee/black-scholes';
import { getStockPrice, getImpliedVolatility } from './marketData';

// Current risk-free rate (approximate US Treasury rate)
const RISK_FREE_RATE = 0.05; // 5%

export interface GreeksResult {
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  rho: number;
  iv: number; // Implied Volatility
  stockPrice: number;
}

export interface GreeksInput {
  ticker: string;
  strike: number;
  expiry: string; // YYYY-MM-DD or MM/DD/YYYY format
  optionType: 'call' | 'put';
  premium?: number; // Current option price (for IV calculation)
}

/**
 * Parse expiry date from various formats
 */
function parseExpiryDate(expiry: string): Date {
  // Handle MM/DD/YYYY format
  if (expiry.includes('/')) {
    const [month, day, year] = expiry.split('/');
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  }
  // Handle YYYY-MM-DD format
  return new Date(expiry);
}

/**
 * Calculate time to expiration in years
 */
function getTimeToExpiration(expiry: string): number {
  const expiryDate = parseExpiryDate(expiry);
  const now = new Date();
  const diffMs = expiryDate.getTime() - now.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  // Minimum of 1 day to avoid division by zero
  const days = Math.max(diffDays, 1);

  // Convert to years (trading days basis: 252 days/year)
  return days / 365;
}

/**
 * Calculate Delta and IV for an option
 */
export async function calculateGreeks(input: GreeksInput): Promise<GreeksResult | null> {
  try {
    // Get current stock price
    const quote = await getStockPrice(input.ticker);
    const stockPrice = quote.price;

    // Get time to expiration
    const timeToExpiry = getTimeToExpiration(input.expiry);

    if (timeToExpiry <= 0) {
      // Option has expired
      return {
        delta: input.optionType === 'call' ? (stockPrice > input.strike ? 1 : 0) : (stockPrice < input.strike ? -1 : 0),
        gamma: 0,
        theta: 0,
        vega: 0,
        rho: 0,
        iv: 0,
        stockPrice,
      };
    }

    // Try to get IV from options chain
    let iv = await getImpliedVolatility(input.ticker, input.strike, input.expiry, input.optionType);

    // If IV not available from chain, estimate it or use default
    if (!iv || iv <= 0) {
      // Use a default IV based on option type and moneyness
      const moneyness = stockPrice / input.strike;
      if (moneyness > 1.1 || moneyness < 0.9) {
        iv = 0.4; // Higher IV for OTM options
      } else {
        iv = 0.25; // Lower IV for ATM options
      }
    }

    // Calculate Greeks using Black-Scholes
    const isCall = input.optionType === 'call';

    // Calculate d1 and d2 for Black-Scholes
    const d1 = (Math.log(stockPrice / input.strike) + (RISK_FREE_RATE + (iv * iv) / 2) * timeToExpiry) / (iv * Math.sqrt(timeToExpiry));
    const d2 = d1 - iv * Math.sqrt(timeToExpiry);

    // Standard normal CDF
    const N = (x: number): number => {
      const a1 = 0.254829592;
      const a2 = -0.284496736;
      const a3 = 1.421413741;
      const a4 = -1.453152027;
      const a5 = 1.061405429;
      const p = 0.3275911;

      const sign = x < 0 ? -1 : 1;
      x = Math.abs(x) / Math.sqrt(2);

      const t = 1.0 / (1.0 + p * x);
      const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

      return 0.5 * (1.0 + sign * y);
    };

    // Standard normal PDF
    const n = (x: number): number => {
      return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
    };

    // Delta
    let delta: number;
    if (isCall) {
      delta = N(d1);
    } else {
      delta = N(d1) - 1;
    }

    // Gamma (same for calls and puts)
    const gamma = n(d1) / (stockPrice * iv * Math.sqrt(timeToExpiry));

    // Theta (per day)
    let theta: number;
    const commonTheta = -(stockPrice * n(d1) * iv) / (2 * Math.sqrt(timeToExpiry));
    if (isCall) {
      theta = (commonTheta - RISK_FREE_RATE * input.strike * Math.exp(-RISK_FREE_RATE * timeToExpiry) * N(d2)) / 365;
    } else {
      theta = (commonTheta + RISK_FREE_RATE * input.strike * Math.exp(-RISK_FREE_RATE * timeToExpiry) * N(-d2)) / 365;
    }

    // Vega (per 1% change in IV)
    const vega = stockPrice * Math.sqrt(timeToExpiry) * n(d1) / 100;

    // Rho (per 1% change in interest rate)
    let rho: number;
    if (isCall) {
      rho = input.strike * timeToExpiry * Math.exp(-RISK_FREE_RATE * timeToExpiry) * N(d2) / 100;
    } else {
      rho = -input.strike * timeToExpiry * Math.exp(-RISK_FREE_RATE * timeToExpiry) * N(-d2) / 100;
    }

    return {
      delta: Math.round(delta * 10000) / 10000, // Round to 4 decimal places
      gamma: Math.round(gamma * 10000) / 10000,
      theta: Math.round(theta * 100) / 100,
      vega: Math.round(vega * 100) / 100,
      rho: Math.round(rho * 100) / 100,
      iv: Math.round(iv * 10000) / 100, // Convert to percentage
      stockPrice,
    };
  } catch (error) {
    console.error(`Failed to calculate Greeks for ${input.ticker}:`, error);
    return null;
  }
}

/**
 * Determine option type from strategy string
 */
export function parseOptionType(strategy: string): 'call' | 'put' {
  const strategyLower = strategy.toLowerCase();

  if (
    strategyLower.includes('call') ||
    strategyLower === 'cc' ||
    strategyLower.includes('covered call')
  ) {
    return 'call';
  }

  return 'put';
}

/**
 * Calculate Greeks for multiple options
 */
export async function calculateGreeksForMultiple(
  options: GreeksInput[]
): Promise<Map<string, GreeksResult | null>> {
  const results = new Map<string, GreeksResult | null>();

  // Process in parallel with batching
  const batchSize = 3;
  for (let i = 0; i < options.length; i += batchSize) {
    const batch = options.slice(i, i + batchSize);
    const promises = batch.map(async (option, idx) => {
      const key = `${option.ticker}-${option.strike}-${option.expiry}`;
      const greeks = await calculateGreeks(option);
      results.set(key, greeks);
    });
    await Promise.all(promises);

    // Small delay between batches to avoid rate limiting
    if (i + batchSize < options.length) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  return results;
}
