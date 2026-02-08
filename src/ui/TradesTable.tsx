import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import type { Trade } from '../domain/types';
import { getAllTrades, deleteTrade } from '../data/repo';
import { CloseTradeModal } from './CloseTradeModal';
import { calculateGreeks, parseOptionType } from '../services/greeks';
import { batchUpdateDeltas } from '../services/sheets';
import { getSheetUrl, extractSpreadsheetId } from '../services/auth';

type FilterStatus = 'all' | 'open' | 'closed';
type SortField = 'createdAt' | 'ticker' | 'rr';
type SortOrder = 'asc' | 'desc';

export function TradesTable() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('open');
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

      const updates: Array<{ ticker: string; tradeId: string; delta: number }> = [];
      const greeksMap = new Map<string, { delta: number; iv: number }>();

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
          updates.push({
            ticker: trade.ticker,
            tradeId: trade.id,
            delta: greeks.delta,
          });
          greeksMap.set(trade.id, { delta: greeks.delta, iv: greeks.iv });
        }
      }

      // Update Google Sheet with calculated deltas
      if (spreadsheetId && updates.length > 0) {
        setGreeksProgress('Updating Google Sheet...');
        await batchUpdateDeltas(spreadsheetId, updates);
      }

      // Update local trades state with calculated Greeks (for IV display)
      setTrades(prevTrades => prevTrades.map(trade => {
        const calculated = greeksMap.get(trade.id);
        if (calculated) {
          return {
            ...trade,
            metrics: {
              ...trade.metrics,
              delta: calculated.delta,
              iv: calculated.iv,
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

  // Filter trades
  let filteredTrades = trades;

  if (filterStatus !== 'all') {
    filteredTrades = filteredTrades.filter((t) => t.status === filterStatus);
  }

  if (filterTicker) {
    const tickerLower = filterTicker.toLowerCase();
    filteredTrades = filteredTrades.filter((t) => t.ticker.toLowerCase().includes(tickerLower));
  }

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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-600">Loading trades...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold">My Trades</h2>
        <div className="flex gap-3">
          <button
            onClick={handleRefreshGreeks}
            disabled={calculatingGreeks}
            className="px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {calculatingGreeks ? greeksProgress || 'Calculating...' : '📊 Refresh Greeks'}
          </button>
          <Link
            to="/new"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
          >
            + New Trade
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="all">All</option>
              <option value="open">Open</option>
              <option value="closed">Closed</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ticker</label>
            <input
              type="text"
              value={filterTicker}
              onChange={(e) => setFilterTicker(e.target.value)}
              placeholder="Filter by ticker..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>

          <div className="flex items-end">
            <div className="text-sm text-gray-600">
              Showing {filteredTrades.length} of {trades.length} trades
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      {filteredTrades.length === 0 ? (
        <div className="bg-white p-12 rounded-lg shadow text-center">
          <p className="text-gray-600 text-lg mb-4">No trades found</p>
          <Link
            to="/new"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Create Your First Trade
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => toggleSort('ticker')}
                >
                  Ticker {sortField === 'ticker' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Strategy
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Entry
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Delta
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  IV
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => toggleSort('rr')}
                >
                  R/R {sortField === 'rr' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  POP
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => toggleSort('createdAt')}
                >
                  Created {sortField === 'createdAt' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  P/L
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredTrades.map((trade) => (
                <tr key={trade.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{trade.ticker}</div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{trade.strategy}</div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{formatCurrency(trade.entryPrice)}</div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {trade.metrics.delta !== undefined
                        ? trade.metrics.delta.toFixed(2)
                        : 'N/A'}
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {trade.metrics.iv !== undefined
                        ? `${trade.metrics.iv.toFixed(1)}%`
                        : 'N/A'}
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {trade.metrics.rr?.toFixed(2) ?? 'N/A'}
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {trade.metrics.popEst ? `${(trade.metrics.popEst * 100).toFixed(1)}%` : 'N/A'}
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        trade.status === 'open'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {trade.status}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(trade.createdAt)}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div
                      className={`text-sm font-medium ${
                        trade.realizedPL !== undefined
                          ? trade.realizedPL >= 0
                            ? 'text-green-600'
                            : 'text-red-600'
                          : 'text-gray-500'
                      }`}
                    >
                      {trade.realizedPL !== undefined
                        ? formatCurrency(trade.realizedPL)
                        : calculateUnrealizedPL()}
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    {trade.status === 'open' && (
                      <button
                        onClick={() => handleCloseTrade(trade)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Close
                      </button>
                    )}
                    <Link
                      to={`/edit/${trade.id}`}
                      className="text-indigo-600 hover:text-indigo-900"
                    >
                      Edit
                    </Link>
                    <button
                      onClick={() => handleDelete(trade.id)}
                      className="text-red-600 hover:text-red-900"
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
