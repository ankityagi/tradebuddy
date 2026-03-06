/**
 * TradeBuddy MVP - Core Type Definitions
 *
 * This file contains all the core types used throughout the application.
 */

/**
 * Type of option contract or position
 */
export type LegType = 'call' | 'put' | 'stock';

/**
 * Trade side (direction)
 */
export type LegSide = 'buy' | 'sell';

/**
 * Trading strategy type
 */
export type Strategy =
  | 'vertical' // Vertical spread (credit or debit)
  | 'coveredCall' // Covered call
  | 'singleOption' // Single option position
  | 'stock' // Stock position
  | 'ironCondor' // Iron condor
  | 'strangle' // Strangle
  | 'straddle' // Straddle
  | 'custom'; // Custom multi-leg strategy

// ---------------------------------------------------------------------------
// Campaign types (Wheel and PMCC multi-trade strategy tracking)
// ---------------------------------------------------------------------------

export type CampaignType = 'wheel' | 'pmcc';

export type CampaignStatus = 'active' | 'completed';

/** Wheel phases in order */
export type WheelPhase =
  | 'selling_puts'   // Selling CSPs, not yet assigned
  | 'assigned'       // Got assigned — now hold 100 shares per contract
  | 'selling_calls'  // Selling CCs against the position
  | 'called_away'    // Stock called away at CC strike — cycle complete
  | 'exited';        // Manually closed/rolled out early

/** PMCC phases in order */
export type PMCCPhase =
  | 'leaps_open'     // LEAPS purchased, not yet selling short calls
  | 'selling_calls'  // Actively selling short-dated calls against LEAPS
  | 'closed';        // LEAPS sold / position fully closed

/** Role a trade plays within a campaign */
export type TradeRole =
  | 'csp'        // Wheel: cash-secured put
  | 'cc'         // Wheel: covered call
  | 'roll'       // Either: net roll transaction (BTC + STO as one entry)
  | 'assignment' // Wheel: assignment event (transitions phase, no P/L entry)
  | 'leaps'      // PMCC: the long LEAPS leg
  | 'short_call'; // PMCC: recurring short call

/**
 * A Campaign groups all trades belonging to one continuous run of the
 * Wheel or PMCC strategy on a single ticker.
 */
export interface Campaign {
  id: string;
  ticker: string;
  type: CampaignType;
  status: CampaignStatus;
  phase: WheelPhase | PMCCPhase;

  /** Ordered list of trade IDs belonging to this campaign */
  tradeIds: string[];

  // Wheel-specific fields
  /** Strike price at which CSP was assigned */
  assignedStrike?: number;
  /** Date of assignment (ISO 8601) */
  assignedAt?: string;

  // PMCC-specific fields
  /** Purchase price per share of the LEAPS */
  leapsCost?: number;
  leapsStrike?: number;
  leapsExpiry?: string;

  startedAt: string;
  completedAt?: string;
  notes?: string;
}

export type CreateCampaignInput = Omit<Campaign, 'id'>;

/**
 * Trade status
 */
export type TradeStatus = 'open' | 'closed';

/**
 * Individual leg of a trade
 */
export interface Leg {
  /** Type of the leg (call, put, or stock) */
  type: LegType;

  /** Side of the trade (buy or sell) */
  side: LegSide;

  /** Strike price (optional, not applicable for stock) */
  strike?: number;

  /** Expiration date in ISO format (YYYY-MM-DD), optional for stock */
  expiry?: string;

  /** Price per contract/share */
  price?: number;

  /** Number of contracts or shares */
  quantity: number;
}

/**
 * Calculated risk metrics for a trade
 */
export interface Metrics {
  /** Maximum potential loss */
  maxRisk?: number;

  /** Maximum potential profit */
  maxReward?: number;

  /** Risk/Reward ratio (maxReward / maxRisk) */
  rr?: number;

  /** Breakeven price(s) */
  breakeven?: number[];

  /** Estimated Probability of Profit (approximate, based on normal distribution) */
  popEst?: number;

  /** Delta - rate of change of option price relative to underlying */
  delta?: number;

  /** Implied Volatility (as decimal, e.g., 0.25 = 25%) */
  iv?: number;
}

/**
 * Source information for how the trade was created
 */
export interface TradeSource {
  /** How the trade was created */
  kind: 'manual' | 'paste' | 'api';

  /** Raw text if parsed from paste */
  raw?: string;

  /** Parsed fields if from paste */
  parsed?: Record<string, string | number | null>;
}

/**
 * Main trade entity
 */
export interface Trade {
  /** Unique identifier (UUID) */
  id: string;

  /** Ticker symbol */
  ticker: string;

  /** Trading strategy */
  strategy: Strategy;

  /** Legs of the trade */
  legs: Leg[];

  /** Net entry price (debit/credit per contract or per share) */
  entryPrice: number;

  /** Number of contracts or shares (for position sizing) */
  quantity: number;

  /** Current status of the trade */
  status: TradeStatus;

  /** Calculated risk metrics */
  metrics: Metrics;

  /** Deterministic assessment text */
  assessment?: string;

  /** Trade creation timestamp (ISO 8601) */
  createdAt: string;

  /** Last update timestamp (ISO 8601) */
  updatedAt: string;

  /** Exit price when trade is closed */
  exitPrice?: number;

  /** Timestamp when trade was closed (ISO 8601) */
  closedAt?: string;

  /** Realized profit/loss (calculated when closed) */
  realizedPL?: number;

  /** Fees/commissions paid on entry */
  fee?: number;

  /** Optional notes */
  notes?: string;

  /** Source of the trade data */
  source?: TradeSource;

  /** Campaign this trade belongs to (Wheel or PMCC), if any */
  campaignId?: string;

  /** Role this trade plays within the campaign */
  tradeRole?: TradeRole;
}

/**
 * Input type for creating a new trade (without auto-generated fields)
 */
export type CreateTradeInput = Omit<Trade, 'id' | 'createdAt' | 'updatedAt'>;

/**
 * Input type for updating a trade (partial fields)
 */
export type UpdateTradeInput = Partial<Omit<Trade, 'id' | 'createdAt'>>;
