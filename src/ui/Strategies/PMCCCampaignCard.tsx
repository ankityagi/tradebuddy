import React from 'react';
import { Link } from 'react-router-dom';
import type { Campaign, Trade } from '../../domain/types';
import {
  pmccACB,
  campaignPremiumCollected,
  campaignNetPL,
  phaseLabel,
  PMCC_PHASES,
} from '../../domain/campaigns';

interface PMCCCampaignCardProps {
  campaign: Campaign;
  trades: Trade[];
}

export function PMCCCampaignCard({ campaign, trades }: PMCCCampaignCardProps) {
  const campaignTrades = trades.filter(t => t.campaignId === campaign.id);
  const premium = campaignPremiumCollected(campaign, campaignTrades);
  const acb = pmccACB(campaign, campaignTrades);
  const netPL = campaignNetPL(campaign, campaignTrades);
  const isCompleted = campaign.status === 'completed';

  const leapsTrade = campaignTrades.find(t => t.tradeRole === 'leaps');
  const shortCalls = campaignTrades.filter(t => t.tradeRole === 'short_call');
  const openShortCall = shortCalls.find(t => t.status === 'open');

  const currentPhaseIndex = PMCC_PHASES.indexOf(campaign.phase as typeof PMCC_PHASES[number]);

  // Extrinsic check: simplified — flag if open short call strike is above LEAPS strike
  const leapsStrike = campaign.leapsStrike;
  const shortCallStrike = openShortCall?.legs[0]?.strike;
  const extrinsicOk = leapsStrike == null || shortCallStrike == null || shortCallStrike > leapsStrike;

  return (
    <div className={`bg-gray-800 rounded-xl border p-5 ${isCompleted ? 'border-gray-600' : 'border-gray-700'}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-white">{campaign.ticker}</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 font-medium">PMCC</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              isCompleted ? 'bg-gray-700 text-gray-400' : 'bg-emerald-500/20 text-emerald-400'
            }`}>
              {isCompleted ? 'Completed' : 'Active'}
            </span>
          </div>
          <p className="text-sm text-gray-400 mt-0.5">
            Started {new Date(campaign.startedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
        <span className={`text-sm font-semibold ${netPL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
          {netPL >= 0 ? '+' : ''}${netPL.toFixed(2)}
        </span>
      </div>

      {/* Phase Timeline */}
      <div className="mb-4">
        <div className="flex items-center gap-0">
          {PMCC_PHASES.map((phase, i) => {
            const isPast = i < currentPhaseIndex;
            const isCurrent = i === currentPhaseIndex;
            const isLast = i === PMCC_PHASES.length - 1;
            return (
              <React.Fragment key={phase}>
                <div className="flex flex-col items-center">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    isPast ? 'bg-emerald-500 text-white' :
                    isCurrent ? 'bg-purple-500 text-white ring-2 ring-purple-400/40' :
                    'bg-gray-700 text-gray-500'
                  }`}>
                    {isPast ? '✓' : i + 1}
                  </div>
                  <span className={`text-xs mt-1 whitespace-nowrap ${
                    isCurrent ? 'text-purple-400 font-semibold' :
                    isPast ? 'text-emerald-400' :
                    'text-gray-500'
                  }`}>
                    {phaseLabel(phase)}
                  </span>
                </div>
                {!isLast && (
                  <div className={`flex-1 h-px mx-2 mt-[-10px] ${isPast ? 'bg-emerald-500' : 'bg-gray-700'}`} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {campaign.leapsCost != null && (
          <div className="bg-gray-700/50 rounded-lg p-3">
            <p className="text-xs text-gray-400">LEAPS</p>
            <p className="text-sm font-semibold text-white">${campaign.leapsCost.toFixed(2)}/shr</p>
            {campaign.leapsStrike && campaign.leapsExpiry && (
              <p className="text-xs text-gray-500 mt-0.5">
                ${campaign.leapsStrike}C · {campaign.leapsExpiry}
              </p>
            )}
            {leapsTrade?.metrics?.delta && (
              <p className="text-xs text-gray-500">Δ {leapsTrade.metrics.delta.toFixed(2)}</p>
            )}
          </div>
        )}

        <div className="bg-gray-700/50 rounded-lg p-3">
          <p className="text-xs text-gray-400">Premium Collected</p>
          <p className="text-sm font-semibold text-emerald-400">${premium.toFixed(2)}</p>
          <p className="text-xs text-gray-500 mt-0.5">{shortCalls.length} short calls sold</p>
        </div>

        {acb != null && (
          <div className="bg-gray-700/50 rounded-lg p-3 col-span-2">
            <p className="text-xs text-gray-400">Effective LEAPS Cost</p>
            <p className="text-sm font-bold text-white">${acb.toFixed(2)}/shr</p>
            {campaign.leapsCost != null && (
              <p className="text-xs text-gray-500 mt-0.5">
                Reduced from ${campaign.leapsCost.toFixed(2)} by ${(campaign.leapsCost - acb).toFixed(2)}/shr
              </p>
            )}
          </div>
        )}
      </div>

      {/* Extrinsic check */}
      {openShortCall && (
        <div className={`rounded-lg p-3 mb-4 text-xs ${
          extrinsicOk
            ? 'bg-emerald-900/30 border border-emerald-700/40 text-emerald-400'
            : 'bg-red-900/30 border border-red-700/40 text-red-400'
        }`}>
          Open short call: ${shortCallStrike ?? 'N/A'} · Exp {openShortCall.legs[0]?.expiry ?? 'N/A'}{' '}
          {extrinsicOk ? '· Short strike above LEAPS ✓' : '· ⚠ Short strike below LEAPS strike'}
        </div>
      )}

      {/* Trades link */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-700">
        <span className="text-xs text-gray-500">{campaign.tradeIds.length} trades in campaign</span>
        <Link
          to={`/trades?ticker=${campaign.ticker}`}
          className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
        >
          View trades →
        </Link>
      </div>
    </div>
  );
}
