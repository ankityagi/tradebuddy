import { describe, it, expect } from 'vitest';
import {
  computePortfolioSummary,
  computeStockSummaries,
  computePortfolioTrend,
  computeStockTrends,
} from '../src/domain/dashboard';
import type { Trade } from '../src/domain/types';

function makeTrade(overrides: Partial<Trade> = {}): Trade {
  return {
    id: 'test-1',
    ticker: 'AAPL',
    strategy: 'singleOption',
    legs: [{ type: 'put', side: 'sell', strike: 150, quantity: 1 }],
    entryPrice: 2.5,
    quantity: 1,
    status: 'closed',
    metrics: {},
    createdAt: '2025-01-15T10:00:00Z',
    updatedAt: '2025-01-15T10:00:00Z',
    closedAt: '2025-02-01T10:00:00Z',
    realizedPL: 250,
    ...overrides,
  };
}

describe('Dashboard Metrics', () => {
  describe('computePortfolioSummary', () => {
    it('returns zeros for empty trades', () => {
      const summary = computePortfolioSummary([]);
      expect(summary.totalPL).toBe(0);
      expect(summary.roiPercent).toBe(0);
      expect(summary.winRate).toBe(0);
      expect(summary.totalClosed).toBe(0);
      expect(summary.totalOpen).toBe(0);
    });

    it('computes summary for closed trades', () => {
      const trades = [
        makeTrade({ id: '1', realizedPL: 250, entryPrice: 2.5, quantity: 1 }),
        makeTrade({ id: '2', realizedPL: -100, entryPrice: 1.0, quantity: 1 }),
        makeTrade({ id: '3', realizedPL: 150, entryPrice: 1.5, quantity: 1 }),
      ];
      const summary = computePortfolioSummary(trades);
      expect(summary.totalPL).toBe(300);
      expect(summary.totalClosed).toBe(3);
      expect(summary.winRate).toBeCloseTo(2 / 3);
      expect(summary.roiPercent).toBeGreaterThan(0);
    });

    it('excludes open trades from P/L', () => {
      const trades = [
        makeTrade({ id: '1', status: 'closed', realizedPL: 100 }),
        makeTrade({ id: '2', status: 'open', realizedPL: undefined }),
      ];
      const summary = computePortfolioSummary(trades);
      expect(summary.totalPL).toBe(100);
      expect(summary.totalClosed).toBe(1);
      expect(summary.totalOpen).toBe(1);
    });

    it('computes ROI based on capital deployed', () => {
      // One trade: entryPrice 2.0, quantity 1, multiplier 100 = $200 capital
      // realizedPL $50 -> ROI = 50/200 * 100 = 25%
      const trades = [makeTrade({ entryPrice: 2.0, quantity: 1, realizedPL: 50 })];
      const summary = computePortfolioSummary(trades);
      expect(summary.roiPercent).toBeCloseTo(25);
    });

    it('uses multiplier of 1 for stock strategy', () => {
      // stock: entryPrice 100, quantity 10, multiplier 1 = $1000 capital
      // realizedPL $200 -> ROI = 200/1000 * 100 = 20%
      const trades = [
        makeTrade({
          strategy: 'stock',
          entryPrice: 100,
          quantity: 10,
          realizedPL: 200,
        }),
      ];
      const summary = computePortfolioSummary(trades);
      expect(summary.roiPercent).toBeCloseTo(20);
    });
  });

  describe('computeStockSummaries', () => {
    it('returns empty array for no trades', () => {
      expect(computeStockSummaries([])).toEqual([]);
    });

    it('groups trades by ticker', () => {
      const trades = [
        makeTrade({ id: '1', ticker: 'AAPL', realizedPL: 100 }),
        makeTrade({ id: '2', ticker: 'AAPL', realizedPL: 50 }),
        makeTrade({ id: '3', ticker: 'TSLA', realizedPL: -30 }),
      ];
      const summaries = computeStockSummaries(trades);
      expect(summaries).toHaveLength(2);

      const aapl = summaries.find((s) => s.ticker === 'AAPL')!;
      expect(aapl.totalPL).toBe(150);
      expect(aapl.closedCount).toBe(2);

      const tsla = summaries.find((s) => s.ticker === 'TSLA')!;
      expect(tsla.totalPL).toBe(-30);
      expect(tsla.closedCount).toBe(1);
    });

    it('normalizes ticker case', () => {
      const trades = [
        makeTrade({ id: '1', ticker: 'aapl', realizedPL: 100 }),
        makeTrade({ id: '2', ticker: 'AAPL', realizedPL: 50 }),
      ];
      const summaries = computeStockSummaries(trades);
      expect(summaries).toHaveLength(1);
      expect(summaries[0].totalPL).toBe(150);
    });

    it('sorts by P/L descending', () => {
      const trades = [
        makeTrade({ id: '1', ticker: 'LOSE', realizedPL: -200 }),
        makeTrade({ id: '2', ticker: 'WIN', realizedPL: 500 }),
        makeTrade({ id: '3', ticker: 'MEH', realizedPL: 10 }),
      ];
      const summaries = computeStockSummaries(trades);
      expect(summaries[0].ticker).toBe('WIN');
      expect(summaries[1].ticker).toBe('MEH');
      expect(summaries[2].ticker).toBe('LOSE');
    });

    it('computes win rate per stock', () => {
      const trades = [
        makeTrade({ id: '1', ticker: 'AAPL', realizedPL: 100 }),
        makeTrade({ id: '2', ticker: 'AAPL', realizedPL: -50 }),
        makeTrade({ id: '3', ticker: 'AAPL', realizedPL: 75 }),
      ];
      const summaries = computeStockSummaries(trades);
      expect(summaries[0].winRate).toBeCloseTo(2 / 3);
    });
  });

  describe('computePortfolioTrend', () => {
    it('returns empty for no closed trades', () => {
      expect(computePortfolioTrend([])).toEqual([]);
      expect(computePortfolioTrend([makeTrade({ status: 'open', realizedPL: undefined })])).toEqual(
        []
      );
    });

    it('computes cumulative P/L over time', () => {
      const trades = [
        makeTrade({
          id: '1',
          closedAt: '2025-01-10',
          realizedPL: 100,
          entryPrice: 1,
          quantity: 1,
        }),
        makeTrade({
          id: '2',
          closedAt: '2025-01-20',
          realizedPL: -50,
          entryPrice: 1,
          quantity: 1,
        }),
        makeTrade({
          id: '3',
          closedAt: '2025-02-05',
          realizedPL: 200,
          entryPrice: 2,
          quantity: 1,
        }),
      ];
      const trend = computePortfolioTrend(trades);
      expect(trend).toHaveLength(3);
      expect(trend[0].cumulativePL).toBe(100);
      expect(trend[1].cumulativePL).toBe(50); // 100 - 50
      expect(trend[2].cumulativePL).toBe(250); // 50 + 200
    });

    it('groups trades on the same date', () => {
      const trades = [
        makeTrade({ id: '1', closedAt: '2025-01-10', realizedPL: 100 }),
        makeTrade({ id: '2', closedAt: '2025-01-10', realizedPL: 50 }),
      ];
      const trend = computePortfolioTrend(trades);
      expect(trend).toHaveLength(1);
      expect(trend[0].cumulativePL).toBe(150);
    });

    it('computes ROI trend correctly', () => {
      // Trade 1: entryPrice 1, qty 1, mult 100 => $100 capital, PL $50
      // Trade 2: entryPrice 2, qty 1, mult 100 => $200 capital, PL $100
      const trades = [
        makeTrade({ id: '1', closedAt: '2025-01-10', realizedPL: 50, entryPrice: 1, quantity: 1 }),
        makeTrade({
          id: '2',
          closedAt: '2025-01-20',
          realizedPL: 100,
          entryPrice: 2,
          quantity: 1,
        }),
      ];
      const trend = computePortfolioTrend(trades);
      // After day 1: cumPL=50, cumCapital=100, ROI=50%
      expect(trend[0].roiPercent).toBeCloseTo(50);
      // After day 2: cumPL=150, cumCapital=300, ROI=50%
      expect(trend[1].roiPercent).toBeCloseTo(50);
    });
  });

  describe('computeStockTrends', () => {
    it('returns empty for no closed trades', () => {
      expect(computeStockTrends([])).toEqual([]);
    });

    it('separates trends by ticker', () => {
      const trades = [
        makeTrade({ id: '1', ticker: 'AAPL', closedAt: '2025-01-10', realizedPL: 100 }),
        makeTrade({ id: '2', ticker: 'TSLA', closedAt: '2025-01-15', realizedPL: 200 }),
        makeTrade({ id: '3', ticker: 'AAPL', closedAt: '2025-01-20', realizedPL: -50 }),
      ];
      const trends = computeStockTrends(trades);
      expect(trends).toHaveLength(2);

      const tsla = trends.find((t) => t.ticker === 'TSLA')!;
      expect(tsla.points).toHaveLength(1);
      expect(tsla.points[0].cumulativePL).toBe(200);

      const aapl = trends.find((t) => t.ticker === 'AAPL')!;
      expect(aapl.points).toHaveLength(2);
      expect(aapl.points[0].cumulativePL).toBe(100);
      expect(aapl.points[1].cumulativePL).toBe(50);
    });

    it('sorts trends by final P/L descending', () => {
      const trades = [
        makeTrade({ id: '1', ticker: 'LOSE', realizedPL: -100 }),
        makeTrade({ id: '2', ticker: 'WIN', realizedPL: 500 }),
      ];
      const trends = computeStockTrends(trades);
      expect(trends[0].ticker).toBe('WIN');
      expect(trends[1].ticker).toBe('LOSE');
    });

    it('skips open trades', () => {
      const trades = [
        makeTrade({ id: '1', ticker: 'AAPL', status: 'open', realizedPL: undefined }),
        makeTrade({ id: '2', ticker: 'AAPL', status: 'closed', realizedPL: 100 }),
      ];
      const trends = computeStockTrends(trades);
      expect(trends).toHaveLength(1);
      expect(trends[0].points).toHaveLength(1);
    });
  });
});
