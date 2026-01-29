import React, { useState } from 'react';
import type { Trade } from '../domain/types';
import { closeTrade } from '../data/repo';

interface CloseTradeModalProps {
  trade: Trade;
  onClose: () => void;
  onComplete: () => void;
}

export function CloseTradeModal({ trade, onClose, onComplete }: CloseTradeModalProps) {
  const [exitPrice, setExitPrice] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  // Calculate realized P/L based on strategy
  const calculateRealizedPL = (): number => {
    // Simplified calculation for MVP
    // For debit spreads: (exitPrice - entryPrice) * quantity * 100
    // For credit spreads: (entryPrice - exitPrice) * quantity * 100

    const priceDiff = exitPrice - trade.entryPrice;
    const multiplier = trade.legs[0]?.type === 'stock' ? 1 : 100;

    return priceDiff * trade.quantity * multiplier;
  };

  const realizedPL = calculateRealizedPL();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await closeTrade(trade.id, exitPrice, realizedPL);
      onComplete();
    } catch (error) {
      console.error('Failed to close trade:', error);
      alert('Failed to close trade. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-6">
          <h3 className="text-2xl font-bold mb-4">Close Trade</h3>

          <div className="mb-4 p-4 bg-gray-50 rounded">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="text-gray-600">Ticker:</div>
              <div className="font-medium">{trade.ticker}</div>

              <div className="text-gray-600">Strategy:</div>
              <div className="font-medium">{trade.strategy}</div>

              <div className="text-gray-600">Entry Price:</div>
              <div className="font-medium">${trade.entryPrice.toFixed(2)}</div>

              <div className="text-gray-600">Quantity:</div>
              <div className="font-medium">{trade.quantity}</div>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Exit Price *</label>
              <input
                type="number"
                step="0.01"
                value={exitPrice}
                onChange={(e) => setExitPrice(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
                required
                autoFocus
              />
            </div>

            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded">
              <div className="text-sm text-gray-700 mb-2">Realized P/L Preview:</div>
              <div
                className={`text-2xl font-bold ${
                  realizedPL >= 0 ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {realizedPL >= 0 ? '+' : ''}${realizedPL.toFixed(2)}
              </div>
              <div className="text-xs text-gray-600 mt-1">
                This is a simplified calculation. Verify with your broker.
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                type="submit"
                disabled={loading || exitPrice === 0}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors font-semibold"
              >
                {loading ? 'Closing...' : 'Close Trade'}
              </button>
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 disabled:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
