import { describe, it, expect } from 'vitest';
import {
  calculateMaxRisk,
  calculateMaxReward,
  calculateRiskReward,
  calculateBreakeven,
  estimatePOP,
  computeMetrics,
} from '../src/domain/risk';
import type { Leg } from '../src/domain/types';

describe('Risk Calculations', () => {
  describe('calculateMaxRisk', () => {
    it('calculates max risk for a debit spread', () => {
      const legs: Leg[] = [
        { type: 'call', side: 'buy', strike: 100, quantity: 1, price: 5 },
        { type: 'call', side: 'sell', strike: 105, quantity: 1, price: 3 },
      ];
      const entryPrice = 2; // Net debit
      const quantity = 1;

      const maxRisk = calculateMaxRisk(legs, entryPrice, quantity);
      expect(maxRisk).toBe(200); // $2 * 1 contract * 100
    });

    it('calculates max risk for a credit spread', () => {
      const legs: Leg[] = [
        { type: 'put', side: 'sell', strike: 100, quantity: 1, price: 3 },
        { type: 'put', side: 'buy', strike: 95, quantity: 1, price: 1 },
      ];
      const entryPrice = -2; // Net credit
      const quantity = 1;

      const maxRisk = calculateMaxRisk(legs, entryPrice, quantity);
      // Max risk = (strike difference - premium) * 100
      // = (5 - 2) * 100 = 300
      expect(maxRisk).toBe(300);
    });

    it('calculates max risk for a single long option', () => {
      const legs: Leg[] = [{ type: 'call', side: 'buy', strike: 100, quantity: 1, price: 5 }];
      const entryPrice = 5;
      const quantity = 1;

      const maxRisk = calculateMaxRisk(legs, entryPrice, quantity);
      expect(maxRisk).toBe(500); // $5 * 1 * 100
    });

    it('returns 0 for empty legs', () => {
      const maxRisk = calculateMaxRisk([], 0, 0);
      expect(maxRisk).toBe(0);
    });
  });

  describe('calculateMaxReward', () => {
    it('calculates max reward for a credit spread', () => {
      const legs: Leg[] = [
        { type: 'put', side: 'sell', strike: 100, quantity: 1, price: 3 },
        { type: 'put', side: 'buy', strike: 95, quantity: 1, price: 1 },
      ];
      const entryPrice = -2; // Net credit
      const quantity = 1;

      const maxReward = calculateMaxReward(legs, entryPrice, quantity);
      expect(maxReward).toBe(200); // Premium received * quantity
    });

    it('calculates max reward for a debit spread', () => {
      const legs: Leg[] = [
        { type: 'call', side: 'buy', strike: 100, quantity: 1, price: 5 },
        { type: 'call', side: 'sell', strike: 105, quantity: 1, price: 3 },
      ];
      const entryPrice = 2; // Net debit
      const quantity = 1;

      const maxReward = calculateMaxReward(legs, entryPrice, quantity);
      // Max reward = (strike diff - premium) * 100
      // = (5 - 2) * 100 = 300
      expect(maxReward).toBe(300);
    });
  });

  describe('calculateRiskReward', () => {
    it('calculates R/R ratio correctly', () => {
      const rr = calculateRiskReward(300, 200);
      expect(rr).toBeCloseTo(0.67, 2);
    });

    it('calculates R/R ratio for favorable trade', () => {
      const rr = calculateRiskReward(100, 200);
      expect(rr).toBe(2);
    });

    it('returns 0 for zero risk', () => {
      const rr = calculateRiskReward(0, 200);
      expect(rr).toBe(0);
    });

    it('handles infinite values', () => {
      const rr = calculateRiskReward(Infinity, 200);
      expect(rr).toBe(0);
    });
  });

  describe('calculateBreakeven', () => {
    it('calculates breakeven for a call debit spread', () => {
      const legs: Leg[] = [
        { type: 'call', side: 'buy', strike: 100, quantity: 1 },
        { type: 'call', side: 'sell', strike: 105, quantity: 1 },
      ];
      const entryPrice = 2; // Net debit

      const breakeven = calculateBreakeven(legs, entryPrice);
      expect(breakeven).toEqual([102]); // Long strike + premium
    });

    it('calculates breakeven for a put debit spread', () => {
      const legs: Leg[] = [
        { type: 'put', side: 'buy', strike: 100, quantity: 1 },
        { type: 'put', side: 'sell', strike: 95, quantity: 1 },
      ];
      const entryPrice = 2; // Net debit

      const breakeven = calculateBreakeven(legs, entryPrice);
      expect(breakeven).toEqual([98]); // Long strike - premium
    });

    it('calculates breakeven for a single call', () => {
      const legs: Leg[] = [{ type: 'call', side: 'buy', strike: 100, quantity: 1 }];
      const entryPrice = 5;

      const breakeven = calculateBreakeven(legs, entryPrice);
      expect(breakeven).toEqual([105]); // Strike + premium
    });

    it('calculates breakeven for a single put', () => {
      const legs: Leg[] = [{ type: 'put', side: 'buy', strike: 100, quantity: 1 }];
      const entryPrice = 5;

      const breakeven = calculateBreakeven(legs, entryPrice);
      expect(breakeven).toEqual([95]); // Strike - premium
    });

    it('returns empty array for empty legs', () => {
      const breakeven = calculateBreakeven([], 0);
      expect(breakeven).toEqual([]);
    });
  });

  describe('estimatePOP', () => {
    it('returns undefined when data is missing', () => {
      const pop = estimatePOP([100]);
      expect(pop).toBeUndefined();
    });

    it('estimates POP with valid inputs', () => {
      const breakeven = [105];
      const currentPrice = 100;
      const iv = 0.3; // 30% IV
      const daysToExpiry = 30;

      const pop = estimatePOP(breakeven, currentPrice, iv, daysToExpiry);
      expect(pop).toBeDefined();
      expect(pop).toBeGreaterThan(0);
      expect(pop).toBeLessThan(1);
    });

    it('returns undefined for zero days to expiry', () => {
      const pop = estimatePOP([105], 100, 0.3, 0);
      expect(pop).toBeUndefined();
    });
  });

  describe('computeMetrics', () => {
    it('computes all metrics for a vertical spread', () => {
      const legs: Leg[] = [
        { type: 'call', side: 'buy', strike: 100, quantity: 1, price: 5 },
        { type: 'call', side: 'sell', strike: 105, quantity: 1, price: 3 },
      ];
      const entryPrice = 2;
      const quantity = 1;

      const metrics = computeMetrics(legs, entryPrice, quantity);

      expect(metrics.maxRisk).toBe(200);
      expect(metrics.maxReward).toBe(300);
      expect(metrics.rr).toBeCloseTo(1.5, 2);
      expect(metrics.breakeven).toEqual([102]);
      expect(metrics.popEst).toBeUndefined(); // No market data provided
    });

    it('computes metrics with market data', () => {
      const legs: Leg[] = [
        { type: 'put', side: 'sell', strike: 100, quantity: 1 },
        { type: 'put', side: 'buy', strike: 95, quantity: 1 },
      ];
      const entryPrice = -2;
      const quantity = 1;
      const currentPrice = 105;
      const iv = 0.25;
      const daysToExpiry = 45;

      const metrics = computeMetrics(legs, entryPrice, quantity, currentPrice, iv, daysToExpiry);

      expect(metrics.maxRisk).toBe(300);
      expect(metrics.maxReward).toBe(200);
      expect(metrics.popEst).toBeDefined();
    });
  });
});
