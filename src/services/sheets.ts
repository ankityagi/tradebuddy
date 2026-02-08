// Google Sheets API Service
// Uses the user's OAuth token to read/write their spreadsheet

import { getAuthState, extractSpreadsheetId } from './auth';

const SHEETS_API_BASE = 'https://sheets.googleapis.com/v4/spreadsheets';

// Sheet tab names
export const SUMMARY_TAB = 'Summary';

// Trade Log columns (with IV added after Delta):
// A: Ticker, B: Type, C: Strike, D: Qty, E: Delta, F: IV,
// G: Opened, H: Expiry, I: DTE, J: Premium ($), K: Exit, L: Fee, M: P/L, N: ROI, O: Status, P: Helper

export interface SheetTrade {
  id: string;           // Generated from row index
  ticker: string;       // Column A (index 0)
  type: string;         // Column B (index 1)
  strike: number;       // Column C (index 2)
  qty: number;          // Column D (index 3)
  delta: number;        // Column E (index 4)
  iv: number | null;    // Column F (index 5) - Implied Volatility
  opened: string;       // Column G (index 6)
  expiry: string;       // Column H (index 7)
  dte: number | null;   // Column I (index 8)
  premium: number | null; // Column J (index 9)
  exit: number | null;  // Column K (index 10)
  fee: number | null;   // Column L (index 11)
  pnl: number | null;   // Column M (index 12)
  roi: number | null;   // Column N (index 13)
  status: string;       // Column O (index 14)
  notes: string;        // Column P (index 15)
}

// Make authenticated request to Sheets API
async function sheetsRequest(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const { accessToken } = getAuthState();
  if (!accessToken) {
    throw new Error('Not authenticated. Please sign in with Google.');
  }

  const response = await fetch(`${SHEETS_API_BASE}${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || `Sheets API error: ${response.status}`);
  }

  return response;
}

// Get spreadsheet metadata (tabs, etc.)
export async function getSpreadsheetInfo(spreadsheetId: string) {
  const response = await sheetsRequest(`/${spreadsheetId}`);
  return response.json();
}

// Check if user has access to the spreadsheet
export async function validateSheetAccess(sheetUrl: string): Promise<boolean> {
  const spreadsheetId = extractSpreadsheetId(sheetUrl);
  if (!spreadsheetId) {
    throw new Error('Invalid Google Sheets URL');
  }

  try {
    await getSpreadsheetInfo(spreadsheetId);
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('403')) {
      throw new Error('You do not have access to this spreadsheet. Please check sharing settings.');
    }
    throw error;
  }
}

// Get all sheet tab names
export async function getSheetTabs(spreadsheetId: string): Promise<string[]> {
  const info = await getSpreadsheetInfo(spreadsheetId);
  return info.sheets?.map((s: any) => s.properties.title) || [];
}

// Create a new tab in the spreadsheet
export async function createTab(spreadsheetId: string, tabName: string): Promise<void> {
  await sheetsRequest(`/${spreadsheetId}:batchUpdate`, {
    method: 'POST',
    body: JSON.stringify({
      requests: [
        {
          addSheet: {
            properties: { title: tabName },
          },
        },
      ],
    }),
  });
}

// Get sheet ID by tab name
async function getSheetId(spreadsheetId: string, tabName: string): Promise<number | null> {
  const info = await getSpreadsheetInfo(spreadsheetId);
  const sheet = info.sheets?.find((s: any) => s.properties.title === tabName);
  return sheet?.properties?.sheetId ?? null;
}

// Column configuration for easy future additions
export interface ColumnConfig {
  name: string;           // Header name (e.g., "IV")
  insertAfterIndex: number; // 0-indexed position to insert after (e.g., 4 for after column E)
  checkIndex: number;     // Index to check if column already exists
}

// Generic function to insert a column into a specific tab
export async function insertColumn(
  spreadsheetId: string,
  tabName: string,
  config: ColumnConfig
): Promise<boolean> {
  const sheetId = await getSheetId(spreadsheetId, tabName);
  if (sheetId === null) {
    console.warn(`Sheet ${tabName} not found`);
    return false;
  }

  try {
    // Insert a new column at the specified position
    await sheetsRequest(`/${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      body: JSON.stringify({
        requests: [
          {
            insertDimension: {
              range: {
                sheetId: sheetId,
                dimension: 'COLUMNS',
                startIndex: config.insertAfterIndex + 1,
                endIndex: config.insertAfterIndex + 2,
              },
              inheritFromBefore: false,
            },
          },
        ],
      }),
    });

    // Update the header for the new column
    const columnLetter = String.fromCharCode(65 + config.insertAfterIndex + 1); // A=65
    await writeRange(spreadsheetId, `${tabName}!${columnLetter}1`, [[config.name]]);

    return true;
  } catch (error) {
    console.error(`Failed to insert ${config.name} column for ${tabName}:`, error);
    return false;
  }
}

// Generic function to insert a column for all ticker tabs
export async function insertColumnForAllTabs(
  spreadsheetId: string,
  config: ColumnConfig
): Promise<number> {
  const tabs = await getSheetTabs(spreadsheetId);
  const tickerTabs = tabs.filter(t => t !== SUMMARY_TAB);

  let updatedCount = 0;
  for (const tab of tickerTabs) {
    // Check if column already exists by reading header
    const headers = await readRange(spreadsheetId, `${tab}!A1:Z1`);
    const headerRow = headers[0] || [];

    // If column at checkIndex already has the expected name, skip this tab
    if (headerRow[config.checkIndex]?.toString().toUpperCase() === config.name.toUpperCase()) {
      console.log(`Tab ${tab} already has ${config.name} column, skipping`);
      continue;
    }

    const success = await insertColumn(spreadsheetId, tab, config);
    if (success) {
      updatedCount++;
      console.log(`Inserted ${config.name} column for tab: ${tab}`);
    }
  }

  return updatedCount;
}

// Predefined column configurations for easy use
export const COLUMN_CONFIGS = {
  IV: {
    name: 'IV',
    insertAfterIndex: 4,  // After column E (Delta)
    checkIndex: 5,        // Check column F
  } as ColumnConfig,
  // Add more column configs here as needed:
  // GAMMA: { name: 'Gamma', insertAfterIndex: 5, checkIndex: 6 },
  // THETA: { name: 'Theta', insertAfterIndex: 6, checkIndex: 7 },
};

// Convenience function for IV column (backwards compatible)
export async function insertIVColumnForAllTabs(spreadsheetId: string): Promise<number> {
  return insertColumnForAllTabs(spreadsheetId, COLUMN_CONFIGS.IV);
}

// Read data from a specific range
export async function readRange(
  spreadsheetId: string,
  range: string
): Promise<string[][]> {
  const response = await sheetsRequest(
    `/${spreadsheetId}/values/${encodeURIComponent(range)}`
  );
  const data = await response.json();
  return data.values || [];
}

// Write data to a specific range
export async function writeRange(
  spreadsheetId: string,
  range: string,
  values: (string | number | null)[][]
): Promise<void> {
  await sheetsRequest(
    `/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      body: JSON.stringify({ values }),
    }
  );
}

// Append a row to a sheet
export async function appendRow(
  spreadsheetId: string,
  tabName: string,
  values: (string | number | null)[]
): Promise<void> {
  await sheetsRequest(
    `/${spreadsheetId}/values/${encodeURIComponent(tabName)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    {
      method: 'POST',
      body: JSON.stringify({ values: [values] }),
    }
  );
}

// Initialize a ticker tab with headers
export async function initializeTickerTab(
  spreadsheetId: string,
  ticker: string
): Promise<void> {
  const tabs = await getSheetTabs(spreadsheetId);

  if (!tabs.includes(ticker)) {
    await createTab(spreadsheetId, ticker);
  }

  // Add headers for Trade Log format
  await writeRange(spreadsheetId, `${ticker}!A1:L1`, [[
    'Ticker', 'Type', 'Strike', 'Qty', 'Delta', 'Opened',
    'Expiry', 'DTE', 'P/L', 'ROI', 'Status', 'Notes'
  ]]);
}

// Initialize Summary tab
export async function initializeSummaryTab(spreadsheetId: string): Promise<void> {
  const tabs = await getSheetTabs(spreadsheetId);

  if (!tabs.includes(SUMMARY_TAB)) {
    await createTab(spreadsheetId, SUMMARY_TAB);
  }

  // Add summary headers
  await writeRange(spreadsheetId, `${SUMMARY_TAB}!A1:E1`, [
    ['Ticker', 'Open Trades', 'Closed Trades', 'Total P/L', 'Win Rate'],
  ]);
}

// Get all trades for a ticker
export async function getTradesForTicker(
  spreadsheetId: string,
  ticker: string
): Promise<SheetTrade[]> {
  const tabs = await getSheetTabs(spreadsheetId);
  if (!tabs.includes(ticker)) {
    return [];
  }

  // Read columns A through P (includes IV column F and Status column O)
  const rows = await readRange(spreadsheetId, `${ticker}!A2:P1000`);

  return rows
    .filter(row => {
      // Filter out empty rows - require Ticker (col A) and Strike (col C) to have values
      const hasTicker = row[0] && row[0].toString().trim() !== '';
      const hasStrike = row[2] && row[2].toString().trim() !== '' && !isNaN(parseFloat(row[2]));
      return hasTicker && hasStrike;
    })
    .map((row, index) => ({
      id: `${ticker}-${index + 2}`,  // Generate ID from ticker and row number
      ticker: row[0] || ticker,      // Column A (index 0): Ticker
      type: row[1] || 'CSP',         // Column B (index 1): Type
      strike: parseFloat(row[2]) || 0,  // Column C (index 2): Strike
      qty: parseInt(row[3]) || 1,    // Column D (index 3): Qty
      delta: parseFloat(row[4]) || 0,   // Column E (index 4): Delta
      iv: row[5] ? parseFloat(row[5]) : null,  // Column F (index 5): IV
      opened: row[6] || '',          // Column G (index 6): Opened (date)
      expiry: row[7] || '',          // Column H (index 7): Expiry
      dte: row[8] ? parseInt(row[8]) : null,  // Column I (index 8): DTE
      premium: row[9] ? parseFloat(row[9]) : null, // Column J (index 9): Premium ($)
      exit: row[10] ? parseFloat(row[10]) : null,    // Column K (index 10): Exit
      fee: row[11] ? parseFloat(row[11]) : null,   // Column L (index 11): Fee
      pnl: row[12] ? parseFloat(row[12]) : null,   // Column M (index 12): P/L
      roi: row[13] ? parseFloat(row[13].toString().replace('%', '')) : null, // Column N (index 13): ROI %
      status: row[14] || 'Open',     // Column O (index 14): Status
      notes: row[15] || '',          // Column P (index 15): Helper/Notes
    }));
}

// Get all trades from all ticker tabs
export async function getAllTrades(spreadsheetId: string): Promise<Map<string, SheetTrade[]>> {
  const tabs = await getSheetTabs(spreadsheetId);
  const tickerTabs = tabs.filter(t => t !== SUMMARY_TAB);

  const allTrades = new Map<string, SheetTrade[]>();

  for (const ticker of tickerTabs) {
    const trades = await getTradesForTicker(spreadsheetId, ticker);
    if (trades.length > 0) {
      allTrades.set(ticker, trades);
    }
  }

  return allTrades;
}

// Add a new trade to a ticker tab
export async function addTrade(
  spreadsheetId: string,
  ticker: string,
  trade: Omit<SheetTrade, 'id'>
): Promise<string> {
  // Ensure ticker tab exists with proper headers
  const tabs = await getSheetTabs(spreadsheetId);
  if (!tabs.includes(ticker)) {
    await createTab(spreadsheetId, ticker);
    // Add headers with IV column after Delta
    await writeRange(spreadsheetId, `${ticker}!A1:P1`, [[
      'Ticker', 'Type', 'Strike', 'Qty', 'Delta', 'IV',
      'Opened', 'Expiry', 'DTE', 'Premium ($)', 'Exit', 'Fee', 'P/L', 'ROI', 'Status', 'Helper'
    ]]);
  }

  // Generate unique ID based on row count
  const existingRows = await readRange(spreadsheetId, `${ticker}!A2:A1000`);
  const rowNum = existingRows.filter(r => r[0]).length + 2;
  const id = `${ticker}-${rowNum}`;

  // Append trade row (columns A-P)
  await appendRow(spreadsheetId, ticker, [
    trade.ticker,      // A: Ticker
    trade.type,        // B: Type
    trade.strike,      // C: Strike
    trade.qty,         // D: Qty
    trade.delta,       // E: Delta
    trade.iv ?? '',    // F: IV
    trade.opened,      // G: Opened
    trade.expiry,      // H: Expiry
    trade.dte ?? '',   // I: DTE
    trade.premium ?? '', // J: Premium ($)
    trade.exit ?? '',  // K: Exit
    trade.fee ?? '',   // L: Fee
    trade.pnl ?? '',   // M: P/L
    trade.roi ?? '',   // N: ROI
    trade.status,      // O: Status
    trade.notes,       // P: Helper/Notes
  ]);

  return id;
}

// Update an existing trade (find by row number from ID and update the row)
export async function updateTrade(
  spreadsheetId: string,
  ticker: string,
  trade: SheetTrade
): Promise<void> {
  // ID format is "TICKER-rowNum", extract row number
  const rowMatch = trade.id.match(/-(\d+)$/);
  if (!rowMatch) {
    throw new Error(`Invalid trade ID format: ${trade.id}`);
  }
  const actualRow = parseInt(rowMatch[1]);

  await writeRange(spreadsheetId, `${ticker}!A${actualRow}:P${actualRow}`, [
    [
      trade.ticker,      // A: Ticker
      trade.type,        // B: Type
      trade.strike,      // C: Strike
      trade.qty,         // D: Qty
      trade.delta,       // E: Delta
      trade.iv ?? '',    // F: IV
      trade.opened,      // G: Opened
      trade.expiry,      // H: Expiry
      trade.dte ?? '',   // I: DTE
      trade.premium ?? '', // J: Premium ($)
      trade.exit ?? '',  // K: Exit
      trade.fee ?? '',   // L: Fee
      trade.pnl ?? '',   // M: P/L
      trade.roi ?? '',   // N: ROI
      trade.status,      // O: Status
      trade.notes,       // P: Helper/Notes
    ],
  ]);
}

// Close a trade (update Status and P/L columns)
export async function closeTrade(
  spreadsheetId: string,
  ticker: string,
  tradeId: string,
  pnl: number
): Promise<void> {
  const trades = await getTradesForTicker(spreadsheetId, ticker);
  const trade = trades.find(t => t.id === tradeId);

  if (!trade) {
    throw new Error(`Trade ${tradeId} not found`);
  }

  await updateTrade(spreadsheetId, ticker, {
    ...trade,
    status: 'CLOSED',
    pnl,
    dte: 0, // Expired
  });
}

// Update Delta (E) and IV (F) columns for a specific trade
export async function updateTradeGreeks(
  spreadsheetId: string,
  ticker: string,
  tradeId: string,
  delta: number,
  iv: number
): Promise<void> {
  // ID format is "TICKER-rowNum", extract row number
  const rowMatch = tradeId.match(/-(\d+)$/);
  if (!rowMatch) {
    throw new Error(`Invalid trade ID format: ${tradeId}`);
  }
  const actualRow = parseInt(rowMatch[1]);

  // Update Delta (E) and IV (F) columns together
  await writeRange(spreadsheetId, `${ticker}!E${actualRow}:F${actualRow}`, [[delta, iv]]);
}

// Batch update Delta and IV values for multiple trades
export async function batchUpdateDeltas(
  spreadsheetId: string,
  updates: Array<{ ticker: string; tradeId: string; delta: number; iv?: number }>
): Promise<void> {
  // Group by ticker for efficiency
  const byTicker = new Map<string, Array<{ row: number; delta: number; iv: number }>>();

  for (const update of updates) {
    const rowMatch = update.tradeId.match(/-(\d+)$/);
    if (!rowMatch) continue;

    const row = parseInt(rowMatch[1]);
    const existing = byTicker.get(update.ticker) || [];
    existing.push({ row, delta: update.delta, iv: update.iv ?? 0 });
    byTicker.set(update.ticker, existing);
  }

  // Update each ticker's trades - write both Delta (E) and IV (F)
  for (const [ticker, greeks] of byTicker) {
    for (const { row, delta, iv } of greeks) {
      await writeRange(spreadsheetId, `${ticker}!E${row}:F${row}`, [[delta, iv]]);
    }
  }
}
