// Google Sheets API Service
// Uses the user's OAuth token to read/write their spreadsheet

import { getAuthState, extractSpreadsheetId } from './auth';

const SHEETS_API_BASE = 'https://sheets.googleapis.com/v4/spreadsheets';

// Sheet tab names
export const SUMMARY_TAB = 'Summary';

// Actual Trade Log columns from user's sheet:
// A: Ticker, B: Type, C: Strike, D: Qty, E: Delta, F: Opened,
// G: Expiry, H: DTE, I: Premium ($), J: Exit, K: Fee, L: P/L, M: ROI, N: Status, O: Helper

export interface SheetTrade {
  id: string;           // Generated from row index
  ticker: string;       // Column A
  type: string;         // Column B (CSP, CC, Put, Call, LONG CALL, BULL PUT, etc.)
  strike: number;       // Column C
  qty: number;          // Column D
  delta: number;        // Column E
  opened: string;       // Column F (date opened)
  expiry: string;       // Column G
  dte: number | null;   // Column H (days to expiry)
  premium: number | null; // Column I (Premium $)
  exit: number | null;  // Column J (Exit price)
  fee: number | null;   // Column K (Fee)
  pnl: number | null;   // Column L (P/L)
  roi: number | null;   // Column M (ROI %)
  status: string;       // Column N (Open/Closed)
  notes: string;        // Column O (Helper/Notes)
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

  // Read columns A through O to include Status column
  const rows = await readRange(spreadsheetId, `${ticker}!A2:O1000`);

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
      opened: row[5] || '',          // Column F: Opened (date)
      expiry: row[6] || '',          // Column G: Expiry
      dte: row[7] ? parseInt(row[7]) : null,  // Column H: DTE
      premium: row[8] ? parseFloat(row[8]) : null, // Column I: Premium ($)
      exit: row[9] ? parseFloat(row[9]) : null,    // Column J: Exit
      fee: row[10] ? parseFloat(row[10]) : null,   // Column K: Fee
      pnl: row[11] ? parseFloat(row[11]) : null,   // Column L: P/L
      roi: row[12] ? parseFloat(row[12].toString().replace('%', '')) : null, // Column M: ROI %
      status: row[13] || 'Open',     // Column N: Status
      notes: row[14] || '',          // Column O: Helper/Notes
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
    // Add headers matching user's existing format
    await writeRange(spreadsheetId, `${ticker}!A1:O1`, [[
      'Ticker', 'Type', 'Strike', 'Qty', 'Delta', 'Opened',
      'Expiry', 'DTE', 'Premium ($)', 'Exit', 'Fee', 'P/L', 'ROI', 'Status', 'Helper'
    ]]);
  }

  // Generate unique ID based on row count
  const existingRows = await readRange(spreadsheetId, `${ticker}!A2:A1000`);
  const rowNum = existingRows.filter(r => r[0]).length + 2;
  const id = `${ticker}-${rowNum}`;

  // Append trade row (columns A-O)
  await appendRow(spreadsheetId, ticker, [
    trade.ticker,      // A: Ticker
    trade.type,        // B: Type
    trade.strike,      // C: Strike
    trade.qty,         // D: Qty
    trade.delta,       // E: Delta
    trade.opened,      // F: Opened
    trade.expiry,      // G: Expiry
    trade.dte ?? '',   // H: DTE
    trade.premium ?? '', // I: Premium ($)
    trade.exit ?? '',  // J: Exit
    trade.fee ?? '',   // K: Fee
    trade.pnl ?? '',   // L: P/L
    trade.roi ?? '',   // M: ROI
    trade.status,      // N: Status
    trade.notes,       // O: Helper/Notes
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

  await writeRange(spreadsheetId, `${ticker}!A${actualRow}:O${actualRow}`, [
    [
      trade.ticker,      // A: Ticker
      trade.type,        // B: Type
      trade.strike,      // C: Strike
      trade.qty,         // D: Qty
      trade.delta,       // E: Delta
      trade.opened,      // F: Opened
      trade.expiry,      // G: Expiry
      trade.dte ?? '',   // H: DTE
      trade.premium ?? '', // I: Premium ($)
      trade.exit ?? '',  // J: Exit
      trade.fee ?? '',   // K: Fee
      trade.pnl ?? '',   // L: P/L
      trade.roi ?? '',   // M: ROI
      trade.status,      // N: Status
      trade.notes,       // O: Helper/Notes
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
