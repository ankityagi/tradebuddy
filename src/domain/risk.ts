/**
 * TradeBuddy MVP - Risk Calculation Utilities
 *
 * This module provides functions to calculate risk metrics for options trades.
 * All calculations are approximations and should be used for educational purposes.
 */

import type { Leg, Metrics } from './types';

/**
 * Standard normal cumulative distribution function (CDF)
 * Approximation using the error function
 */
function normalCDF(x: number): number {
  // Approximation of the standard normal CDF
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989423 * Math.exp((-x * x) / 2);
  const p =
    d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return x > 0 ? 1 - p : p;
}

/**
 * Calculate maximum risk for a trade
 *
 * For credit spreads: max risk = (strike difference × 100) - premium received
 * For debit spreads: max risk = premium paid
 * For single options: max risk = premium paid (for buys) or theoretically unlimited (for naked sells)
 *
 * @param legs - Array of trade legs
 * @param entryPrice - Net entry price (positive for debit, negative for credit)
 * @param quantity - Number of contracts
 * @returns Maximum potential loss
 */
export function calculateMaxRisk(legs: Leg[], entryPrice: number, quantity: number): number {
  if (legs.length === 0 || quantity === 0) return 0;

  // Single leg
  if (legs.length === 1) {
    const leg = legs[0];
    if (leg.side === 'buy') {
      // Buying: max risk is the premium paid
      return Math.abs(entryPrice) * quantity * (leg.type === 'stock' ? 1 : 100);
    } else {
      // Selling naked: theoretically unlimited, return a placeholder
      // In practice, we'd need more context (e.g., covered call)
      return Infinity;
    }
  }

  // Multi-leg strategies
  // For vertical spreads (2 legs, same type, different strikes)
  if (legs.length === 2) {
    const [leg1, leg2] = legs;

    // Check if it's a vertical spread (same type, different strikes, opposite sides)
    if (
      leg1.type === leg2.type &&
      leg1.type !== 'stock' &&
      leg1.strike !== undefined &&
      leg2.strike !== undefined &&
      leg1.side !== leg2.side
    ) {
      const strikeDiff = Math.abs(leg1.strike - leg2.strike);
      const maxLossPerContract = strikeDiff * 100;

      // Credit spread: max risk = strike difference - premium received
      if (entryPrice < 0) {
        return (maxLossPerContract - Math.abs(entryPrice) * 100) * quantity;
      }
      // Debit spread: max risk = premium paid
      else {
        return Math.abs(entryPrice) * quantity * 100;
      }
    }
  }

  // For more complex strategies, use the net debit as max risk
  // This is a simplification and may not be accurate for all strategies
  if (entryPrice > 0) {
    return entryPrice * quantity * 100;
  }

  // For credit strategies without clear max risk, return undefined
  return 0;
}

/**
 * Calculate maximum reward for a trade
 *
 * For credit spreads: max reward = premium received
 * For debit spreads: max reward = (strike difference × 100) - premium paid
 *
 * @param legs - Array of trade legs
 * @param entryPrice - Net entry price (positive for debit, negative for credit)
 * @param quantity - Number of contracts
 * @returns Maximum potential profit
 */
export function calculateMaxReward(legs: Leg[], entryPrice: number, quantity: number): number {
  if (legs.length === 0 || quantity === 0) return 0;

  // Single leg
  if (legs.length === 1) {
    const leg = legs[0];
    if (leg.side === 'sell') {
      // Selling: max reward is the premium received
      return Math.abs(entryPrice) * quantity * (leg.type === 'stock' ? 1 : 100);
    } else {
      // Buying: theoretically unlimited for calls, limited to strike price for puts
      return Infinity;
    }
  }

  // Multi-leg strategies
  // For vertical spreads
  if (legs.length === 2) {
    const [leg1, leg2] = legs;

    if (
      leg1.type === leg2.type &&
      leg1.type !== 'stock' &&
      leg1.strike !== undefined &&
      leg2.strike !== undefined &&
      leg1.side !== leg2.side
    ) {
      const strikeDiff = Math.abs(leg1.strike - leg2.strike);
      const maxGainPerContract = strikeDiff * 100;

      // Credit spread: max reward = premium received
      if (entryPrice < 0) {
        return Math.abs(entryPrice) * quantity * 100;
      }
      // Debit spread: max reward = strike difference - premium paid
      else {
        return (maxGainPerContract - Math.abs(entryPrice) * 100) * quantity;
      }
    }
  }

  // For credit strategies, return the premium received
  if (entryPrice < 0) {
    return Math.abs(entryPrice) * quantity * 100;
  }

  return 0;
}

/**
 * Calculate risk/reward ratio
 *
 * @param maxRisk - Maximum potential loss
 * @param maxReward - Maximum potential profit
 * @returns Risk/reward ratio (reward/risk)
 */
export function calculateRiskReward(maxRisk: number, maxReward: number): number {
  if (maxRisk === 0 || !isFinite(maxRisk) || !isFinite(maxReward)) {
    return 0;
  }
  return maxReward / maxRisk;
}

/**
 * Calculate breakeven price(s) for a trade
 *
 * For vertical spreads:
 * - Call debit spread: long strike + net debit
 * - Put debit spread: long strike - net debit
 * - Call credit spread: short strike + net credit
 * - Put credit spread: short strike - net credit
 *
 * @param legs - Array of trade legs
 * @param entryPrice - Net entry price
 * @returns Array of breakeven prices
 */
export function calculateBreakeven(legs: Leg[], entryPrice: number): number[] {
  if (legs.length === 0) return [];

  // Single leg option
  if (legs.length === 1) {
    const leg = legs[0];
    if (leg.type === 'stock') {
      return [entryPrice];
    }
    if (leg.strike === undefined) return [];

    const premium = Math.abs(entryPrice);
    if (leg.type === 'call') {
      return [leg.strike + (leg.side === 'buy' ? premium : -premium)];
    } else {
      return [leg.strike - (leg.side === 'buy' ? premium : -premium)];
    }
  }

  // Vertical spread (2 legs)
  if (legs.length === 2) {
    const [leg1, leg2] = legs;

    if (
      leg1.type === leg2.type &&
      leg1.type !== 'stock' &&
      leg1.strike !== undefined &&
      leg2.strike !== undefined &&
      leg1.side !== leg2.side
    ) {
      // Find the long and short leg
      const longLeg = leg1.side === 'buy' ? leg1 : leg2;
      const shortLeg = leg1.side === 'sell' ? leg1 : leg2;

      const netPremium = Math.abs(entryPrice);

      if (leg1.type === 'call') {
        // Debit spread: breakeven = long strike + net debit
        // Credit spread: breakeven = short strike + net credit
        if (entryPrice > 0) {
          return [longLeg.strike! + netPremium];
        } else {
          return [shortLeg.strike! + netPremium];
        }
      } else {
        // Put spread
        if (entryPrice > 0) {
          return [longLeg.strike! - netPremium];
        } else {
          return [shortLeg.strike! - netPremium];
        }
      }
    }
  }

  return [];
}

/**
 * Estimate probability of profit (POP) using normal distribution approximation
 *
 * IMPORTANT: This is a rough estimate based on the Black-Scholes assumption
 * of log-normal price distribution. It requires current price and implied volatility.
 *
 * For MVP, we'll use a simplified calculation or return undefined if data is missing.
 *
 * @param breakeven - Breakeven price(s)
 * @param currentPrice - Current underlying price (optional)
 * @param iv - Implied volatility as decimal (optional, e.g., 0.30 for 30%)
 * @param daysToExpiry - Days until expiration (optional)
 * @returns Estimated probability of profit (0-1), or undefined
 */
export function estimatePOP(
  breakeven: number[],
  currentPrice?: number,
  iv?: number,
  daysToExpiry?: number
): number | undefined {
  if (
    breakeven.length === 0 ||
    currentPrice === undefined ||
    iv === undefined ||
    daysToExpiry === undefined ||
    daysToExpiry <= 0
  ) {
    return undefined;
  }

  // Simplified POP calculation using normal distribution
  // This assumes the stock price follows a log-normal distribution
  const timeInYears = daysToExpiry / 365;
  const stdDev = currentPrice * iv * Math.sqrt(timeInYears);

  // For a single breakeven (most common case)
  if (breakeven.length === 1) {
    const be = breakeven[0];
    const zScore = (be - currentPrice) / stdDev;

    // If breakeven is below current price, we profit if price stays above breakeven
    if (be < currentPrice) {
      return normalCDF(-zScore);
    } else {
      // If breakeven is above current price, we profit if price goes above breakeven
      return normalCDF(zScore);
    }
  }

  // For multiple breakevens (e.g., iron condor), calculate range
  if (breakeven.length === 2) {
    const [be1, be2] = breakeven.sort((a, b) => a - b);
    const z1 = (be1 - currentPrice) / stdDev;
    const z2 = (be2 - currentPrice) / stdDev;

    // Probability of being within the range
    return normalCDF(z2) - normalCDF(z1);
  }

  return undefined;
}

/**
 * Compute all metrics for a trade
 *
 * @param trade - Trade with legs, entryPrice, and quantity
 * @param currentPrice - Current underlying price (optional, for POP)
 * @param iv - Implied volatility (optional, for POP)
 * @param daysToExpiry - Days to expiration (optional, for POP)
 * @returns Computed metrics
 */
export function computeMetrics(
  legs: Leg[],
  entryPrice: number,
  quantity: number,
  currentPrice?: number,
  iv?: number,
  daysToExpiry?: number
): Metrics {
  const maxRisk = calculateMaxRisk(legs, entryPrice, quantity);
  const maxReward = calculateMaxReward(legs, entryPrice, quantity);
  const rr = calculateRiskReward(maxRisk, maxReward);
  const breakeven = calculateBreakeven(legs, entryPrice);
  const popEst = estimatePOP(breakeven, currentPrice, iv, daysToExpiry);

  return {
    maxRisk: isFinite(maxRisk) ? maxRisk : undefined,
    maxReward: isFinite(maxReward) ? maxReward : undefined,
    rr: isFinite(rr) ? rr : undefined,
    breakeven: breakeven.length > 0 ? breakeven : undefined,
    popEst,
  };
}
