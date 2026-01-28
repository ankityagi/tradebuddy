export type ParsedTrade = {
  action: 'buy' | 'sell' | 'expired' | null;
  openClose?: 'open' | 'close' | null;
  type: 'call' | 'put' | 'stock' | null;
  ticker: string | null;
  expiry: string | null; // ISO YYYY-MM-DD
  strike: number | null;
  contracts: number | null;
  contractSize?: number | null;
  amount?: number | null;
  amountSign?: '+' | '-' | null;
  price?: number | null;
  commission?: number | null;
  fees?: number | null;
  date?: string | null; // ISO
  settlementDate?: string | null; // ISO
  symbol?: string | null; // OCC-like code, e.g. -IREN260116P45
  margin?: boolean;
  account?: string | null;
};

const MONTHS = {
  JAN: 1, FEB: 2, MAR: 3, APR: 4, MAY: 5, JUN: 6,
  JUL: 7, AUG: 8, SEP: 9, OCT: 10, NOV: 11, DEC: 12,
} as const;

function pad2(n: number) { return n < 10 ? `0${n}` : String(n); }

function toISO(y: number, m: number, d: number): string {
  return `${y}-${pad2(m)}-${pad2(d)}`;
}

function parseMonthToken(tok: string): number | null {
  const key = tok.trim().slice(0,3).toUpperCase() as keyof typeof MONTHS;
  return MONTHS[key] ?? null;
}

function parseDateLike(s: string): string | null {
  // Matches: Jan-12-2026, Jan 12 26, as of Jan-16-2026
  const re = /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[ -]?(\d{1,2})[ -]?(\d{4}|\d{2})/i;
  const m = s.match(re);
  if (!m) return null;
  const month = parseMonthToken(m[1]);
  const day = parseInt(m[2], 10);
  let year = parseInt(m[3], 10);
  if (year < 100) year = 2000 + year;
  if (!month || !day || !year) return null;
  return toISO(year, month, day);
}

function parseSymbolCode(s: string) {
  // e.g. -IREN260116P45
  const re = /[+-]?([A-Z]{1,6})(\d{2})(\d{2})(\d{2})([CP])(\d{2,4})/;
  const m = s.match(re);
  if (!m) return null;
  const [, ticker, yy, mm, dd, cp, strikeRaw] = m;
  const year = 2000 + parseInt(yy, 10);
  const month = parseInt(mm, 10);
  const day = parseInt(dd, 10);
  const strike = parseInt(strikeRaw, 10);
  return {
    ticker,
    type: cp === 'C' ? 'call' as const : 'put' as const,
    expiry: toISO(year, month, day),
    strike,
  };
}

function parseDescriptionLine(s: string) {
  // PUT (IREN) ... JAN 16 26 $45 (100 SHS) (Margin)
  const tickerM = s.match(/\(([A-Z]{1,6})\)/);
  const typeM = s.match(/\b(PUT|CALL)\b/i);
  const expiryM = s.match(/(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\s+(\d{1,2})\s+(\d{2,4})\b/i);
  const strikeM = s.match(/\$(\d+(?:\.\d{1,2})?)/);
  const sizeM = s.match(/\((\d+)\s*SHS\)/i);
  const margin = /\(Margin\)/i.test(s);
  let expiry: string | null = null;
  if (expiryM) {
    const month = parseMonthToken(expiryM[1]);
    const day = parseInt(expiryM[2], 10);
    let year = parseInt(expiryM[3], 10);
    if (year < 100) year = 2000 + year;
    if (month && day && year) expiry = toISO(year, month, day);
  }
  return {
    ticker: tickerM ? tickerM[1] : null,
    type: typeM ? (typeM[1].toLowerCase() as 'put'|'call') : null,
    expiry,
    strike: strikeM ? parseFloat(strikeM[1]) : null,
    contractSize: sizeM ? parseInt(sizeM[1], 10) : null,
    margin,
  };
}

function parseActionOpenClose(s: string) {
  const m = s.match(/YOU\s+(BOUGHT|SOLD)\s+(OPENING|CLOSING)\s+TRANSACTION/i);
  if (!m) return { action: null, openClose: null } as const;
  const action = m[1].toLowerCase() === 'bought' ? 'buy' : 'sell';
  const openClose = m[2].toLowerCase() === 'opening' ? 'open' : 'close';
  return { action, openClose } as const;
}

function parseContracts(s: string): number | null {
  // Contracts line: +2.000 or -1.000
  const m = s.match(/Contracts\s*[\r\n]+([+-]?\d+(?:\.\d+)*)/i);
  if (m) return Math.abs(parseFloat(m[1]));
  return null;
}

function parseAmount(s: string) {
  // Try with sign first: +$107.33 or -$107.33
  const withSign = s.match(/([+-])\$\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/);
  if (withSign) {
    const sign = withSign[1] as '+' | '-';
    const num = parseFloat(withSign[2].replace(/,/g, ''));
    return { amount: num, amountSign: sign };
  }
  // Try Amount label: Amount\n$107.33
  const labeled = s.match(/Amount[\r\n]+\$?\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/i);
  if (labeled) {
    const num = parseFloat(labeled[1].replace(/,/g, ''));
    return { amount: num, amountSign: null as '+' | '-' | null };
  }
  return { amount: null, amountSign: null as '+' | '-' | null };
}

function parseNumberAfterLabel(s: string, label: string): number | null {
  const re = new RegExp(label + '[\\r\\n]+\\$?\\s*(\\d+(?:,\\d{3})*(?:\\.\\d{1,4})?)', 'i');
  const m = s.match(re);
  if (!m) return null;
  return parseFloat(m[1].replace(/,/g, ''));
}

export function parseTradeText(raw: string): ParsedTrade[] {
  const text = raw.replace(/\u00A0/g, ' ').trim();
  const blocks = [text]; // simple: treat all as one block for MVP; future: split by separators

  const results: ParsedTrade[] = [];
  for (const blk of blocks) {
    const symbolInfo = parseSymbolCode(blk) || undefined;
    const descInfo = parseDescriptionLine(blk);
    const { action, openClose } = parseActionOpenClose(blk);
    const contracts = parseContracts(blk) ?? null;
    const { amount, amountSign } = parseAmount(blk);
    const price = parseNumberAfterLabel(blk, 'Price');
    const commission = parseNumberAfterLabel(blk, 'Commission');
    const fees = parseNumberAfterLabel(blk, 'Fees');
    // Dates: prefer explicit Date line; else any date-like string; else expiry from symbol/desc
    const dateLine = (() => {
      const m = blk.match(/Date[\r\n]+(.+)/i);
      if (m) return parseDateLike(m[1]);
      const any = parseDateLike(blk);
      return any;
    })();

    // Expired hint
    const expired = /\bEXPIRED\b/i.test(blk);

    const parsed: ParsedTrade = {
      action: expired ? 'expired' : (action as any),
      openClose: expired ? null : (openClose as any),
      type: (symbolInfo?.type ?? descInfo.type) as any,
      ticker: (symbolInfo?.ticker ?? descInfo.ticker) ?? null,
      expiry: (symbolInfo?.expiry ?? descInfo.expiry) ?? null,
      strike: (symbolInfo?.strike ?? descInfo.strike) ?? null,
      contracts: contracts ?? (expired ? 1 : null),
      contractSize: descInfo.contractSize ?? 100,
      amount: amount ?? null,
      amountSign: amountSign ?? null,
      price: price ?? null,
      commission: commission ?? null,
      fees: fees ?? null,
      date: dateLine ?? (expired ? descInfo.expiry ?? symbolInfo?.expiry ?? null : null),
      settlementDate: parseNumberAfterLabel(blk, 'Settlement date') ? parseDateLike(blk) : null,
      symbol: symbolInfo ? (raw.match(/[+-]?[A-Z]{1,6}\d{6}[CP]\d{2,4}/)?.[0] ?? null) : null,
      margin: descInfo.margin || /\bType[\r\n]+Margin\b/i.test(blk) || /\(Margin\)/i.test(blk),
      account: (blk.match(/\b\*\*\*\d{3,4}\b/)?.[0] ?? null),
    };
    results.push(parsed);
  }
  return results;
}

