import React from 'react';
import { Link } from 'react-router-dom';
import type { Campaign, Trade } from '../../domain/types';
import {
  wheelACB,
  campaignPremiumCollected,
  campaignNetPL,
  phaseLabel,
  WHEEL_PHASES,
} from '../../domain/campaigns';

interface WheelCampaignCardProps {
  campaign: Campaign;
  trades: Trade[];
}

export function WheelCampaignCard({ campaign, trades }: WheelCampaignCardProps) {
  const campaignTrades = trades.filter(t => t.campaignId === campaign.id);
  const premium = campaignPremiumCollected(campaign, campaignTrades);
  const acb = wheelACB(campaign, campaignTrades);
  const netPL = campaignNetPL(campaign, campaignTrades);
  const isCompleted = campaign.status === 'completed';

  const openCC = campaignTrades.find(
    t => t.tradeRole === 'cc' && t.status === 'open'
  );

  const cspTrades = campaignTrades.filter(t => t.tradeRole === 'csp');
  const ccTrades = campaignTrades.filter(t => t.tradeRole === 'cc');

  const currentPhaseIndex = WHEEL_PHASES.indexOf(campaign.phase as typeof WHEEL_PHASES[number]);

  return (
    <div className={`bg-gray-800 rounded-xl border p-5 ${isCompleted ? 'border-gray-600' : 'border-gray-700'}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-white">{campaign.ticker}</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 font-medium">Wheel</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              isCompleted ? 'bg-gray-700 text-gray-400' : 'bg-emerald-500/20 text-emerald-400'
            }`}>
              {isCompleted ? 'Completed' : 'Active'}
            </span>
          </div>
          <p className="text-sm text-gray-400 mt-0.5">
            Started {new Date(campaign.startedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            {campaign.completedAt && ` · Completed ${new Date(campaign.completedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`}
          </p>
        </div>
        <span className={`text-sm font-semibold ${netPL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
          {netPL >= 0 ? '+' : ''}${netPL.toFixed(2)}
        </span>
      </div>

      {/* Phase Timeline */}
      <div className="mb-4">
        <div className="flex items-center gap-0">
          {WHEEL_PHASES.map((phase, i) => {
            const isPast = i < currentPhaseIndex;
            const isCurrent = i === currentPhaseIndex;
            const isLast = i === WHEEL_PHASES.length - 1;
            return (
              <React.Fragment key={phase}>
                <div className="flex flex-col items-center">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                    isPast ? 'bg-emerald-500 text-white' :
                    isCurrent ? 'bg-blue-500 text-white ring-2 ring-blue-400/40' :
                    'bg-gray-700 text-gray-500'
                  }`}>
                    {isPast ? '✓' : i + 1}
                  </div>
                  <span className={`text-xs mt-1 text-center whitespace-nowrap ${
                    isCurrent ? 'text-blue-400 font-semibold' :
                    isPast ? 'text-emerald-400' :
                    'text-gray-500'
                  }`}>
                    {phaseLabel(phase)}
                  </span>
                </div>
                {!isLast && (
                  <div className={`flex-1 h-px mx-1 mt-[-10px] ${isPast ? 'bg-emerald-500' : 'bg-gray-700'}`} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {campaign.assignedStrike != null && (
          <div className="bg-gray-700/50 rounded-lg p-3">
            <p className="text-xs text-gray-400">Assignment</p>
            <p className="text-sm font-semibold text-white">${campaign.assignedStrike}/shr</p>
            {campaign.assignedAt && (
              <p className="text-xs text-gray-500 mt-0.5">
                {new Date(campaign.assignedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </p>
            )}
          </div>
        )}

        <div className="bg-gray-700/50 rounded-lg p-3">
          <p className="text-xs text-gray-400">Premium Collected</p>
          <p className="text-sm font-semibold text-emerald-400">${premium.toFixed(2)}</p>
          <p className="text-xs text-gray-500 mt-0.5">
            {cspTrades.length} CSP · {ccTrades.length} CC
          </p>
        </div>

        {acb != null ? (
          <div className="bg-gray-700/50 rounded-lg p-3 col-span-2">
            <p className="text-xs text-gray-400">Adjusted Cost Basis (breakeven)</p>
            <p className="text-sm font-bold text-white">${acb.toFixed(2)}/shr</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Don't sell a CC below this price
            </p>
          </div>
        ) : campaign.assignedStrike == null && (
          <div className="bg-gray-700/50 rounded-lg p-3">
            <p className="text-xs text-gray-400">ACB</p>
            <p className="text-sm text-gray-500">Not yet assigned</p>
          </div>
        )}
      </div>

      {/* Open CC warning */}
      {openCC && acb != null && (
        <div className={`rounded-lg p-3 mb-4 text-xs ${
          (openCC.legs[0]?.strike ?? 0) >= acb
            ? 'bg-emerald-900/30 border border-emerald-700/40 text-emerald-400'
            : 'bg-red-900/30 border border-red-700/40 text-red-400'
        }`}>
          Open CC: ${openCC.legs[0]?.strike ?? 'N/A'} strike · Exp {openCC.legs[0]?.expiry ?? 'N/A'}{' '}
          {(openCC.legs[0]?.strike ?? 0) >= acb ? '· Above ACB ✓' : '· ⚠ Below ACB'}
        </div>
      )}

      {/* Trades link */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-700">
        <span className="text-xs text-gray-500">{campaign.tradeIds.length} trades in campaign</span>
        <Link
          to={`/trades?ticker=${campaign.ticker}`}
          className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
        >
          View trades →
        </Link>
      </div>
    </div>
  );
}
