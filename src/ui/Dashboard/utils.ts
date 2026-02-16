/**
 * Dashboard calculation utilities
 */

import type { Trade } from '../../domain/types';

export interface DashboardStats {
  realizedPL: number;
  totalPremium: number;
  unrealizedPL: number | null;
  outstandingPremium: number;
  winRate: number;
  totalTrades: number;
  openTrades: number;
  closedTrades: number;
}

export interface MonthlyData {
  month: string; // YYYY-MM format
  displayMonth: string; // e.g., "Jan 2024"
  csp: number;
  cc: number;
  long: number;
  total: number;
  returnPercent: number;
}

export interface AllocationData {
  name: string;
  value: number;
  color: string;
}

/**
 * Calculate dashboard statistics from trades
 */
export function calculateStats(trades: Trade[]): DashboardStats {
  const closedTrades = trades.filter(t => t.status === 'closed');
  const openTrades = trades.filter(t => t.status === 'open');

  // Realized P&L from closed trades
  const realizedPL = closedTrades.reduce((sum, t) => sum + (t.realizedPL ?? 0), 0);

  // Total premium collected from sell trades
  // entryPrice is the premium value from the "Premium ($)" column - already in dollars
  const totalPremium = trades
    .filter(t => {
      const leg = t.legs[0];
      return leg?.side === 'sell';
    })
    .reduce((sum, t) => sum + (t.entryPrice * t.quantity), 0);

  // Outstanding premium from open sell trades
  const outstandingPremium = openTrades
    .filter(t => {
      const leg = t.legs[0];
      return leg?.side === 'sell';
    })
    .reduce((sum, t) => sum + (t.entryPrice * t.quantity), 0);

  // Win rate: profitable closed trades / total closed trades
  const profitableTrades = closedTrades.filter(t => (t.realizedPL ?? 0) > 0);
  const winRate = closedTrades.length > 0
    ? (profitableTrades.length / closedTrades.length) * 100
    : 0;

  return {
    realizedPL,
    totalPremium,
    unrealizedPL: null, // Needs market data
    outstandingPremium,
    winRate,
    totalTrades: trades.length,
    openTrades: openTrades.length,
    closedTrades: closedTrades.length,
  };
}

/**
 * Group trades by month for performance chart
 */
export function calculateMonthlyPerformance(trades: Trade[]): MonthlyData[] {
  const closedTrades = trades.filter(t => t.status === 'closed' && t.realizedPL !== undefined);

  // Group by month
  const monthlyMap = new Map<string, { csp: number; cc: number; long: number }>();

  closedTrades.forEach(trade => {
    const date = new Date(trade.closedAt || trade.createdAt);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    if (!monthlyMap.has(monthKey)) {
      monthlyMap.set(monthKey, { csp: 0, cc: 0, long: 0 });
    }

    const data = monthlyMap.get(monthKey)!;
    const pl = trade.realizedPL ?? 0;
    const strategy = trade.strategy.toLowerCase();

    if (strategy === 'csp' || strategy.includes('put')) {
      data.csp += pl;
    } else if (strategy === 'cc' || strategy.includes('call') || strategy.includes('covered')) {
      data.cc += pl;
    } else {
      data.long += pl;
    }
  });

  // Convert to array and sort by month
  const result: MonthlyData[] = [];
  const sortedMonths = Array.from(monthlyMap.keys()).sort();

  sortedMonths.forEach(month => {
    const data = monthlyMap.get(month)!;
    const [year, monthNum] = month.split('-');
    const displayMonth = new Date(parseInt(year), parseInt(monthNum) - 1).toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric',
    });

    const total = data.csp + data.cc + data.long;

    result.push({
      month,
      displayMonth,
      csp: data.csp,
      cc: data.cc,
      long: data.long,
      total,
      returnPercent: 0, // Would need account value to calculate
    });
  });

  return result;
}

/**
 * Calculate allocation by ticker
 */
export function calculateAllocationByTicker(trades: Trade[]): AllocationData[] {
  const openTrades = trades.filter(t => t.status === 'open');
  const tickerMap = new Map<string, number>();

  openTrades.forEach(trade => {
    const value = trade.entryPrice * trade.quantity;
    tickerMap.set(trade.ticker, (tickerMap.get(trade.ticker) || 0) + value);
  });

  const colors = ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444', '#06B6D4', '#EC4899'];

  return Array.from(tickerMap.entries())
    .map(([name, value], index) => ({
      name,
      value,
      color: colors[index % colors.length],
    }))
    .sort((a, b) => b.value - a.value);
}

/**
 * Calculate allocation by strategy
 */
export function calculateAllocationByStrategy(trades: Trade[]): AllocationData[] {
  const openTrades = trades.filter(t => t.status === 'open');
  const strategyMap = new Map<string, number>();

  openTrades.forEach(trade => {
    const value = trade.entryPrice * trade.quantity;
    const strategy = categorizeStrategy(trade.strategy);
    strategyMap.set(strategy, (strategyMap.get(strategy) || 0) + value);
  });

  const strategyColors: Record<string, string> = {
    'CSP': '#3B82F6',
    'Covered Call': '#10B981',
    'Long Put': '#8B5CF6',
    'Long Call': '#F59E0B',
    'Other': '#6B7280',
  };

  return Array.from(strategyMap.entries())
    .map(([name, value]) => ({
      name,
      value,
      color: strategyColors[name] || '#6B7280',
    }))
    .sort((a, b) => b.value - a.value);
}

/**
 * Categorize strategy into display name
 */
function categorizeStrategy(strategy: string): string {
  const s = strategy.toLowerCase();
  if (s === 'csp' || s.includes('cash secured')) return 'CSP';
  if (s === 'cc' || s.includes('covered call')) return 'Covered Call';
  if (s === 'put' || s === 'long put') return 'Long Put';
  if (s === 'call' || s === 'long call') return 'Long Call';
  return 'Other';
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number): string {
  const isNegative = amount < 0;
  const formatted = Math.abs(amount).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  });
  return isNegative ? `-${formatted}` : formatted;
}

/**
 * Format percentage for display
 */
export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}
