import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import type { Trade } from '../../domain/types';
import { getAllTrades } from '../../data/repo';
import { StatCard, TrendDirection } from './StatCard';
import { PerformanceChart } from './PerformanceChart';
import { AllocationChart } from './AllocationChart';
import { MonthlyReturnsTable } from './MonthlyReturnsTable';
import {
  calculateStats,
  calculateMonthlyPerformance,
  calculateAllocationByTicker,
  calculateAllocationByStrategy,
  formatCurrency,
  formatPercent,
} from './utils';

export function Dashboard() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadTrades() {
      setLoading(true);
      try {
        const allTrades = await getAllTrades();
        setTrades(allTrades);
      } finally {
        setLoading(false);
      }
    }
    loadTrades();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-400">Loading dashboard...</div>
      </div>
    );
  }

  const stats = calculateStats(trades);
  const monthlyData = calculateMonthlyPerformance(trades);
  const allocationByTicker = calculateAllocationByTicker(trades);
  const allocationByStrategy = calculateAllocationByStrategy(trades);

  // Determine trend direction for realized P&L
  const plTrend: TrendDirection = stats.realizedPL > 0 ? 'up' : stats.realizedPL < 0 ? 'down' : 'neutral';

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-white">Dashboard</h2>
        <Link
          to="/trades"
          className="px-4 py-2 text-emerald-400 hover:text-emerald-300 font-medium"
        >
          View All Trades &rarr;
        </Link>
      </div>

      {/* Empty State */}
      {trades.length === 0 ? (
        <div className="bg-gray-800 rounded-2xl border border-gray-700 p-12 text-center">
          <h3 className="text-xl font-semibold text-white mb-2">Welcome to TradeBuddy</h3>
          <p className="text-gray-400 mb-6">
            Start tracking your options trades to see analytics and performance metrics.
          </p>
          <div className="flex justify-center gap-4">
            <Link
              to="/new"
              className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl transition-colors font-semibold"
            >
              + New Trade
            </Link>
            <Link
              to="/paste"
              className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl transition-colors font-semibold"
            >
              Paste Trade
            </Link>
          </div>
        </div>
      ) : (
        <>
          {/* Stat Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            <StatCard
              title="Realized P&L"
              value={formatCurrency(stats.realizedPL)}
              trend={plTrend}
              subtitle={`${stats.closedTrades} closed trades`}
              href="/trades?view=realizedPL"
            />
            <StatCard
              title="Total Premium"
              value={formatCurrency(stats.totalPremium)}
              subtitle="All time collected"
              href="/trades?view=totalPremium"
            />
            <StatCard
              title="Unrealized P&L"
              value={stats.unrealizedPL !== null ? formatCurrency(stats.unrealizedPL) : 'N/A'}
              subtitle="Needs market data"
            />
            <StatCard
              title="Outstanding Premium"
              value={formatCurrency(stats.outstandingPremium)}
              subtitle={`${stats.openTrades} open positions`}
              href="/trades?view=outstandingPremium"
            />
            <StatCard
              title="Win Rate"
              value={formatPercent(stats.winRate)}
              trend={stats.winRate >= 50 ? 'up' : stats.winRate > 0 ? 'down' : 'neutral'}
              subtitle={`${stats.closedTrades} trades`}
              href="/trades?view=winRate"
            />
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <PerformanceChart data={monthlyData} />
            <AllocationChart
              byTicker={allocationByTicker}
              byStrategy={allocationByStrategy}
            />
          </div>

          {/* Monthly Returns Table */}
          <MonthlyReturnsTable data={monthlyData} />
        </>
      )}
    </div>
  );
}
