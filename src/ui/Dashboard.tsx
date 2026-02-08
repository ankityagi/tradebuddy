import React, { useState, useEffect, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { Trade } from '../domain/types';
import type { StockSummary } from '../domain/dashboard';
import {
  computePortfolioSummary,
  computeStockSummaries,
  computePortfolioTrend,
  computeStockTrends,
} from '../domain/dashboard';
import { getAllTrades } from '../data/repo';

type StockSortField = 'ticker' | 'totalPL' | 'roiPercent' | 'winRate' | 'closedCount';
type SortOrder = 'asc' | 'desc';

const STOCK_COLORS = [
  '#3b82f6',
  '#ef4444',
  '#10b981',
  '#f59e0b',
  '#8b5cf6',
  '#ec4899',
  '#06b6d4',
  '#84cc16',
  '#f97316',
  '#6366f1',
];

function formatCurrency(amount: number): string {
  const sign = amount >= 0 ? '+' : '';
  return `${sign}$${amount.toFixed(2)}`;
}

function formatPercent(value: number): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
}

function plColor(value: number): string {
  if (value > 0) return 'text-green-600';
  if (value < 0) return 'text-red-600';
  return 'text-gray-600';
}

function plBgColor(value: number): string {
  if (value > 0) return 'bg-green-50 border-green-200';
  if (value < 0) return 'bg-red-50 border-red-200';
  return 'bg-gray-50 border-gray-200';
}

export function Dashboard() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [stockSort, setStockSort] = useState<StockSortField>('totalPL');
  const [stockSortOrder, setStockSortOrder] = useState<SortOrder>('desc');
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const allTrades = await getAllTrades();
        setTrades(allTrades);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const portfolio = useMemo(() => computePortfolioSummary(trades), [trades]);
  const stockSummaries = useMemo(() => computeStockSummaries(trades), [trades]);
  const portfolioTrend = useMemo(() => computePortfolioTrend(trades), [trades]);
  const stockTrends = useMemo(() => computeStockTrends(trades), [trades]);

  // Sort stock summaries
  const sortedStocks = useMemo(() => {
    const sorted = [...stockSummaries].sort((a, b) => {
      let cmp = 0;
      switch (stockSort) {
        case 'ticker':
          cmp = a.ticker.localeCompare(b.ticker);
          break;
        case 'totalPL':
          cmp = a.totalPL - b.totalPL;
          break;
        case 'roiPercent':
          cmp = a.roiPercent - b.roiPercent;
          break;
        case 'winRate':
          cmp = a.winRate - b.winRate;
          break;
        case 'closedCount':
          cmp = a.closedCount - b.closedCount;
          break;
      }
      return stockSortOrder === 'asc' ? cmp : -cmp;
    });
    return sorted;
  }, [stockSummaries, stockSort, stockSortOrder]);

  // Build multi-stock trend chart data (merged by date)
  const multiStockChartData = useMemo(() => {
    const trendSource = selectedTicker
      ? stockTrends.filter((t) => t.ticker === selectedTicker)
      : stockTrends.slice(0, 5); // Top 5 by P/L

    const dateMap = new Map<string, Record<string, number>>();
    for (const trend of trendSource) {
      for (const pt of trend.points) {
        if (!dateMap.has(pt.date)) {
          dateMap.set(pt.date, {});
        }
        dateMap.get(pt.date)![trend.ticker] = pt.cumulativePL;
      }
    }

    // Sort by date and forward-fill missing values
    const sortedDates = [...dateMap.keys()].sort();
    const tickers = trendSource.map((t) => t.ticker);
    const lastValues: Record<string, number> = {};
    for (const tk of tickers) lastValues[tk] = 0;

    return sortedDates.map((date) => {
      const row: Record<string, string | number> = { date };
      for (const tk of tickers) {
        const val = dateMap.get(date)?.[tk];
        if (val !== undefined) {
          lastValues[tk] = val;
        }
        row[tk] = lastValues[tk];
      }
      return row;
    });
  }, [stockTrends, selectedTicker]);

  const stockTickersForChart = useMemo(() => {
    if (selectedTicker) return [selectedTicker];
    return stockTrends.slice(0, 5).map((t) => t.ticker);
  }, [stockTrends, selectedTicker]);

  const toggleStockSort = (field: StockSortField) => {
    if (stockSort === field) {
      setStockSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    } else {
      setStockSort(field);
      setStockSortOrder('desc');
    }
  };

  const sortArrow = (field: StockSortField) => {
    if (stockSort !== field) return '';
    return stockSortOrder === 'asc' ? ' ↑' : ' ↓';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-600">Loading dashboard...</div>
      </div>
    );
  }

  const hasClosedTrades = portfolio.totalClosed > 0;

  return (
    <div>
      <h2 className="text-3xl font-bold mb-6">Dashboard</h2>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className={`p-5 rounded-lg border ${plBgColor(portfolio.totalPL)}`}>
          <div className="text-sm font-medium text-gray-500 mb-1">Total P/L</div>
          <div className={`text-2xl font-bold ${plColor(portfolio.totalPL)}`}>
            {hasClosedTrades ? formatCurrency(portfolio.totalPL) : 'N/A'}
          </div>
        </div>

        <div className={`p-5 rounded-lg border ${plBgColor(portfolio.roiPercent)}`}>
          <div className="text-sm font-medium text-gray-500 mb-1">Overall ROI</div>
          <div className={`text-2xl font-bold ${plColor(portfolio.roiPercent)}`}>
            {hasClosedTrades ? formatPercent(portfolio.roiPercent) : 'N/A'}
          </div>
        </div>

        <div className="p-5 rounded-lg border bg-white border-gray-200">
          <div className="text-sm font-medium text-gray-500 mb-1">Win Rate</div>
          <div className="text-2xl font-bold text-gray-900">
            {hasClosedTrades ? `${(portfolio.winRate * 100).toFixed(0)}%` : 'N/A'}
          </div>
        </div>

        <div className="p-5 rounded-lg border bg-white border-gray-200">
          <div className="text-sm font-medium text-gray-500 mb-1">Trades</div>
          <div className="text-2xl font-bold text-gray-900">
            {portfolio.totalClosed} closed / {portfolio.totalOpen} open
          </div>
        </div>
      </div>

      {/* Portfolio P/L Trend */}
      {portfolioTrend.length > 1 && (
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h3 className="text-lg font-semibold mb-4">Cumulative P/L Over Time</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={portfolioTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v: number) => `$${v}`} />
              <Tooltip
                formatter={(value: number) => [`$${value.toFixed(2)}`, 'Cumulative P/L']}
                labelFormatter={(label: string) => `Date: ${label}`}
              />
              <Line
                type="monotone"
                dataKey="cumulativePL"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ r: 3 }}
                name="Cumulative P/L"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Portfolio ROI Trend */}
      {portfolioTrend.length > 1 && (
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h3 className="text-lg font-semibold mb-4">ROI % Over Time</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={portfolioTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v: number) => `${v.toFixed(1)}%`} />
              <Tooltip
                formatter={(value: number) => [`${value.toFixed(2)}%`, 'ROI']}
                labelFormatter={(label: string) => `Date: ${label}`}
              />
              <Line
                type="monotone"
                dataKey="roiPercent"
                stroke="#10b981"
                strokeWidth={2}
                dot={{ r: 3 }}
                name="ROI %"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Per-Stock Table */}
      {sortedStocks.length > 0 && (
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold">Per-Stock Breakdown</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => toggleStockSort('ticker')}
                  >
                    Ticker{sortArrow('ticker')}
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => toggleStockSort('closedCount')}
                  >
                    Trades{sortArrow('closedCount')}
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => toggleStockSort('totalPL')}
                  >
                    P/L{sortArrow('totalPL')}
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => toggleStockSort('roiPercent')}
                  >
                    ROI{sortArrow('roiPercent')}
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => toggleStockSort('winRate')}
                  >
                    Win Rate{sortArrow('winRate')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Open
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {sortedStocks.map((stock: StockSummary) => (
                  <tr
                    key={stock.ticker}
                    className={`hover:bg-gray-50 cursor-pointer ${
                      selectedTicker === stock.ticker ? 'bg-blue-50' : ''
                    }`}
                    onClick={() =>
                      setSelectedTicker(selectedTicker === stock.ticker ? null : stock.ticker)
                    }
                  >
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-900">{stock.ticker}</span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                      {stock.closedCount}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className={`text-sm font-medium ${plColor(stock.totalPL)}`}>
                        {formatCurrency(stock.totalPL)}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className={`text-sm font-medium ${plColor(stock.roiPercent)}`}>
                        {formatPercent(stock.roiPercent)}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                      {(stock.winRate * 100).toFixed(0)}%
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                      {stock.openCount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Per-Stock Trend Chart */}
      {multiStockChartData.length > 1 && stockTickersForChart.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h3 className="text-lg font-semibold mb-1">
            {selectedTicker
              ? `${selectedTicker} - Cumulative P/L`
              : 'Per-Stock Cumulative P/L (Top 5)'}
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            {selectedTicker
              ? 'Click the row again in the table to deselect'
              : 'Click a row in the table above to focus on a single stock'}
          </p>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={multiStockChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v: number) => `$${v}`} />
              <Tooltip
                formatter={(value: number, name: string) => [`$${value.toFixed(2)}`, name]}
                labelFormatter={(label: string) => `Date: ${label}`}
              />
              <Legend />
              {stockTickersForChart.map((ticker, i) => (
                <Line
                  key={ticker}
                  type="monotone"
                  dataKey={ticker}
                  stroke={STOCK_COLORS[i % STOCK_COLORS.length]}
                  strokeWidth={2}
                  dot={{ r: 2 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Empty state */}
      {!hasClosedTrades && (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-gray-600 text-lg mb-2">No closed trades yet</p>
          <p className="text-gray-400">
            Close some trades to see your P/L, ROI, and trend data here.
          </p>
        </div>
      )}
    </div>
  );
}
