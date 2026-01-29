import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { z } from 'zod';
import type { Leg, Strategy, LegType, LegSide } from '../domain/types';
import { computeMetrics } from '../domain/risk';
import { generateAssessment, getRiskLevelColor } from '../domain/assessment';
import { createTrade, getTrade, updateTrade } from '../data/repo';

// Zod validation schema
const legSchema = z.object({
  type: z.enum(['call', 'put', 'stock']),
  side: z.enum(['buy', 'sell']),
  strike: z.number().positive().optional(),
  expiry: z.string().optional(),
  price: z.number().nonnegative().optional(),
  quantity: z.number().positive(),
});

const tradeFormSchema = z.object({
  ticker: z.string().min(1, 'Ticker is required').toUpperCase(),
  strategy: z.enum([
    'vertical',
    'coveredCall',
    'singleOption',
    'stock',
    'ironCondor',
    'strangle',
    'straddle',
    'custom',
  ]),
  legs: z.array(legSchema).min(1, 'At least one leg is required'),
  entryPrice: z.number(),
  quantity: z.number().positive(),
  notes: z.string().optional(),
});

type TradeFormData = z.infer<typeof tradeFormSchema>;

const initialLeg: Leg = {
  type: 'call',
  side: 'buy',
  quantity: 1,
  price: 0,
};

export function TradeForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditing = !!id;

  const [formData, setFormData] = useState<TradeFormData>({
    ticker: '',
    strategy: 'singleOption',
    legs: [{ ...initialLeg }],
    entryPrice: 0,
    quantity: 1,
    notes: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [loadingTrade, setLoadingTrade] = useState(false);

  // Load trade if editing
  useEffect(() => {
    if (isEditing && id) {
      setLoadingTrade(true);
      getTrade(id)
        .then((trade) => {
          if (trade) {
            setFormData({
              ticker: trade.ticker,
              strategy: trade.strategy,
              legs: trade.legs,
              entryPrice: trade.entryPrice,
              quantity: trade.quantity,
              notes: trade.notes || '',
            });
          }
        })
        .finally(() => setLoadingTrade(false));
    }
  }, [id, isEditing]);

  // Calculate metrics in real-time
  const metrics = computeMetrics(formData.legs, formData.entryPrice, formData.quantity);
  const assessment = generateAssessment(metrics);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    try {
      const validated = tradeFormSchema.parse(formData);
      setLoading(true);

      if (isEditing && id) {
        await updateTrade(id, {
          ...validated,
          status: 'open',
          metrics,
          assessment: assessment.text,
        });
      } else {
        await createTrade({
          ...validated,
          status: 'open',
          metrics,
          assessment: assessment.text,
        });
      }

      navigate('/');
    } catch (err) {
      if (err instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        err.errors.forEach((error) => {
          const path = error.path.join('.');
          fieldErrors[path] = error.message;
        });
        setErrors(fieldErrors);
      }
    } finally {
      setLoading(false);
    }
  };

  const addLeg = () => {
    setFormData({
      ...formData,
      legs: [...formData.legs, { ...initialLeg }],
    });
  };

  const removeLeg = (index: number) => {
    if (formData.legs.length > 1) {
      const newLegs = formData.legs.filter((_, i) => i !== index);
      setFormData({ ...formData, legs: newLegs });
    }
  };

  const updateLeg = (index: number, field: keyof Leg, value: any) => {
    const newLegs = [...formData.legs];
    newLegs[index] = { ...newLegs[index], [field]: value };
    setFormData({ ...formData, legs: newLegs });
  };

  if (loadingTrade) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-600">Loading trade...</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-3xl font-bold mb-6">{isEditing ? 'Edit Trade' : 'New Trade'}</h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Ticker and Strategy */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-xl font-semibold mb-4">Basic Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ticker Symbol *
              </label>
              <input
                type="text"
                value={formData.ticker}
                onChange={(e) => setFormData({ ...formData, ticker: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., AAPL"
              />
              {errors.ticker && <p className="text-red-500 text-sm mt-1">{errors.ticker}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Strategy *</label>
              <select
                value={formData.strategy}
                onChange={(e) => setFormData({ ...formData, strategy: e.target.value as Strategy })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="singleOption">Single Option</option>
                <option value="vertical">Vertical Spread</option>
                <option value="coveredCall">Covered Call</option>
                <option value="ironCondor">Iron Condor</option>
                <option value="strangle">Strangle</option>
                <option value="straddle">Straddle</option>
                <option value="stock">Stock</option>
                <option value="custom">Custom</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Entry Price (Net Debit/Credit) *
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.entryPrice}
                onChange={(e) =>
                  setFormData({ ...formData, entryPrice: parseFloat(e.target.value) || 0 })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
              />
              <p className="text-xs text-gray-500 mt-1">Positive for debit, negative for credit</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Quantity (Contracts/Shares) *
              </label>
              <input
                type="number"
                value={formData.quantity}
                onChange={(e) =>
                  setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="1"
                min="1"
              />
            </div>
          </div>
        </div>

        {/* Legs */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold">Trade Legs</h3>
            <button
              type="button"
              onClick={addLeg}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
            >
              + Add Leg
            </button>
          </div>

          <div className="space-y-4">
            {formData.legs.map((leg, index) => (
              <div key={index} className="border border-gray-200 p-4 rounded-md">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-medium">Leg {index + 1}</h4>
                  {formData.legs.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeLeg(index)}
                      className="text-red-600 hover:text-red-700 text-sm"
                    >
                      Remove
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                    <select
                      value={leg.type}
                      onChange={(e) => updateLeg(index, 'type', e.target.value as LegType)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    >
                      <option value="call">Call</option>
                      <option value="put">Put</option>
                      <option value="stock">Stock</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Side</label>
                    <select
                      value={leg.side}
                      onChange={(e) => updateLeg(index, 'side', e.target.value as LegSide)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    >
                      <option value="buy">Buy</option>
                      <option value="sell">Sell</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                    <input
                      type="number"
                      value={leg.quantity}
                      onChange={(e) => updateLeg(index, 'quantity', parseInt(e.target.value) || 1)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      min="1"
                    />
                  </div>

                  {leg.type !== 'stock' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Strike
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={leg.strike || ''}
                          onChange={(e) =>
                            updateLeg(index, 'strike', parseFloat(e.target.value) || undefined)
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                          placeholder="0.00"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Expiry
                        </label>
                        <input
                          type="date"
                          value={leg.expiry || ''}
                          onChange={(e) => updateLeg(index, 'expiry', e.target.value || undefined)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        />
                      </div>
                    </>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Price</label>
                    <input
                      type="number"
                      step="0.01"
                      value={leg.price || ''}
                      onChange={(e) =>
                        updateLeg(index, 'price', parseFloat(e.target.value) || undefined)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-xl font-semibold mb-4">Notes</h3>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={3}
            placeholder="Optional notes about this trade..."
          />
        </div>

        {/* Metrics Display */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-xl font-semibold mb-4">Risk Metrics</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div>
              <p className="text-sm text-gray-600">Max Risk</p>
              <p className="text-lg font-semibold">
                {metrics.maxRisk !== undefined ? `$${metrics.maxRisk.toFixed(2)}` : 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Max Reward</p>
              <p className="text-lg font-semibold">
                {metrics.maxReward !== undefined ? `$${metrics.maxReward.toFixed(2)}` : 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Risk/Reward</p>
              <p className="text-lg font-semibold">
                {metrics.rr !== undefined ? metrics.rr.toFixed(2) : 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">POP (Est.)</p>
              <p className="text-lg font-semibold">
                {metrics.popEst !== undefined ? `${(metrics.popEst * 100).toFixed(1)}%` : 'N/A'}
              </p>
            </div>
          </div>

          {metrics.breakeven && metrics.breakeven.length > 0 && (
            <div className="mb-4">
              <p className="text-sm text-gray-600">Breakeven</p>
              <p className="text-lg font-semibold">
                {metrics.breakeven.map((be) => `$${be.toFixed(2)}`).join(', ')}
              </p>
            </div>
          )}

          <div
            className={`p-4 rounded-md bg-${getRiskLevelColor(assessment.riskLevel)}-50 border border-${getRiskLevelColor(assessment.riskLevel)}-200`}
          >
            <div className="flex items-start">
              <span
                className={`px-2 py-1 rounded text-xs font-semibold bg-${getRiskLevelColor(assessment.riskLevel)}-600 text-white mr-3`}
              >
                {assessment.riskLevel.toUpperCase()}
              </span>
              <p className="text-sm text-gray-800">{assessment.text}</p>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex space-x-4">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors font-semibold"
          >
            {loading ? 'Saving...' : isEditing ? 'Update Trade' : 'Create Trade'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
