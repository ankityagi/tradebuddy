import React, { useState } from 'react';
import type { Trade } from '../domain/types';
import { closeTrade } from '../data/repo';

interface CloseTradeModalProps {
  trade: Trade;
  onClose: () => void;
  onComplete: () => void;
}

type CloseMethod = 'expired' | 'bought_to_close';

function isCreditPosition(trade: Trade): boolean {
  const strategy = trade.strategy.toLowerCase();
  return (
    strategy === 'coveredcall' ||
    strategy === 'cc' ||
    strategy === 'csp' ||
    trade.legs[0]?.side === 'sell'
  );
}

export function CloseTradeModal({ trade, onClose, onComplete }: CloseTradeModalProps) {
  const isCredit = isCreditPosition(trade);
  const [closeMethod, setCloseMethod] = useState<CloseMethod>(isCredit ? 'expired' : 'bought_to_close');
  const [exitPrice, setExitPrice] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  const multiplier = trade.legs[0]?.type === 'stock' ? 1 : 100;

  const calculateRealizedPL = (): number => {
    if (closeMethod === 'expired') {
      return trade.entryPrice * trade.quantity * multiplier;
    }
    if (isCredit) {
      return (trade.entryPrice - exitPrice) * trade.quantity * multiplier;
    }
    return (exitPrice - trade.entryPrice) * trade.quantity * multiplier;
  };

  const realizedPL = calculateRealizedPL();
  const effectiveExitPrice = closeMethod === 'expired' ? 0 : exitPrice;
  const canSubmit = closeMethod === 'expired' || exitPrice > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await closeTrade(trade.id, effectiveExitPrice, realizedPL);
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
      <div className="bg-gray-900 border border-gray-700 rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-6">
          <h3 className="text-2xl font-bold mb-4 text-white">Close Trade</h3>

          <div className="mb-4 p-4 bg-gray-800 rounded">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="text-gray-400">Ticker:</div>
              <div className="font-medium text-white">{trade.ticker}</div>

              <div className="text-gray-400">Strategy:</div>
              <div className="font-medium text-white">{trade.strategy}</div>

              <div className="text-gray-400">Premium:</div>
              <div className="font-medium text-white">${trade.entryPrice.toFixed(2)}</div>

              <div className="text-gray-400">Quantity:</div>
              <div className="font-medium text-white">{trade.quantity}</div>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">How did you close?</label>
              <div className={`grid gap-2 ${isCredit ? 'grid-cols-2' : 'grid-cols-1'}`}>
                {isCredit && (
                  <button
                    type="button"
                    onClick={() => setCloseMethod('expired')}
                    className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                      closeMethod === 'expired'
                        ? 'bg-green-600 border-green-500 text-white'
                        : 'bg-gray-800 border-gray-600 text-gray-300 hover:border-gray-400'
                    }`}
                  >
                    Expired Worthless
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setCloseMethod('bought_to_close')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    closeMethod === 'bought_to_close'
                      ? 'bg-blue-600 border-blue-500 text-white'
                      : 'bg-gray-800 border-gray-600 text-gray-300 hover:border-gray-400'
                  }`}
                >
                  Bought to Close
                </button>
              </div>
            </div>

            {closeMethod === 'expired' && (
              <div className="mb-4 p-3 bg-green-900/30 border border-green-700 rounded text-sm text-green-300">
                Option expired worthless — you keep the full premium of ${(trade.entryPrice * trade.quantity * multiplier).toFixed(2)}.
              </div>
            )}

            {closeMethod === 'bought_to_close' && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">Exit Price *</label>
                <input
                  type="number"
                  step="0.01"
                  value={exitPrice || ''}
                  onChange={(e) => setExitPrice(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-500"
                  placeholder="0.00"
                  required
                  autoFocus
                />
              </div>
            )}

            <div className="mb-6 p-4 bg-gray-800 border border-gray-700 rounded">
              <div className="text-sm text-gray-400 mb-2">Realized P/L</div>
              <div className={`text-2xl font-bold ${realizedPL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {realizedPL >= 0 ? '+' : ''}${realizedPL.toFixed(2)}
              </div>
              <div className="text-xs text-gray-500 mt-1">Verify with your broker. Fees not included.</div>
            </div>

            <div className="flex space-x-3">
              <button
                type="submit"
                disabled={loading || !canSubmit}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-600 disabled:text-gray-400 transition-colors font-semibold"
              >
                {loading ? 'Closing...' : 'Close Trade'}
              </button>
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-gray-700 text-gray-200 rounded-lg hover:bg-gray-600 disabled:bg-gray-800 transition-colors"
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
