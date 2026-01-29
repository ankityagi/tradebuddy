/**
 * TradeBuddy MVP - Dexie Database Setup
 *
 * This file configures IndexedDB using Dexie for local persistence.
 */

import Dexie, { type Table } from 'dexie';
import type { Trade } from '../domain/types';

/**
 * TradeBuddy database class
 */
export class TradeBuddyDB extends Dexie {
  trades!: Table<Trade, string>;

  constructor() {
    super('TradeBuddyDB');

    // Schema version 1
    this.version(1).stores({
      // Primary key: id
      // Indexes: ticker, status, createdAt
      trades: 'id, ticker, status, createdAt',
    });
  }
}

/**
 * Singleton database instance
 */
export const db = new TradeBuddyDB();
