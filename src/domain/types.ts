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

  /** Optional notes */
  notes?: string;

  /** Source of the trade data */
  source?: TradeSource;
}

/**
 * Input type for creating a new trade (without auto-generated fields)
 */
export type CreateTradeInput = Omit<Trade, 'id' | 'createdAt' | 'updatedAt'>;

/**
 * Input type for updating a trade (partial fields)
 */
export type UpdateTradeInput = Partial<Omit<Trade, 'id' | 'createdAt'>>;
