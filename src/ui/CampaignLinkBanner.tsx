import React from 'react';
import type { Campaign, Trade } from '../domain/types';
import { phaseLabel, campaignPremiumCollected, wheelACB } from '../domain/campaigns';

export type CampaignDecision =
  | { action: 'link'; campaignId: string; role: NonNullable<Trade['tradeRole']> }
  | { action: 'new'; type: Campaign['type']; role: NonNullable<Trade['tradeRole']> }
  | { action: 'skip' };

interface CampaignLinkBannerProps {
  ticker: string;
  inferredRole: Trade['tradeRole'];
  activeCampaign: Campaign | null;
  campaignTrades: Trade[];
  onDecide: (decision: CampaignDecision) => void;
}

export function CampaignLinkBanner({
  ticker,
  inferredRole,
  activeCampaign,
  campaignTrades,
  onDecide,
}: CampaignLinkBannerProps) {
  if (!inferredRole) return null;

  // --- Link to existing campaign ---
  if (activeCampaign) {
    const isCompatible = isRoleCompatibleWithCampaign(inferredRole, activeCampaign);
    if (!isCompatible) return null;

    const premium = campaignPremiumCollected(activeCampaign, campaignTrades);
    const acb = activeCampaign.type === 'wheel' ? wheelACB(activeCampaign, campaignTrades) : null;
    const typeLabel = activeCampaign.type === 'wheel' ? 'Wheel' : 'PMCC';
    const roleLabel = roleName(inferredRole);

    return (
      <div className="mt-3 rounded-lg border border-emerald-600/40 bg-emerald-900/20 p-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-emerald-400">
              Active {typeLabel} campaign on {ticker}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              Phase: {phaseLabel(activeCampaign.phase)}
              {premium > 0 && ` · Premium collected: $${premium.toFixed(2)}`}
              {acb != null && ` · ACB: $${acb.toFixed(2)}/shr`}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              Link this trade as <span className="text-white font-medium">{roleLabel}</span>?
            </p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <button
              onClick={() => onDecide({ action: 'link', campaignId: activeCampaign.id, role: inferredRole as NonNullable<Trade['tradeRole']> })}
              className="px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
            >
              Link
            </button>
            <button
              onClick={() => onDecide({ action: 'skip' })}
              className="px-3 py-1.5 text-xs font-semibold bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors"
            >
              Skip
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- Start new campaign ---
  const campaignType = inferredRole === 'csp' ? 'wheel' : inferredRole === 'leaps' ? 'pmcc' : null;
  if (!campaignType) return null;

  const typeLabel = campaignType === 'wheel' ? 'Wheel' : 'PMCC';

  return (
    <div className="mt-3 rounded-lg border border-blue-600/40 bg-blue-900/20 p-3">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-blue-400">
            Start a {typeLabel} campaign for {ticker}?
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            Track ACB, premium collected, and phase progression across trades.
          </p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button
            onClick={() => onDecide({ action: 'new', type: campaignType, role: inferredRole as NonNullable<Trade['tradeRole']> })}
            className="px-3 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Start {typeLabel}
          </button>
          <button
            onClick={() => onDecide({ action: 'skip' })}
            className="px-3 py-1.5 text-xs font-semibold bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors"
          >
            Skip
          </button>
        </div>
      </div>
    </div>
  );
}

function isRoleCompatibleWithCampaign(role: Trade['tradeRole'], campaign: Campaign): boolean {
  if (campaign.type === 'wheel') {
    if (role === 'csp') return campaign.phase === 'selling_puts';
    if (role === 'cc') return campaign.phase === 'assigned' || campaign.phase === 'selling_calls';
    if (role === 'roll') return true;
  }
  if (campaign.type === 'pmcc') {
    if (role === 'short_call') return campaign.phase === 'selling_calls';
    if (role === 'roll') return true;
  }
  return false;
}

function roleName(role: Trade['tradeRole']): string {
  const names: Record<string, string> = {
    csp: 'Cash-Secured Put',
    cc: 'Covered Call',
    roll: 'Roll',
    leaps: 'LEAPS',
    short_call: 'Short Call',
    assignment: 'Assignment',
  };
  return role ? (names[role] ?? role) : '';
}
