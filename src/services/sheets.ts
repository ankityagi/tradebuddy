// Google Sheets API Service
// Uses the user's OAuth token to read/write their spreadsheet

import { getAuthState, extractSpreadsheetId } from './auth';

const SHEETS_API_BASE = 'https://sheets.googleapis.com/v4/spreadsheets';

// Sheet tab names
export const SUMMARY_TAB = 'Summary';
export const TEMPLATE_TAB = 'Template';

// Actual Trade Log columns from user's sheet:
// A: Ticker, B: Type, C: Strike, D: Qty, E: Delta, F: IV, G: Opened,
// H: Expiry, I: DTE, J: Premium ($), K: Exit, L: Fee, M: P/L, N: ROI, O: Status, P: Helper

export interface SheetTrade {
  id: string;           // Generated from row index
  ticker: string;       // Column A
  type: string;         // Column B (CSP, CC, Put, Call, LONG CALL, BULL PUT, etc.)
  strike: number;       // Column C
  qty: number;          // Column D
  delta: number;        // Column E
  iv: number | null;    // Column F (Implied Volatility)
  opened: string;       // Column G (date opened)
  expiry: string;       // Column H
  dte: number | null;   // Column I (days to expiry)
  premium: number | null; // Column J (Premium $)
  exit: number | null;  // Column K (Exit price)
  fee: number | null;   // Column L (Fee)
  pnl: number | null;   // Column M (P/L)
  roi: number | null;   // Column N (ROI %)
  status: string;       // Column O (Open/Closed)
  notes: string;        // Column P (Helper/Notes)
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

// Get sheet ID by tab name (needed for duplication)
async function getSheetId(spreadsheetId: string, tabName: string): Promise<number | null> {
  const info = await getSpreadsheetInfo(spreadsheetId);
  const sheet = info.sheets?.find((s: any) => s.properties.title === tabName);
  return sheet?.properties?.sheetId ?? null;
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

// Duplicate a sheet tab with a new name
async function duplicateSheet(
  spreadsheetId: string,
  sourceTabName: string,
  newTabName: string
): Promise<void> {
  const sourceSheetId = await getSheetId(spreadsheetId, sourceTabName);
  if (sourceSheetId === null) {
    throw new Error(`Source sheet "${sourceTabName}" not found`);
  }

  await sheetsRequest(`/${spreadsheetId}:batchUpdate`, {
    method: 'POST',
    body: JSON.stringify({
      requests: [
        {
          duplicateSheet: {
            sourceSheetId,
            newSheetName: newTabName,
          },
        },
      ],
    }),
  });
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

// Initialize a ticker tab by duplicating the Template sheet
export async function initializeTickerTab(
  spreadsheetId: string,
  ticker: string
): Promise<void> {
  const tabs = await getSheetTabs(spreadsheetId);

  if (tabs.includes(ticker)) {
    return; // Tab already exists
  }

  // Duplicate from Template if it exists, otherwise create manually
  if (tabs.includes(TEMPLATE_TAB)) {
    await duplicateSheet(spreadsheetId, TEMPLATE_TAB, ticker);
  } else {
    // Fallback: create tab manually (no formulas)
    await createTab(spreadsheetId, ticker);
    await writeRange(spreadsheetId, `${ticker}!A1:P1`, [[
      'Ticker', 'Type', 'Strike', 'Qty', 'Delta', 'IV', 'Opened',
      'Expiry', 'DTE', 'Premium ($)', 'Exit', 'Fee', 'P/L', 'ROI', 'Status', 'Notes'
    ]]);
  }
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

  // Read columns A through P to include all columns with IV
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
      ticker: row[0] || ticker,      // Column A: Ticker
      type: row[1] || 'CSP',         // Column B: Type
      strike: parseFloat(row[2]) || 0,  // Column C: Strike
      qty: parseInt(row[3]) || 1,    // Column D: Qty
      delta: parseFloat(row[4]) || 0,   // Column E: Delta
      iv: row[5] ? parseFloat(row[5].toString().replace('%', '')) : null, // Column F: IV
      opened: row[6] || '',          // Column G: Opened (date)
      expiry: row[7] || '',          // Column H: Expiry
      dte: row[8] ? parseInt(row[8]) : null,  // Column I: DTE
      premium: row[9] ? parseFloat(row[9]) : null, // Column J: Premium ($)
      exit: row[10] ? parseFloat(row[10]) : null,    // Column K: Exit
      fee: row[11] ? parseFloat(row[11]) : null,   // Column L: Fee
      pnl: row[12] ? parseFloat(row[12]) : null,   // Column M: P/L
      roi: row[13] ? parseFloat(row[13].toString().replace('%', '')) : null, // Column N: ROI %
      status: row[14] || 'Open',     // Column O: Status
      notes: row[15] || '',          // Column P: Helper/Notes
    }));
}

// Get all trades from all ticker tabs
export async function getAllTrades(spreadsheetId: string): Promise<Map<string, SheetTrade[]>> {
  const tabs = await getSheetTabs(spreadsheetId);
  const tickerTabs = tabs.filter(t => t !== SUMMARY_TAB && t !== TEMPLATE_TAB);

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
  // Ensure ticker tab exists (duplicates from Template if available)
  await initializeTickerTab(spreadsheetId, ticker);

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

// Update Delta column (E) for a specific trade
export async function updateTradeDelta(
  spreadsheetId: string,
  ticker: string,
  tradeId: string,
  delta: number
): Promise<void> {
  // ID format is "TICKER-rowNum", extract row number
  const rowMatch = tradeId.match(/-(\d+)$/);
  if (!rowMatch) {
    throw new Error(`Invalid trade ID format: ${tradeId}`);
  }
  const actualRow = parseInt(rowMatch[1]);

  // Update just the Delta column (E)
  await writeRange(spreadsheetId, `${ticker}!E${actualRow}`, [[delta]]);
}

// Batch update Delta values for multiple trades (legacy, use batchUpdateGreeks instead)
export async function batchUpdateDeltas(
  spreadsheetId: string,
  updates: Array<{ ticker: string; tradeId: string; delta: number; iv?: number }>
): Promise<void> {
  // Group by ticker for efficiency
  const byTicker = new Map<string, Array<{ row: number; delta: number; iv?: number }>>();

  for (const update of updates) {
    const rowMatch = update.tradeId.match(/-(\d+)$/);
    if (!rowMatch) continue;

    const row = parseInt(rowMatch[1]);
    const existing = byTicker.get(update.ticker) || [];
    existing.push({ row, delta: update.delta, iv: update.iv });
    byTicker.set(update.ticker, existing);
  }

  // Update each ticker's trades - Delta in E, IV in F
  for (const [ticker, greeks] of byTicker) {
    for (const { row, delta, iv } of greeks) {
      // Update Delta (column E) and IV (column F) together
      // Format IV as percentage string to prevent Google Sheets from interpreting as date
      const ivFormatted = iv !== undefined ? `${iv.toFixed(2)}%` : '';
      await writeRange(spreadsheetId, `${ticker}!E${row}:F${row}`, [[delta, ivFormatted]]);
    }
  }
}

// Batch update Greeks (Delta, IV, R/R) for multiple trades
export async function batchUpdateGreeks(
  spreadsheetId: string,
  updates: Array<{ ticker: string; tradeId: string; delta: number; iv: number; rr: number | null }>
): Promise<void> {
  // Group by ticker for efficiency
  const byTicker = new Map<string, Array<{ row: number; delta: number; iv: number; rr: number | null }>>();

  for (const update of updates) {
    const rowMatch = update.tradeId.match(/-(\d+)$/);
    if (!rowMatch) continue;

    const row = parseInt(rowMatch[1]);
    const existing = byTicker.get(update.ticker) || [];
    existing.push({ row, delta: update.delta, iv: update.iv, rr: update.rr });
    byTicker.set(update.ticker, existing);
  }

  // Update each ticker's trades
  for (const [ticker, greeks] of byTicker) {
    for (const { row, delta, iv, rr } of greeks) {
      // Format IV as percentage string to prevent Google Sheets from interpreting as date
      const ivFormatted = `${iv.toFixed(2)}%`;
      // Format R/R as percentage for ROI column (N)
      const rrFormatted = rr !== null ? `${(rr * 100).toFixed(2)}%` : '';

      // Update Delta (E), IV (F), and ROI/R/R (N)
      await writeRange(spreadsheetId, `${ticker}!E${row}:F${row}`, [[delta, ivFormatted]]);
      await writeRange(spreadsheetId, `${ticker}!N${row}`, [[rrFormatted]]);
    }
  }
}
