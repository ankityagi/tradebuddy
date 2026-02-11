/**
 * TradeBuddy MVP - Repository Layer
 *
 * This file provides a clean API for CRUD operations on trades,
 * using Google Sheets as the backend storage.
 */

import type { Trade, CreateTradeInput, UpdateTradeInput } from '../domain/types';
import { getSheetUrl, extractSpreadsheetId } from '../services/auth';
import * as sheets from '../services/sheets';

/**
 * Get the current spreadsheet ID from localStorage
 */
function getSpreadsheetId(): string {
  const sheetUrl = getSheetUrl();
  if (!sheetUrl) {
    throw new Error('No sheet connected. Please connect a Google Sheet first.');
  }
  const spreadsheetId = extractSpreadsheetId(sheetUrl);
  if (!spreadsheetId) {
    throw new Error('Invalid sheet URL');
  }
  return spreadsheetId;
}

/**
 * Parse option type from type field
 */
function parseOptionType(type: string): 'call' | 'put' {
  const typeLower = type.toLowerCase();
  if (typeLower.includes('call') || typeLower === 'cc') {
    return 'call';
  }
  return 'put';
}

/**
 * Parse side from type field
 */
function parseSide(type: string): 'buy' | 'sell' {
  const typeLower = type.toLowerCase();
  // CSP (Cash Secured Put) and CC (Covered Call) are sell positions
  if (typeLower === 'csp' || typeLower === 'cc') {
    return 'sell';
  }
  if (typeLower.includes('buy') || typeLower === 'put' || typeLower === 'call') {
    return 'buy';
  }
  return 'sell';
}

/**
 * Convert SheetTrade to Trade
 */
function sheetTradeToTrade(sheetTrade: sheets.SheetTrade, ticker: string): Trade {
  const optionType = parseOptionType(sheetTrade.type);
  const side = parseSide(sheetTrade.type);
  const isOpen = sheetTrade.status?.toLowerCase() === 'open';

  return {
    id: sheetTrade.id,
    ticker: sheetTrade.ticker || ticker,
    strategy: sheetTrade.type || 'singleOption', // Use Type from column B
    legs: [
      {
        type: optionType,
        side: side,
        strike: sheetTrade.strike,
        expiry: sheetTrade.expiry,
        quantity: sheetTrade.qty,
      },
    ],
    entryPrice: sheetTrade.premium ?? 0, // Premium from column I
    quantity: sheetTrade.qty,
    status: isOpen ? 'open' : 'closed',
    metrics: {
      rr: sheetTrade.roi ? sheetTrade.roi / 100 : undefined,
      delta: sheetTrade.delta || undefined, // Delta from column E
      iv: sheetTrade.iv ?? undefined, // IV from column F
    },
    createdAt: sheetTrade.opened,
    updatedAt: sheetTrade.opened,
    realizedPL: sheetTrade.pnl ?? undefined,
    notes: sheetTrade.notes,
  };
}

/**
 * Convert Trade to SheetTrade (for creating/updating)
 */
function tradeToSheetTrade(trade: Trade | CreateTradeInput, ticker: string): Omit<sheets.SheetTrade, 'id'> {
  const leg = trade.legs[0]; // Use first leg for single option trades
  const isCall = leg?.type === 'call';
  const isSell = leg?.side === 'sell';

  // Determine type (CSP, CC, Put, Call)
  let type = '';
  if (isSell) {
    type = isCall ? 'CC' : 'CSP';
  } else {
    type = isCall ? 'Call' : 'Put';
  }

  const openedDate = 'createdAt' in trade ? trade.createdAt.split('T')[0] : new Date().toISOString().split('T')[0];

  // Calculate DTE if expiry is set
  let dte: number | null = null;
  if (leg?.expiry) {
    const expiryDate = new Date(leg.expiry);
    const today = new Date();
    dte = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (dte < 0) dte = 0;
  }

  return {
    ticker: ticker,
    type,
    strike: leg?.strike ?? 0,
    qty: trade.quantity,
    delta: 0, // Would need to be calculated or provided
    iv: null, // Would need to be calculated or provided
    opened: openedDate,
    expiry: leg?.expiry ?? '',
    dte,
    premium: trade.entryPrice ?? null,
    exit: null, // Set when closing trade
    fee: null,  // Not tracked currently
    pnl: trade.realizedPL ?? null,
    roi: null, // Would need to be calculated
    status: trade.status === 'open' ? 'OPEN' : 'CLOSED',
    notes: trade.notes ?? '',
  };
}

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
 * Create a new trade and persist to Google Sheets
 */
export async function createTrade(input: CreateTradeInput): Promise<Trade> {
  const spreadsheetId = getSpreadsheetId();
  const sheetTrade = tradeToSheetTrade(input, input.ticker);

  const id = await sheets.addTrade(spreadsheetId, input.ticker, sheetTrade);

  const trade: Trade = {
    ...input,
    id,
    createdAt: now(),
    updatedAt: now(),
  };

  return trade;
}

/**
 * Get a trade by ID
 */
export async function getTrade(id: string): Promise<Trade | undefined> {
  const spreadsheetId = getSpreadsheetId();
  const allTrades = await sheets.getAllTrades(spreadsheetId);

  for (const [ticker, trades] of allTrades) {
    const found = trades.find(t => t.id === id);
    if (found) {
      return sheetTradeToTrade(found, ticker);
    }
  }

  return undefined;
}

/**
 * Get all trades from all ticker tabs
 */
export async function getAllTrades(): Promise<Trade[]> {
  const spreadsheetId = getSpreadsheetId();
  const allTrades = await sheets.getAllTrades(spreadsheetId);

  const trades: Trade[] = [];
  for (const [ticker, sheetTrades] of allTrades) {
    for (const sheetTrade of sheetTrades) {
      trades.push(sheetTradeToTrade(sheetTrade, ticker));
    }
  }

  // Sort by date descending
  trades.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return trades;
}

/**
 * Get all open trades
 */
export async function getOpenTrades(): Promise<Trade[]> {
  const all = await getAllTrades();
  return all.filter(t => t.status === 'open');
}

/**
 * Get all closed trades
 */
export async function getClosedTrades(): Promise<Trade[]> {
  const all = await getAllTrades();
  return all.filter(t => t.status === 'closed');
}

/**
 * Update a trade
 */
export async function updateTrade(id: string, updates: UpdateTradeInput): Promise<void> {
  const spreadsheetId = getSpreadsheetId();
  const existing = await getTrade(id);

  if (!existing) {
    throw new Error(`Trade ${id} not found`);
  }

  const updated: Trade = {
    ...existing,
    ...updates,
    updatedAt: now(),
  };

  const sheetTrade: sheets.SheetTrade = {
    id,
    ...tradeToSheetTrade(updated, existing.ticker),
  };

  await sheets.updateTrade(spreadsheetId, existing.ticker, sheetTrade);
}

/**
 * Delete a trade
 */
export async function deleteTrade(id: string): Promise<void> {
  // For now, we'll mark the trade as deleted by clearing its data
  // A full implementation would remove the row from the sheet
  const spreadsheetId = getSpreadsheetId();
  const existing = await getTrade(id);

  if (!existing) {
    throw new Error(`Trade ${id} not found`);
  }

  // Extract row number from ID (format: "TICKER-rowNum")
  const rowMatch = id.match(/-(\d+)$/);
  if (rowMatch) {
    const actualRow = parseInt(rowMatch[1]);
    // Clear the row to mark as deleted
    await sheets.writeRange(spreadsheetId, `${existing.ticker}!A${actualRow}:L${actualRow}`, [
      ['', '', '', '', '', '', '', '', '', '', '', ''],
    ]);
  }
}

/**
 * Close a trade with realized P/L
 */
export async function closeTrade(id: string, exitPrice: number, realizedPL: number): Promise<void> {
  const spreadsheetId = getSpreadsheetId();
  const existing = await getTrade(id);

  if (!existing) {
    throw new Error(`Trade ${id} not found`);
  }

  await sheets.closeTrade(spreadsheetId, existing.ticker, id, realizedPL);
}

/**
 * Get trades filtered by ticker (case-insensitive substring match)
 */
export async function getTradesByTicker(ticker: string): Promise<Trade[]> {
  const allTrades = await getAllTrades();
  const normalizedTicker = ticker.toLowerCase();
  return allTrades.filter((t) => t.ticker.toLowerCase().includes(normalizedTicker));
}

/**
 * Clear all trades (not implemented for Google Sheets)
 */
export async function clearAllTrades(): Promise<void> {
  console.warn('clearAllTrades is not implemented for Google Sheets backend');
}
