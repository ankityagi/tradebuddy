import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import type { Trade } from '../domain/types';
import { getAllTrades, deleteTrade } from '../data/repo';
import { CloseTradeModal } from './CloseTradeModal';
import { calculateGreeks, parseOptionType } from '../services/greeks';
import { batchUpdateGreeks } from '../services/sheets';

// Calculate R/R ratio based on strategy type
function calculateRiskReward(strategy: string, premium: number, strike: number, qty: number): number | null {
  if (!premium || !strike || !qty) return null;

  const strategyLower = strategy.toLowerCase();
  const totalPremium = premium * 100 * qty; // Premium in dollars
  const capitalAtRisk = strike * 100 * qty; // Max capital at risk

  // Selling strategies (CSP, CC) - profit is premium, risk is capital at risk minus premium
  if (strategyLower === 'csp' || strategyLower === 'cc' || strategyLower.includes('covered')) {
    // R/R = Premium / (Capital at Risk - Premium)
    const maxLoss = capitalAtRisk - totalPremium;
    if (maxLoss <= 0) return null;
    return totalPremium / maxLoss;
  }

  // Long Put - profit is (strike - premium) if stock goes to 0, risk is premium
  if (strategyLower === 'long put' || (strategyLower === 'put' && !strategyLower.includes('spread'))) {
    // R/R = (Max Profit) / Premium = (Strike * 100 * Qty - Premium) / Premium
    const maxProfit = capitalAtRisk - totalPremium;
    return maxProfit / totalPremium;
  }

  // Long Call - theoretically unlimited profit, use 100% target as default
  if (strategyLower === 'long call' || strategyLower.includes('call')) {
    // Use 2:1 as default target for long calls (100% profit target)
    return 2.0;
  }

  return null;
}
import { getSheetUrl, extractSpreadsheetId } from '../services/auth';

type FilterStatus = 'all' | 'open' | 'closed';
type SortField = 'createdAt' | 'ticker' | 'rr';
type SortOrder = 'asc' | 'desc';
type ViewMode = 'all' | 'realizedPL' | 'totalPremium' | 'outstandingPremium' | 'winRate';

interface ViewConfig {
  title: string;
  description: string;
  filterFn: (trade: Trade) => boolean;
  calculateTotal: (trades: Trade[]) => { value: string; detail: string };
}

const viewConfigs: Record<ViewMode, ViewConfig> = {
  all: {
    title: 'My Trades',
    description: '',
    filterFn: () => true,
    calculateTotal: () => ({ value: '', detail: '' }),
  },
  realizedPL: {
    title: 'Realized P&L',
    description: 'All closed trades with realized profit/loss',
    filterFn: (t) => t.status === 'closed',
    calculateTotal: (trades) => {
      const total = trades.reduce((sum, t) => sum + (t.realizedPL ?? 0), 0);
      const winners = trades.filter(t => (t.realizedPL ?? 0) > 0).length;
      const losers = trades.filter(t => (t.realizedPL ?? 0) < 0).length;
      return {
        value: `$${total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        detail: `${winners} winners, ${losers} losers`,
      };
    },
  },
  totalPremium: {
    title: 'Total Premium Collected',
    description: 'All premium collected from sell trades (CSP, CC)',
    filterFn: (t) => {
      const leg = t.legs[0];
      return leg?.side === 'sell';
    },
    calculateTotal: (trades) => {
      const total = trades.reduce((sum, t) => sum + (t.entryPrice * t.quantity), 0);
      return {
        value: `$${total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        detail: `${trades.length} sell trades`,
      };
    },
  },
  outstandingPremium: {
    title: 'Outstanding Premium',
    description: 'Premium from open sell positions',
    filterFn: (t) => {
      const leg = t.legs[0];
      return t.status === 'open' && leg?.side === 'sell';
    },
    calculateTotal: (trades) => {
      const total = trades.reduce((sum, t) => sum + (t.entryPrice * t.quantity), 0);
      return {
        value: `$${total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        detail: `${trades.length} open positions`,
      };
    },
  },
  winRate: {
    title: 'Win Rate Breakdown',
    description: 'All closed trades - profitable vs losing',
    filterFn: (t) => t.status === 'closed',
    calculateTotal: (trades) => {
      const winners = trades.filter(t => (t.realizedPL ?? 0) > 0).length;
      const total = trades.length;
      const winRate = total > 0 ? (winners / total) * 100 : 0;
      return {
        value: `${winRate.toFixed(1)}%`,
        detail: `${winners} of ${total} trades profitable`,
      };
    },
  },
};

export function TradesTable() {
  const [searchParams, setSearchParams] = useSearchParams();
  const viewParam = searchParams.get('view') as ViewMode | null;
  const currentView: ViewMode = viewParam && viewParam in viewConfigs ? viewParam : 'all';

  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>(() => {
    // Set initial filter based on view
    if (currentView === 'realizedPL' || currentView === 'winRate') return 'closed';
    if (currentView === 'outstandingPremium') return 'open';
    return 'open';
  });
  const [filterTicker, setFilterTicker] = useState('');
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [tradeToClose, setTradeToClose] = useState<Trade | null>(null);
  const [calculatingGreeks, setCalculatingGreeks] = useState(false);
  const [greeksProgress, setGreeksProgress] = useState('');

  const loadTrades = async () => {
    setLoading(true);
    try {
      const allTrades = await getAllTrades();
      setTrades(allTrades);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTrades();
  }, []);

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this trade?')) {
      await deleteTrade(id);
      await loadTrades();
    }
  };

  const handleCloseTrade = (trade: Trade) => {
    setTradeToClose(trade);
  };

  const handleCloseComplete = () => {
    setTradeToClose(null);
    loadTrades();
  };

  const handleRefreshGreeks = async () => {
    const openTrades = trades.filter(t => t.status === 'open');
    if (openTrades.length === 0) {
      alert('No open trades to calculate Greeks for.');
      return;
    }

    setCalculatingGreeks(true);
    setGreeksProgress('Starting Greeks calculation...');

    try {
      const sheetUrl = getSheetUrl();
      const spreadsheetId = sheetUrl ? extractSpreadsheetId(sheetUrl) : null;

      const updates: Array<{ ticker: string; tradeId: string; delta: number; iv: number; rr: number | null }> = [];
      const greeksMap = new Map<string, { delta: number; iv: number; rr: number | null }>();

      for (let i = 0; i < openTrades.length; i++) {
        const trade = openTrades[i];
        setGreeksProgress(`Calculating ${trade.ticker} (${i + 1}/${openTrades.length})...`);

        const leg = trade.legs[0];
        if (!leg?.strike || !leg?.expiry) continue;

        const optionType = parseOptionType(trade.strategy);
        const greeks = await calculateGreeks({
          ticker: trade.ticker,
          strike: leg.strike,
          expiry: leg.expiry,
          optionType,
          premium: trade.entryPrice,
        });

        if (greeks) {
          // Calculate R/R based on strategy
          const rr = calculateRiskReward(trade.strategy, trade.entryPrice, leg.strike, trade.quantity);

          updates.push({
            ticker: trade.ticker,
            tradeId: trade.id,
            delta: greeks.delta,
            iv: greeks.iv,
            rr,
          });
          greeksMap.set(trade.id, { delta: greeks.delta, iv: greeks.iv, rr });
        }
      }

      // Update Google Sheet with calculated Greeks
      if (spreadsheetId && updates.length > 0) {
        setGreeksProgress('Updating Google Sheet...');
        await batchUpdateGreeks(spreadsheetId, updates);
      }

      // Update local trades state with calculated Greeks
      setTrades(prevTrades => prevTrades.map(trade => {
        const calculated = greeksMap.get(trade.id);
        if (calculated) {
          return {
            ...trade,
            metrics: {
              ...trade.metrics,
              delta: calculated.delta,
              iv: calculated.iv,
              rr: calculated.rr ?? undefined,
            },
          };
        }
        return trade;
      }));

      setGreeksProgress('');
      alert(`Updated Greeks for ${updates.length} trades!`);

      // Reload trades to show updated values
      await loadTrades();
    } catch (error) {
      console.error('Failed to calculate Greeks:', error);
      alert('Failed to calculate Greeks. Check console for details.');
    } finally {
      setCalculatingGreeks(false);
      setGreeksProgress('');
    }
  };

  // Get view config
  const viewConfig = viewConfigs[currentView];

  // Filter trades - apply view filter first, then user filters
  let filteredTrades = trades;

  // Apply view-specific filter
  if (currentView !== 'all') {
    filteredTrades = filteredTrades.filter(viewConfig.filterFn);
  }

  // Store view-filtered count for summary
  const viewFilteredTrades = filteredTrades;

  // Apply user status filter (only if not in a specific view that already filters)
  if (currentView === 'all' && filterStatus !== 'all') {
    filteredTrades = filteredTrades.filter((t) => t.status === filterStatus);
  }

  if (filterTicker) {
    const tickerLower = filterTicker.toLowerCase();
    filteredTrades = filteredTrades.filter((t) => t.ticker.toLowerCase().includes(tickerLower));
  }

  // Calculate totals for the current view
  const viewTotal = currentView !== 'all' ? viewConfig.calculateTotal(viewFilteredTrades) : null;

  // Sort trades
  filteredTrades = [...filteredTrades].sort((a, b) => {
    let comparison = 0;

    switch (sortField) {
      case 'createdAt':
        comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        break;
      case 'ticker':
        comparison = a.ticker.localeCompare(b.ticker);
        break;
      case 'rr': {
        const rrA = a.metrics.rr ?? 0;
        const rrB = b.metrics.rr ?? 0;
        comparison = rrA - rrB;
        break;
      }
    }

    return sortOrder === 'asc' ? comparison : -comparison;
  });

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const formatDate = (isoDate: string) => {
    return new Date(isoDate).toLocaleDateString();
  };

  const formatCurrency = (amount: number | undefined) => {
    if (amount === undefined) return 'N/A';
    return `$${amount.toFixed(2)}`;
  };

  const calculateUnrealizedPL = (): string => {
    // Simplified: would need current market price in real implementation
    return 'N/A';
  };

  const calculateDTE = (trade: Trade): number | null => {
    const expiry = trade.legs[0]?.expiry;
    if (!expiry) return null;
    const expiryDate = new Date(expiry);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dte = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return dte >= 0 ? dte : 0;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-400">Loading trades...</div>
      </div>
    );
  }

  const clearView = () => {
    setSearchParams({});
    setFilterStatus('open');
  };

  return (
    <div>
      {/* Header with back button when in detail view */}
      <div className="flex justify-between items-center mb-6">
        <div>
          {currentView !== 'all' && (
            <Link
              to="/"
              className="text-emerald-400 hover:text-emerald-300 text-sm mb-1 inline-block"
            >
              &larr; Back to Dashboard
            </Link>
          )}
          <h2 className="text-3xl font-bold text-white">{viewConfig.title}</h2>
          {viewConfig.description && (
            <p className="text-gray-400 mt-1">{viewConfig.description}</p>
          )}
        </div>
        <div className="flex gap-3">
          {currentView !== 'all' && (
            <button
              onClick={clearView}
              className="px-4 py-3 bg-gray-700 text-white rounded-xl hover:bg-gray-600 transition-colors font-semibold"
            >
              View All Trades
            </button>
          )}
          <button
            onClick={handleRefreshGreeks}
            disabled={calculatingGreeks}
            className="px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {calculatingGreeks ? greeksProgress || 'Calculating...' : '📊 Refresh Greeks'}
          </button>
          <Link
            to="/new"
            className="px-6 py-3 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors font-semibold"
          >
            + New Trade
          </Link>
        </div>
      </div>

      {/* Summary Card for specific views */}
      {viewTotal && (
        <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white p-6 rounded-xl mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-emerald-100 text-sm uppercase tracking-wide">{viewConfig.title}</p>
              <p className={`text-4xl font-bold mt-1 ${
                viewTotal.value.startsWith('-') ? 'text-red-300' : ''
              }`}>
                {viewTotal.value}
              </p>
              <p className="text-emerald-200 text-sm mt-1">{viewTotal.detail}</p>
            </div>
            <div className="text-emerald-200">
              <p className="text-sm">Trades shown below contribute to this total.</p>
              <p className="text-sm">Verify by summing the highlighted column.</p>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-gray-800 p-4 rounded-xl border border-gray-700 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {currentView === 'all' && (
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              >
                <option value="all">All</option>
                <option value="open">Open</option>
                <option value="closed">Closed</option>
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Ticker</label>
            <input
              type="text"
              value={filterTicker}
              onChange={(e) => setFilterTicker(e.target.value)}
              placeholder="Filter by ticker..."
              className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>

          <div className="flex items-end">
            <div className="text-sm text-gray-400">
              Showing {filteredTrades.length} of {viewFilteredTrades.length} trades
              {currentView !== 'all' && ` (${trades.length} total)`}
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      {filteredTrades.length === 0 ? (
        <div className="bg-gray-800 p-12 rounded-xl border border-gray-700 text-center">
          <p className="text-gray-400 text-lg mb-4">No trades found</p>
          <Link
            to="/new"
            className="inline-block px-6 py-3 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors"
          >
            Create Your First Trade
          </Link>
        </div>
      ) : (
        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-900 border-b border-gray-700">
              <tr>
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-800"
                  onClick={() => toggleSort('ticker')}
                >
                  Ticker {sortField === 'ticker' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Strategy
                </th>
                <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                  currentView === 'totalPremium' || currentView === 'outstandingPremium'
                    ? 'text-emerald-400 bg-emerald-500/10'
                    : 'text-gray-400'
                }`}>
                  Entry {(currentView === 'totalPremium' || currentView === 'outstandingPremium') && '*'}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Delta
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  IV
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  DTE
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-800"
                  onClick={() => toggleSort('rr')}
                >
                  R/R {sortField === 'rr' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-800"
                  onClick={() => toggleSort('createdAt')}
                >
                  Created {sortField === 'createdAt' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                  currentView === 'realizedPL' || currentView === 'winRate'
                    ? 'text-emerald-400 bg-emerald-500/10'
                    : 'text-gray-400'
                }`}>
                  P/L {(currentView === 'realizedPL' || currentView === 'winRate') && '*'}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {filteredTrades.map((trade) => (
                <tr key={trade.id} className="hover:bg-gray-700/30">
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-white">{trade.ticker}</div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-300">{trade.strategy}</div>
                  </td>
                  <td className={`px-4 py-4 whitespace-nowrap ${
                    currentView === 'totalPremium' || currentView === 'outstandingPremium'
                      ? 'bg-emerald-500/10'
                      : ''
                  }`}>
                    <div className={`text-sm ${
                      currentView === 'totalPremium' || currentView === 'outstandingPremium'
                        ? 'text-emerald-400 font-semibold'
                        : 'text-gray-300'
                    }`}>{formatCurrency(trade.entryPrice)}</div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-300">
                      {trade.metrics.delta !== undefined
                        ? trade.metrics.delta.toFixed(2)
                        : 'N/A'}
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-300">
                      {trade.metrics.iv !== undefined
                        ? `${trade.metrics.iv.toFixed(1)}%`
                        : 'N/A'}
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className={`text-sm font-medium ${
                      (() => {
                        const dte = calculateDTE(trade);
                        if (dte === null) return 'text-gray-500';
                        if (dte <= 7) return 'text-red-400';
                        if (dte <= 14) return 'text-orange-400';
                        return 'text-gray-300';
                      })()
                    }`}>
                      {calculateDTE(trade) ?? 'N/A'}
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-300">
                      {trade.metrics.rr?.toFixed(2) ?? 'N/A'}
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        trade.status === 'open'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-gray-700 text-gray-400'
                      }`}
                    >
                      {trade.status}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(trade.createdAt)}
                  </td>
                  <td className={`px-4 py-4 whitespace-nowrap ${
                    currentView === 'realizedPL' || currentView === 'winRate'
                      ? 'bg-emerald-500/10'
                      : ''
                  }`}>
                    <div
                      className={`text-sm font-medium ${
                        trade.realizedPL !== undefined
                          ? trade.realizedPL >= 0
                            ? 'text-emerald-400'
                            : 'text-red-400'
                          : 'text-gray-500'
                      }`}
                    >
                      {trade.realizedPL !== undefined
                        ? formatCurrency(trade.realizedPL)
                        : calculateUnrealizedPL()}
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium space-x-3">
                    {trade.status === 'open' && (
                      <button
                        onClick={() => handleCloseTrade(trade)}
                        className="text-blue-400 hover:text-blue-300"
                      >
                        Close
                      </button>
                    )}
                    <Link
                      to={`/edit/${trade.id}`}
                      className="text-gray-400 hover:text-white"
                    >
                      Edit
                    </Link>
                    <button
                      onClick={() => handleDelete(trade.id)}
                      className="text-red-400 hover:text-red-300"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tradeToClose && (
        <CloseTradeModal
          trade={tradeToClose}
          onClose={() => setTradeToClose(null)}
          onComplete={handleCloseComplete}
        />
      )}
    </div>
  );
}
