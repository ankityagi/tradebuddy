/**
 * TradeBuddy - Dashboard Metrics Computation
 *
 * Pure functions that derive P/L, ROI, and trend data from trades.
 */

import type { Trade } from './types';

/** Summary metrics for the entire portfolio or a single stock */
export interface PortfolioSummary {
  totalPL: number;
  roiPercent: number;
  winRate: number;
  totalClosed: number;
  totalOpen: number;
  totalCapitalDeployed: number;
}

/** Per-stock breakdown row */
export interface StockSummary {
  ticker: string;
  totalPL: number;
  roiPercent: number;
  winRate: number;
  closedCount: number;
  openCount: number;
  capitalDeployed: number;
}

/** Single data point on a trend line */
export interface TrendPoint {
  date: string; // YYYY-MM-DD
  cumulativePL: number;
  roiPercent: number;
}

/** Trend data for one stock */
export interface StockTrend {
  ticker: string;
  points: TrendPoint[];
}

/**
 * Estimate capital deployed for a single trade.
 * For options (non-stock strategies), each contract represents 100 shares.
 * For stock positions, it's just entryPrice * quantity.
 */
function capitalDeployed(trade: Trade): number {
  const multiplier = trade.strategy === 'stock' ? 1 : 100;
  return Math.abs(trade.entryPrice) * trade.quantity * multiplier;
}

/**
 * Compute overall portfolio summary from all trades.
 */
export function computePortfolioSummary(trades: Trade[]): PortfolioSummary {
  const closed = trades.filter((t) => t.status === 'closed');
  const open = trades.filter((t) => t.status === 'open');

  const totalPL = closed.reduce((sum, t) => sum + (t.realizedPL ?? 0), 0);
  const totalCapitalDeployed = closed.reduce((sum, t) => sum + capitalDeployed(t), 0);
  const winners = closed.filter((t) => (t.realizedPL ?? 0) > 0).length;
  const winRate = closed.length > 0 ? winners / closed.length : 0;
  const roiPercent = totalCapitalDeployed > 0 ? (totalPL / totalCapitalDeployed) * 100 : 0;

  return {
    totalPL,
    roiPercent,
    winRate,
    totalClosed: closed.length,
    totalOpen: open.length,
    totalCapitalDeployed,
  };
}

/**
 * Compute per-stock summary breakdown.
 * Returns an array sorted by total P/L descending.
 */
export function computeStockSummaries(trades: Trade[]): StockSummary[] {
  const byTicker = new Map<string, Trade[]>();

  for (const trade of trades) {
    const ticker = trade.ticker.toUpperCase();
    if (!byTicker.has(ticker)) {
      byTicker.set(ticker, []);
    }
    byTicker.get(ticker)!.push(trade);
  }

  const summaries: StockSummary[] = [];

  for (const [ticker, tickerTrades] of byTicker) {
    const closed = tickerTrades.filter((t) => t.status === 'closed');
    const open = tickerTrades.filter((t) => t.status === 'open');
    const totalPL = closed.reduce((sum, t) => sum + (t.realizedPL ?? 0), 0);
    const deployed = closed.reduce((sum, t) => sum + capitalDeployed(t), 0);
    const winners = closed.filter((t) => (t.realizedPL ?? 0) > 0).length;

    summaries.push({
      ticker,
      totalPL,
      roiPercent: deployed > 0 ? (totalPL / deployed) * 100 : 0,
      winRate: closed.length > 0 ? winners / closed.length : 0,
      closedCount: closed.length,
      openCount: open.length,
      capitalDeployed: deployed,
    });
  }

  summaries.sort((a, b) => b.totalPL - a.totalPL);
  return summaries;
}

/**
 * Parse a date string to YYYY-MM-DD format.
 * Handles ISO timestamps and date-only strings.
 */
function toDateKey(dateStr: string): string {
  if (!dateStr) return '1970-01-01';
  // If it's already YYYY-MM-DD, use it directly
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  // Otherwise parse and format
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '1970-01-01';
  return d.toISOString().split('T')[0];
}

/**
 * Compute cumulative P/L trend for the entire portfolio.
 * Uses closedAt (or createdAt as fallback) to order trades chronologically.
 */
export function computePortfolioTrend(trades: Trade[]): TrendPoint[] {
  const closed = trades
    .filter((t) => t.status === 'closed' && t.realizedPL !== undefined)
    .sort((a, b) => {
      const dateA = a.closedAt || a.createdAt;
      const dateB = b.closedAt || b.createdAt;
      return new Date(dateA).getTime() - new Date(dateB).getTime();
    });

  if (closed.length === 0) return [];

  // Group by date and accumulate
  const dailyPL = new Map<string, number>();
  const dailyCapital = new Map<string, number>();

  for (const trade of closed) {
    const dateKey = toDateKey(trade.closedAt || trade.createdAt);
    dailyPL.set(dateKey, (dailyPL.get(dateKey) ?? 0) + (trade.realizedPL ?? 0));
    dailyCapital.set(dateKey, (dailyCapital.get(dateKey) ?? 0) + capitalDeployed(trade));
  }

  const sortedDates = [...dailyPL.keys()].sort();
  const points: TrendPoint[] = [];
  let cumulativePL = 0;
  let cumulativeCapital = 0;

  for (const date of sortedDates) {
    cumulativePL += dailyPL.get(date)!;
    cumulativeCapital += dailyCapital.get(date)!;
    points.push({
      date,
      cumulativePL,
      roiPercent: cumulativeCapital > 0 ? (cumulativePL / cumulativeCapital) * 100 : 0,
    });
  }

  return points;
}

/**
 * Compute per-stock cumulative P/L trends.
 * Returns trends for all tickers that have closed trades.
 */
export function computeStockTrends(trades: Trade[]): StockTrend[] {
  const byTicker = new Map<string, Trade[]>();

  for (const trade of trades) {
    if (trade.status !== 'closed' || trade.realizedPL === undefined) continue;
    const ticker = trade.ticker.toUpperCase();
    if (!byTicker.has(ticker)) {
      byTicker.set(ticker, []);
    }
    byTicker.get(ticker)!.push(trade);
  }

  const trends: StockTrend[] = [];

  for (const [ticker, tickerTrades] of byTicker) {
    const sorted = [...tickerTrades].sort((a, b) => {
      const dateA = a.closedAt || a.createdAt;
      const dateB = b.closedAt || b.createdAt;
      return new Date(dateA).getTime() - new Date(dateB).getTime();
    });

    const points: TrendPoint[] = [];
    let cumulativePL = 0;
    let cumulativeCapital = 0;

    // Group by date
    const dailyPL = new Map<string, number>();
    const dailyCapital = new Map<string, number>();
    for (const trade of sorted) {
      const dateKey = toDateKey(trade.closedAt || trade.createdAt);
      dailyPL.set(dateKey, (dailyPL.get(dateKey) ?? 0) + (trade.realizedPL ?? 0));
      dailyCapital.set(dateKey, (dailyCapital.get(dateKey) ?? 0) + capitalDeployed(trade));
    }

    const sortedDates = [...dailyPL.keys()].sort();
    for (const date of sortedDates) {
      cumulativePL += dailyPL.get(date)!;
      cumulativeCapital += dailyCapital.get(date)!;
      points.push({
        date,
        cumulativePL,
        roiPercent: cumulativeCapital > 0 ? (cumulativePL / cumulativeCapital) * 100 : 0,
      });
    }

    trends.push({ ticker, points });
  }

  // Sort by most total P/L first
  trends.sort((a, b) => {
    const lastA = a.points[a.points.length - 1]?.cumulativePL ?? 0;
    const lastB = b.points[b.points.length - 1]?.cumulativePL ?? 0;
    return lastB - lastA;
  });

  return trends;
}
