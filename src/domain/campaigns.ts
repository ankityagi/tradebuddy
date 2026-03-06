/**
 * Campaign calculation utilities for Wheel and PMCC strategies.
 * All functions are pure — no side effects, no API calls.
 */

import type { Campaign, Trade, WheelPhase, PMCCPhase } from './types';

/**
 * Total net premium collected for a campaign (across CSPs, CCs, rolls, short calls)
 * net of fees. Returns dollar amount (not per-share).
 */
export function campaignPremiumCollected(campaign: Campaign, trades: Trade[]): number {
  return trades
    .filter(t => t.campaignId === campaign.id && t.tradeRole &&
      ['csp', 'cc', 'roll', 'short_call'].includes(t.tradeRole))
    .reduce((sum, t) => {
      const gross = t.entryPrice * t.quantity * 100;
      const fee = t.fee ?? 0;
      return sum + gross - fee;
    }, 0);
}

/**
 * Number of contracts in the campaign (derived from the first CSP or LEAPS trade).
 */
export function campaignContracts(campaign: Campaign, trades: Trade[]): number {
  const anchor = trades.find(t =>
    t.campaignId === campaign.id &&
    (t.tradeRole === 'csp' || t.tradeRole === 'leaps')
  );
  return anchor?.quantity ?? 1;
}

/**
 * Wheel Adjusted Cost Basis per share.
 * ACB = assignedStrike − (totalNetPremium / (contracts × 100))
 * Returns null if the wheel hasn't been assigned yet.
 */
export function wheelACB(campaign: Campaign, trades: Trade[]): number | null {
  if (campaign.type !== 'wheel' || campaign.assignedStrike == null) return null;
  const contracts = campaignContracts(campaign, trades);
  const totalPremium = campaignPremiumCollected(campaign, trades);
  const perShare = totalPremium / (contracts * 100);
  return campaign.assignedStrike - perShare;
}

/**
 * PMCC Adjusted Cost Basis per share.
 * ACB = leapsCost − (shortCallPremium / (contracts × 100))
 */
export function pmccACB(campaign: Campaign, trades: Trade[]): number | null {
  if (campaign.type !== 'pmcc' || campaign.leapsCost == null) return null;
  const contracts = campaignContracts(campaign, trades);
  const shortCallPremium = trades
    .filter(t => t.campaignId === campaign.id && t.tradeRole === 'short_call')
    .reduce((sum, t) => sum + t.entryPrice * t.quantity * 100 - (t.fee ?? 0), 0);
  return campaign.leapsCost - shortCallPremium / (contracts * 100);
}

/**
 * Sum of all closed trade realizedPL values within a campaign.
 */
export function campaignNetPL(campaign: Campaign, trades: Trade[]): number {
  return trades
    .filter(t => t.campaignId === campaign.id && t.realizedPL != null)
    .reduce((sum, t) => sum + (t.realizedPL ?? 0), 0);
}

/**
 * Whether a campaign is profitable (net P&L > 0).
 * Only meaningful for completed campaigns.
 */
export function campaignIsWin(campaign: Campaign, trades: Trade[]): boolean {
  return campaignNetPL(campaign, trades) > 0;
}

/**
 * Infer the TradeRole a parsed trade should have within a campaign,
 * based on the trade's side, option type, and DTE.
 */
export function inferTradeRole(
  optionType: 'call' | 'put',
  side: 'buy' | 'sell',
  dte?: number
): Trade['tradeRole'] {
  if (side === 'sell' && optionType === 'put') return 'csp';
  if (side === 'sell' && optionType === 'call') return 'cc';
  // Deep ITM long-dated call → LEAPS for PMCC
  if (side === 'buy' && optionType === 'call' && dte != null && dte > 180) return 'leaps';
  if (side === 'buy' && optionType === 'call') return 'short_call';
  return undefined;
}

/**
 * What campaign type does this trade role suggest starting?
 */
export function suggestedCampaignType(role: Trade['tradeRole']): Campaign['type'] | null {
  if (role === 'csp') return 'wheel';
  if (role === 'leaps') return 'pmcc';
  return null;
}

/**
 * Advance the wheel phase based on what just happened.
 */
export function nextWheelPhase(
  current: WheelPhase,
  event: 'csp_added' | 'assigned' | 'cc_added' | 'called_away' | 'exited'
): WheelPhase {
  switch (event) {
    case 'csp_added': return 'selling_puts';
    case 'assigned': return 'assigned';
    case 'cc_added': return 'selling_calls';
    case 'called_away': return 'called_away';
    case 'exited': return 'exited';
    default: return current;
  }
}

/**
 * Human-readable label for any phase value.
 */
export function phaseLabel(phase: WheelPhase | PMCCPhase): string {
  const labels: Record<string, string> = {
    selling_puts: 'Selling Puts',
    assigned: 'Assigned',
    selling_calls: 'Selling Calls',
    called_away: 'Called Away',
    exited: 'Exited Early',
    leaps_open: 'LEAPS Open',
    closed: 'Closed',
  };
  return labels[phase] ?? phase;
}

/**
 * Wheel phase ordered list for progress display.
 */
export const WHEEL_PHASES: WheelPhase[] = [
  'selling_puts',
  'assigned',
  'selling_calls',
  'called_away',
];

/**
 * PMCC phase ordered list for progress display.
 */
export const PMCC_PHASES: PMCCPhase[] = [
  'leaps_open',
  'selling_calls',
  'closed',
];
