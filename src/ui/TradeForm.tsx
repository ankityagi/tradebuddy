import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { z } from 'zod';
import type { Leg, Strategy, LegType, LegSide, Campaign, TradeRole, CampaignType } from '../domain/types';
import { computeMetrics } from '../domain/risk';
import { generateAssessment, getRiskLevelColor } from '../domain/assessment';
import { createTrade, getTrade, updateTrade, getCampaignById, getActiveCampaigns, linkTradeToCampaign, unlinkTradeFromCampaign, createCampaign } from '../data/repo';
import { phaseLabel } from '../domain/campaigns';

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

function roleLabel(role: TradeRole): string {
  const labels: Record<TradeRole, string> = {
    csp: 'Cash-Secured Put',
    cc: 'Covered Call',
    roll: 'Roll',
    assignment: 'Assignment',
    leaps: 'LEAPS',
    short_call: 'Short Call',
  };
  return labels[role] ?? role;
}

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
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [tradeRole, setTradeRole] = useState<TradeRole | undefined>(undefined);
  const [availableCampaigns, setAvailableCampaigns] = useState<Campaign[]>([]);
  const [linkCampaignId, setLinkCampaignId] = useState('');
  const [linkRole, setLinkRole] = useState<TradeRole>('csp');
  const [linking, setLinking] = useState(false);
  const [linkError, setLinkError] = useState('');
  const [unlinking, setUnlinking] = useState(false);
  const [showCreateCampaign, setShowCreateCampaign] = useState(false);
  const [newCampaignType, setNewCampaignType] = useState<CampaignType>('wheel');
  const [newCampaignRole, setNewCampaignRole] = useState<TradeRole>('csp');
  const [creating, setCreating] = useState(false);

  // Load trade if editing
  useEffect(() => {
    if (isEditing && id) {
      setLoadingTrade(true);
      getTrade(id)
        .then(async (trade) => {
          if (trade) {
            setFormData({
              ticker: trade.ticker,
              strategy: trade.strategy,
              legs: trade.legs,
              entryPrice: trade.entryPrice,
              quantity: trade.quantity,
              notes: trade.notes || '',
            });
            setTradeRole(trade.tradeRole);
            if (trade.campaignId) {
              const c = await getCampaignById(trade.campaignId).catch(() => null);
              setCampaign(c ?? null);
            }
          }
        })
        .finally(() => setLoadingTrade(false));
    }
  }, [id, isEditing]);

  // Load active campaigns for the link UI (edit mode only)
  useEffect(() => {
    if (isEditing) {
      getActiveCampaigns().then(setAvailableCampaigns).catch(() => {});
    }
  }, [isEditing]);

  const handleUnlinkFromCampaign = async () => {
    if (!id || !campaign) return;
    setUnlinking(true);
    try {
      await unlinkTradeFromCampaign(id, campaign.id);
      setCampaign(null);
      setTradeRole(undefined);
    } finally {
      setUnlinking(false);
    }
  };

  const handleLinkToCampaign = async () => {
    if (!id || !linkCampaignId) return;
    setLinking(true);
    setLinkError('');
    try {
      await linkTradeToCampaign(id, linkCampaignId, linkRole);
      const c = await getCampaignById(linkCampaignId);
      setCampaign(c ?? null);
      setTradeRole(linkRole);
    } catch (err) {
      setLinkError(err instanceof Error ? err.message : 'Failed to link campaign');
    } finally {
      setLinking(false);
    }
  };

  const handleCreateAndLinkCampaign = async () => {
    if (!id) return;
    setCreating(true);
    setLinkError('');
    try {
      const initialPhase = newCampaignType === 'wheel' ? 'selling_puts' : 'leaps_open';
      const newCampaign = await createCampaign({
        ticker: formData.ticker,
        type: newCampaignType,
        status: 'active',
        phase: initialPhase,
        tradeIds: [],
        startedAt: new Date().toISOString(),
      });
      await linkTradeToCampaign(id, newCampaign.id, newCampaignRole);
      setCampaign({ ...newCampaign, tradeIds: [id] });
      setTradeRole(newCampaignRole);
      setShowCreateCampaign(false);
    } catch (err) {
      setLinkError(err instanceof Error ? err.message : 'Failed to create campaign');
    } finally {
      setCreating(false);
    }
  };

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

      navigate('/trades');
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
        <div className="text-gray-400">Loading trade...</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-3xl font-bold text-white mb-6">{isEditing ? 'Edit Trade' : 'New Trade'}</h2>

      {/* Campaign banner — shown when editing a campaign-linked trade */}
      {campaign && (
        <div className="bg-emerald-900/30 border border-emerald-700 rounded-xl p-4 mb-6 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs font-bold uppercase tracking-wide bg-emerald-500 text-white px-2 py-0.5 rounded">
              {campaign.type === 'wheel' ? 'Wheel' : 'PMCC'}
            </span>
            <span className="text-sm font-semibold text-white">{campaign.ticker} Campaign</span>
            <span className="text-xs text-gray-400">·</span>
            <span className="text-sm text-gray-300">Phase: <span className="text-emerald-400 font-medium">{phaseLabel(campaign.phase)}</span></span>
            {tradeRole && (
              <>
                <span className="text-xs text-gray-400">·</span>
                <span className="text-sm text-gray-300">Role: <span className="text-emerald-400 font-medium">{roleLabel(tradeRole)}</span></span>
              </>
            )}
            <span className={`text-xs px-2 py-0.5 rounded-full ${campaign.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-700 text-gray-400'}`}>
              {campaign.status === 'active' ? 'Active' : 'Completed'}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleUnlinkFromCampaign}
              disabled={unlinking}
              className="text-xs text-gray-400 hover:text-red-400 whitespace-nowrap transition-colors disabled:opacity-50"
            >
              {unlinking ? 'Unlinking…' : 'Unlink'}
            </button>
            <Link
              to="/strategies"
              className="text-xs text-emerald-400 hover:text-emerald-300 whitespace-nowrap font-medium"
            >
              View campaign →
            </Link>
          </div>
        </div>
      )}

      {/* Campaign linker — shown when editing an unlinked trade */}
      {isEditing && !campaign && (
        <div className="bg-gray-800 border border-gray-600 rounded-xl p-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-gray-300">Campaign</p>
            {availableCampaigns.length > 0 && (
              <button
                type="button"
                onClick={() => { setShowCreateCampaign(v => !v); setLinkError(''); }}
                className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
              >
                {showCreateCampaign ? '← Link existing' : '+ Create new'}
              </button>
            )}
          </div>

          {/* Create new campaign */}
          {(showCreateCampaign || availableCampaigns.length === 0) ? (
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex-1 min-w-36">
                <label className="block text-xs text-gray-400 mb-1">Strategy</label>
                <select
                  value={newCampaignType}
                  onChange={(e) => {
                    const t = e.target.value as CampaignType;
                    setNewCampaignType(t);
                    setNewCampaignRole(t === 'wheel' ? 'csp' : 'leaps');
                  }}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="wheel">Wheel</option>
                  <option value="pmcc">PMCC</option>
                </select>
              </div>
              <div className="flex-1 min-w-36">
                <label className="block text-xs text-gray-400 mb-1">Trade Role</label>
                <select
                  value={newCampaignRole}
                  onChange={(e) => setNewCampaignRole(e.target.value as TradeRole)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {newCampaignType === 'wheel' ? (
                    <>
                      <option value="csp">Cash-Secured Put</option>
                      <option value="cc">Covered Call</option>
                      <option value="assignment">Assignment</option>
                      <option value="roll">Roll</option>
                    </>
                  ) : (
                    <>
                      <option value="leaps">LEAPS</option>
                      <option value="short_call">Short Call</option>
                      <option value="roll">Roll</option>
                    </>
                  )}
                </select>
              </div>
              <button
                type="button"
                onClick={handleCreateAndLinkCampaign}
                disabled={!formData.ticker || creating}
                className="px-4 py-2 bg-emerald-600 text-white rounded-md text-sm font-medium hover:bg-emerald-700 disabled:bg-gray-600 disabled:text-gray-400 transition-colors"
              >
                {creating ? 'Creating…' : 'Create & Link'}
              </button>
            </div>
          ) : (
            /* Link to existing campaign */
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex-1 min-w-40">
                <label className="block text-xs text-gray-400 mb-1">Campaign</label>
                <select
                  value={linkCampaignId}
                  onChange={(e) => setLinkCampaignId(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">Select campaign…</option>
                  {availableCampaigns.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.ticker} — {c.type === 'wheel' ? 'Wheel' : 'PMCC'} ({phaseLabel(c.phase)})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex-1 min-w-36">
                <label className="block text-xs text-gray-400 mb-1">Trade Role</label>
                <select
                  value={linkRole}
                  onChange={(e) => setLinkRole(e.target.value as TradeRole)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="csp">Cash-Secured Put</option>
                  <option value="cc">Covered Call</option>
                  <option value="roll">Roll</option>
                  <option value="assignment">Assignment</option>
                  <option value="leaps">LEAPS</option>
                  <option value="short_call">Short Call</option>
                </select>
              </div>
              <button
                type="button"
                onClick={handleLinkToCampaign}
                disabled={!linkCampaignId || linking}
                className="px-4 py-2 bg-emerald-600 text-white rounded-md text-sm font-medium hover:bg-emerald-700 disabled:bg-gray-600 disabled:text-gray-400 transition-colors"
              >
                {linking ? 'Linking…' : 'Link'}
              </button>
            </div>
          )}
          {linkError && <p className="text-red-400 text-xs mt-2">{linkError}</p>}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Ticker and Strategy */}
        <div className="bg-gray-800 border border-gray-700 p-6 rounded-xl">
          <h3 className="text-lg font-semibold text-white mb-4">Basic Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Ticker Symbol *
              </label>
              <input
                type="text"
                value={formData.ticker}
                onChange={(e) => setFormData({ ...formData, ticker: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="e.g., AAPL"
              />
              {errors.ticker && <p className="text-red-400 text-sm mt-1">{errors.ticker}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Strategy *</label>
              <select
                value={formData.strategy}
                onChange={(e) => setFormData({ ...formData, strategy: e.target.value as Strategy })}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
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
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Entry Price (Net Debit/Credit) *
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.entryPrice}
                onChange={(e) =>
                  setFormData({ ...formData, entryPrice: parseFloat(e.target.value) || 0 })
                }
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="0.00"
              />
              <p className="text-xs text-gray-500 mt-1">Positive for debit, negative for credit</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Quantity (Contracts/Shares) *
              </label>
              <input
                type="number"
                value={formData.quantity}
                onChange={(e) =>
                  setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })
                }
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="1"
                min="1"
              />
            </div>
          </div>
        </div>

        {/* Legs */}
        <div className="bg-gray-800 border border-gray-700 p-6 rounded-xl">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-white">Trade Legs</h3>
            <button
              type="button"
              onClick={addLeg}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
            >
              + Add Leg
            </button>
          </div>

          <div className="space-y-4">
            {formData.legs.map((leg, index) => (
              <div key={index} className="border border-gray-700 bg-gray-900/50 p-4 rounded-lg">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-sm font-semibold text-gray-300">Leg {index + 1}</h4>
                  {formData.legs.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeLeg(index)}
                      className="text-red-400 hover:text-red-300 text-sm"
                    >
                      Remove
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">Type</label>
                    <select
                      value={leg.type}
                      onChange={(e) => updateLeg(index, 'type', e.target.value as LegType)}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="call">Call</option>
                      <option value="put">Put</option>
                      <option value="stock">Stock</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">Side</label>
                    <select
                      value={leg.side}
                      onChange={(e) => updateLeg(index, 'side', e.target.value as LegSide)}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="buy">Buy</option>
                      <option value="sell">Sell</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">Quantity</label>
                    <input
                      type="number"
                      value={leg.quantity}
                      onChange={(e) => updateLeg(index, 'quantity', parseInt(e.target.value) || 1)}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      min="1"
                    />
                  </div>

                  {leg.type !== 'stock' && (
                    <>
                      <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1">
                          Strike
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={leg.strike || ''}
                          onChange={(e) =>
                            updateLeg(index, 'strike', parseFloat(e.target.value) || undefined)
                          }
                          className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          placeholder="0.00"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1">
                          Expiry
                        </label>
                        <input
                          type="date"
                          value={leg.expiry || ''}
                          onChange={(e) => updateLeg(index, 'expiry', e.target.value || undefined)}
                          className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                    </>
                  )}

                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">Price</label>
                    <input
                      type="number"
                      step="0.01"
                      value={leg.price || ''}
                      onChange={(e) =>
                        updateLeg(index, 'price', parseFloat(e.target.value) || undefined)
                      }
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div className="bg-gray-800 border border-gray-700 p-6 rounded-xl">
          <h3 className="text-lg font-semibold text-white mb-4">Notes</h3>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            rows={3}
            placeholder="Optional notes about this trade..."
          />
        </div>

        {/* Metrics Display */}
        <div className="bg-gray-800 border border-gray-700 p-6 rounded-xl">
          <h3 className="text-lg font-semibold text-white mb-4">Risk Metrics</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div>
              <p className="text-sm text-gray-400">Max Risk</p>
              <p className="text-lg font-semibold text-white">
                {metrics.maxRisk !== undefined ? `$${metrics.maxRisk.toFixed(2)}` : 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Max Reward</p>
              <p className="text-lg font-semibold text-white">
                {metrics.maxReward !== undefined ? `$${metrics.maxReward.toFixed(2)}` : 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Risk/Reward</p>
              <p className="text-lg font-semibold text-white">
                {metrics.rr !== undefined ? metrics.rr.toFixed(2) : 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-400">POP (Est.)</p>
              <p className="text-lg font-semibold text-white">
                {metrics.popEst !== undefined ? `${(metrics.popEst * 100).toFixed(1)}%` : 'N/A'}
              </p>
            </div>
          </div>

          {metrics.breakeven && metrics.breakeven.length > 0 && (
            <div className="mb-4">
              <p className="text-sm text-gray-400">Breakeven</p>
              <p className="text-lg font-semibold text-white">
                {metrics.breakeven.map((be) => `$${be.toFixed(2)}`).join(', ')}
              </p>
            </div>
          )}

          <div className="p-4 rounded-lg bg-gray-900/60 border border-gray-700">
            <div className="flex items-start gap-3">
              <span
                className={`px-2 py-1 rounded text-xs font-semibold bg-${getRiskLevelColor(assessment.riskLevel)}-600 text-white shrink-0`}
              >
                {assessment.riskLevel.toUpperCase()}
              </span>
              <p className="text-sm text-gray-300">{assessment.text}</p>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex space-x-4">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 px-6 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:bg-gray-600 disabled:text-gray-400 transition-colors font-semibold"
          >
            {loading ? 'Saving...' : isEditing ? 'Update Trade' : 'Create Trade'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/trades')}
            className="px-6 py-3 bg-gray-700 text-white rounded-xl hover:bg-gray-600 transition-colors font-semibold"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
