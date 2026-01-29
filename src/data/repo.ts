/**
 * TradeBuddy MVP - Repository Layer
 *
 * This file provides a clean API for CRUD operations on trades,
 * abstracting Dexie implementation details.
 */

import { db } from './db';
import type { Trade, CreateTradeInput, UpdateTradeInput } from '../domain/types';

/**
 * Generate a simple UUID v4
 */
function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Get current ISO timestamp
 */
function now(): string {
  return new Date().toISOString();
}

/**
 * Create a new trade and persist to IndexedDB
 */
export async function createTrade(input: CreateTradeInput): Promise<Trade> {
  const trade: Trade = {
    ...input,
    id: generateId(),
    createdAt: now(),
    updatedAt: now(),
  };

  await db.trades.add(trade);
  return trade;
}

/**
 * Get a trade by ID
 */
export async function getTrade(id: string): Promise<Trade | undefined> {
  return await db.trades.get(id);
}

/**
 * Get all trades
 */
export async function getAllTrades(): Promise<Trade[]> {
  return await db.trades.toArray();
}

/**
 * Get all open trades
 */
export async function getOpenTrades(): Promise<Trade[]> {
  return await db.trades.where('status').equals('open').toArray();
}

/**
 * Get all closed trades
 */
export async function getClosedTrades(): Promise<Trade[]> {
  return await db.trades.where('status').equals('closed').toArray();
}

/**
 * Update a trade
 */
export async function updateTrade(id: string, updates: UpdateTradeInput): Promise<void> {
  await db.trades.update(id, {
    ...updates,
    updatedAt: now(),
  });
}

/**
 * Delete a trade
 */
export async function deleteTrade(id: string): Promise<void> {
  await db.trades.delete(id);
}

/**
 * Close a trade with exit price and realized P/L
 */
export async function closeTrade(id: string, exitPrice: number, realizedPL: number): Promise<void> {
  await db.trades.update(id, {
    status: 'closed',
    exitPrice,
    realizedPL,
    closedAt: now(),
    updatedAt: now(),
  });
}

/**
 * Get trades filtered by ticker (case-insensitive substring match)
 */
export async function getTradesByTicker(ticker: string): Promise<Trade[]> {
  const allTrades = await db.trades.toArray();
  const normalizedTicker = ticker.toLowerCase();
  return allTrades.filter((t) => t.ticker.toLowerCase().includes(normalizedTicker));
}

/**
 * Clear all trades (for testing purposes)
 */
export async function clearAllTrades(): Promise<void> {
  await db.trades.clear();
}
