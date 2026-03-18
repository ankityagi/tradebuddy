import React, { useState } from 'react';
import type { Trade } from '../domain/types';
import { closeTrade, createTrade, getCampaignById, updateCampaign } from '../data/repo';

interface CloseTradeModalProps {
  trade: Trade;
  onClose: () => void;
  onComplete: () => void;
}

type CloseMethod = 'expired' | 'bought_to_close' | 'assigned';

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
  const autoIsCredit = isCreditPosition(trade);
  const [positionType, setPositionType] = useState<'credit' | 'debit'>(autoIsCredit ? 'credit' : 'debit');
  const isCredit = positionType === 'credit';
  const [closeMethod, setCloseMethod] = useState<CloseMethod>(autoIsCredit ? 'expired' : 'bought_to_close');
  const [exitPrice, setExitPrice] = useState<number>(0);
  const [assignmentPrice, setAssignmentPrice] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  const multiplier = trade.legs[0]?.type === 'stock' ? 1 : 100;

  const fee = trade.fee ?? 0;

  const isPut = trade.legs[0]?.type === 'put' ||
    trade.strategy.toLowerCase().includes('put') ||
    trade.strategy.toLowerCase() === 'csp';

  const calculateRealizedPL = (): number => {
    if (closeMethod === 'expired' || closeMethod === 'assigned') {
      return trade.entryPrice * trade.quantity * multiplier - fee;
    }
    if (isCredit) {
      return (trade.entryPrice - exitPrice) * trade.quantity * multiplier - fee;
    }
    return (exitPrice - trade.entryPrice) * trade.quantity * multiplier - fee;
  };

  const realizedPL = calculateRealizedPL();
  const effectiveExitPrice = (closeMethod === 'expired' || closeMethod === 'assigned') ? 0 : exitPrice;
  const canSubmit = closeMethod === 'expired' ||
    (closeMethod === 'assigned' && assignmentPrice > 0) ||
    (closeMethod === 'bought_to_close' && exitPrice > 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await closeTrade(trade.id, effectiveExitPrice, realizedPL);

      if (closeMethod === 'assigned' && assignmentPrice > 0) {
        const sharesQty = trade.quantity * 100;
        await createTrade({
          ticker: trade.ticker,
          strategy: 'stock',
          legs: [{ type: 'stock', side: 'buy', quantity: sharesQty }],
          entryPrice: assignmentPrice,
          quantity: sharesQty,
          status: 'open',
          metrics: {},
          notes: `Assigned from put at $${assignmentPrice}/shr`,
          campaignId: trade.campaignId,
          tradeRole: 'assignment',
        });

        // Update campaign: set assignedStrike and advance phase
        if (trade.campaignId) {
          const campaign = await getCampaignById(trade.campaignId);
          if (campaign && campaign.type === 'wheel') {
            await updateCampaign({
              ...campaign,
              assignedStrike: assignmentPrice,
              assignedAt: new Date().toISOString(),
              phase: 'assigned',
            });
          }
        }
      }

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
              <label className="block text-sm font-medium text-gray-300 mb-2">Position type</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setPositionType('credit');
                    setCloseMethod('expired');
                  }}
                  className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    isCredit
                      ? 'bg-green-600 border-green-500 text-white'
                      : 'bg-gray-800 border-gray-600 text-gray-300 hover:border-gray-400'
                  }`}
                >
                  Credit (sold)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPositionType('debit');
                    setCloseMethod('bought_to_close');
                  }}
                  className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    !isCredit
                      ? 'bg-blue-600 border-blue-500 text-white'
                      : 'bg-gray-800 border-gray-600 text-gray-300 hover:border-gray-400'
                  }`}
                >
                  Debit (bought)
                </button>
              </div>
              {positionType !== (autoIsCredit ? 'credit' : 'debit') && (
                <p className="text-xs text-amber-400 mt-1">
                  Auto-detected as {autoIsCredit ? 'credit' : 'debit'} — overridden. Fix the sheet type to avoid this next time.
                </p>
              )}
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">How did you close?</label>
              <div className={`grid gap-2 ${isCredit ? (isPut ? 'grid-cols-3' : 'grid-cols-2') : 'grid-cols-1'}`}>
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
                {isCredit && isPut && (
                  <button
                    type="button"
                    onClick={() => setCloseMethod('assigned')}
                    className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                      closeMethod === 'assigned'
                        ? 'bg-orange-600 border-orange-500 text-white'
                        : 'bg-gray-800 border-gray-600 text-gray-300 hover:border-gray-400'
                    }`}
                  >
                    Assigned
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
                Option expired worthless — premium ${(trade.entryPrice * trade.quantity * multiplier).toFixed(2)}
                {fee > 0 ? ` − $${fee.toFixed(2)} fee = $${(trade.entryPrice * trade.quantity * multiplier - fee).toFixed(2)} profit` : ' kept as profit'}.
              </div>
            )}

            {closeMethod === 'assigned' && (
              <div className="mb-4 p-3 bg-orange-900/30 border border-orange-700 rounded text-sm text-orange-300 space-y-3">
                <p>Put was assigned — you keep the premium as profit and acquire {trade.quantity * 100} shares.</p>
                <div>
                  <label className="block text-xs font-medium text-orange-200 mb-1">
                    Assignment price (strike) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={assignmentPrice || ''}
                    onChange={(e) => setAssignmentPrice(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-gray-800 border border-orange-700/50 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 placeholder-gray-500 text-sm"
                    placeholder="e.g. 41.00"
                    autoFocus
                  />
                </div>
                {assignmentPrice > 0 && (
                  <p className="text-xs text-orange-200">
                    Will create a stock buy trade: {trade.quantity * 100} shares of {trade.ticker} at ${assignmentPrice}/shr
                    (cost basis ${(assignmentPrice * trade.quantity * 100).toLocaleString()})
                  </p>
                )}
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
              <div className="text-xs text-gray-500 mt-1">Verify with your broker.{fee === 0 ? ' No fees on record.' : ` Includes $${fee.toFixed(2)} fee.`}</div>
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
