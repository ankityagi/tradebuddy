import { describe, it, expect, beforeEach } from 'vitest';
import {
  createTrade,
  getTrade,
  getAllTrades,
  getOpenTrades,
  getClosedTrades,
  updateTrade,
  deleteTrade,
  closeTrade,
  getTradesByTicker,
  clearAllTrades,
} from '../src/data/repo';
import type { CreateTradeInput } from '../src/domain/types';

describe('Repository', () => {
  beforeEach(async () => {
    // Clear all trades before each test
    await clearAllTrades();
  });

  const sampleTradeInput: CreateTradeInput = {
    ticker: 'AAPL',
    strategy: 'vertical',
    legs: [
      { type: 'call', side: 'buy', strike: 150, quantity: 1 },
      { type: 'call', side: 'sell', strike: 155, quantity: 1 },
    ],
    entryPrice: 2.5,
    quantity: 1,
    status: 'open',
    metrics: {
      maxRisk: 250,
      maxReward: 250,
      rr: 1.0,
      breakeven: [152.5],
    },
    assessment: 'Test assessment',
  };

  describe('createTrade', () => {
    it('creates a trade with auto-generated id and timestamps', async () => {
      const trade = await createTrade(sampleTradeInput);

      expect(trade.id).toBeDefined();
      expect(trade.id).toMatch(/^[0-9a-f-]{36}$/); // UUID format
      expect(trade.createdAt).toBeDefined();
      expect(trade.updatedAt).toBeDefined();
      expect(trade.ticker).toBe('AAPL');
      expect(trade.status).toBe('open');
    });

    it('persists the trade to the database', async () => {
      const trade = await createTrade(sampleTradeInput);
      const retrieved = await getTrade(trade.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(trade.id);
      expect(retrieved?.ticker).toBe('AAPL');
    });
  });

  describe('getTrade', () => {
    it('retrieves a trade by id', async () => {
      const created = await createTrade(sampleTradeInput);
      const retrieved = await getTrade(created.id);

      expect(retrieved).toEqual(created);
    });

    it('returns undefined for non-existent id', async () => {
      const retrieved = await getTrade('non-existent-id');
      expect(retrieved).toBeUndefined();
    });
  });

  describe('getAllTrades', () => {
    it('returns empty array when no trades exist', async () => {
      const trades = await getAllTrades();
      expect(trades).toEqual([]);
    });

    it('returns all trades', async () => {
      await createTrade(sampleTradeInput);
      await createTrade({ ...sampleTradeInput, ticker: 'MSFT' });
      await createTrade({ ...sampleTradeInput, ticker: 'GOOGL' });

      const trades = await getAllTrades();
      expect(trades).toHaveLength(3);
    });
  });

  describe('getOpenTrades', () => {
    it('returns only open trades', async () => {
      await createTrade(sampleTradeInput);
      await createTrade({ ...sampleTradeInput, ticker: 'MSFT' });
      await createTrade({ ...sampleTradeInput, ticker: 'GOOGL', status: 'closed' });

      const openTrades = await getOpenTrades();
      expect(openTrades).toHaveLength(2);
      expect(openTrades.every((t) => t.status === 'open')).toBe(true);
    });
  });

  describe('getClosedTrades', () => {
    it('returns only closed trades', async () => {
      await createTrade(sampleTradeInput);
      await createTrade({ ...sampleTradeInput, ticker: 'MSFT', status: 'closed' });
      await createTrade({ ...sampleTradeInput, ticker: 'GOOGL', status: 'closed' });

      const closedTrades = await getClosedTrades();
      expect(closedTrades).toHaveLength(2);
      expect(closedTrades.every((t) => t.status === 'closed')).toBe(true);
    });
  });

  describe('updateTrade', () => {
    it('updates trade fields', async () => {
      const trade = await createTrade(sampleTradeInput);
      const originalUpdatedAt = trade.updatedAt;

      // Wait a bit to ensure timestamp changes
      await new Promise((resolve) => setTimeout(resolve, 10));

      await updateTrade(trade.id, { ticker: 'TSLA', entryPrice: 3.0 });

      const updated = await getTrade(trade.id);
      expect(updated?.ticker).toBe('TSLA');
      expect(updated?.entryPrice).toBe(3.0);
      expect(updated?.updatedAt).not.toBe(originalUpdatedAt);
    });

    it('preserves non-updated fields', async () => {
      const trade = await createTrade(sampleTradeInput);

      await updateTrade(trade.id, { ticker: 'TSLA' });

      const updated = await getTrade(trade.id);
      expect(updated?.strategy).toBe('vertical');
      expect(updated?.quantity).toBe(1);
    });
  });

  describe('deleteTrade', () => {
    it('deletes a trade', async () => {
      const trade = await createTrade(sampleTradeInput);

      await deleteTrade(trade.id);

      const retrieved = await getTrade(trade.id);
      expect(retrieved).toBeUndefined();
    });
  });

  describe('closeTrade', () => {
    it('closes a trade with exit price and realized P/L', async () => {
      const trade = await createTrade(sampleTradeInput);

      // Wait a bit to ensure timestamp changes
      await new Promise((resolve) => setTimeout(resolve, 10));

      await closeTrade(trade.id, 3.5, 100);

      const closed = await getTrade(trade.id);
      expect(closed?.status).toBe('closed');
      expect(closed?.exitPrice).toBe(3.5);
      expect(closed?.realizedPL).toBe(100);
      expect(closed?.closedAt).toBeDefined();
      expect(closed?.updatedAt).not.toBe(trade.updatedAt);
    });
  });

  describe('getTradesByTicker', () => {
    it('filters trades by ticker substring', async () => {
      await createTrade(sampleTradeInput); // AAPL
      await createTrade({ ...sampleTradeInput, ticker: 'MSFT' });
      await createTrade({ ...sampleTradeInput, ticker: 'GOOGL' });

      const trades = await getTradesByTicker('AA');
      expect(trades).toHaveLength(1);
      expect(trades[0].ticker).toBe('AAPL');
    });

    it('is case-insensitive', async () => {
      await createTrade(sampleTradeInput); // AAPL

      const trades = await getTradesByTicker('aapl');
      expect(trades).toHaveLength(1);
    });

    it('returns empty array when no matches', async () => {
      await createTrade(sampleTradeInput); // AAPL

      const trades = await getTradesByTicker('TSLA');
      expect(trades).toHaveLength(0);
    });
  });

  describe('clearAllTrades', () => {
    it('removes all trades from the database', async () => {
      await createTrade(sampleTradeInput);
      await createTrade({ ...sampleTradeInput, ticker: 'MSFT' });
      await createTrade({ ...sampleTradeInput, ticker: 'GOOGL' });

      await clearAllTrades();

      const trades = await getAllTrades();
      expect(trades).toHaveLength(0);
    });
  });
});
