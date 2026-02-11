// Market Data Service - Fetches stock prices and options data from Yahoo Finance

interface StockQuote {
  symbol: string;
  price: number;
  previousClose: number;
  change: number;
  changePercent: number;
  timestamp: number;
}

interface OptionsChainData {
  expirationDates: number[];
  strikes: number[];
  calls: OptionContract[];
  puts: OptionContract[];
}

interface OptionContract {
  strike: number;
  expiration: string;
  lastPrice: number;
  bid: number;
  ask: number;
  impliedVolatility: number;
  volume: number;
  openInterest: number;
}

// Cache for stock quotes (5 minute TTL)
const quoteCache = new Map<string, { data: StockQuote; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Yahoo Finance API via public endpoint
const YAHOO_QUOTE_URL = 'https://query1.finance.yahoo.com/v8/finance/chart';
const YAHOO_OPTIONS_URL = 'https://query1.finance.yahoo.com/v7/finance/options';

/**
 * Fetch current stock price from Yahoo Finance
 */
export async function getStockPrice(symbol: string): Promise<StockQuote> {
  const upperSymbol = symbol.toUpperCase();

  // Check cache first
  const cached = quoteCache.get(upperSymbol);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  try {
    // Try direct Yahoo Finance API
    const response = await fetch(
      `${YAHOO_QUOTE_URL}/${upperSymbol}?interval=1d&range=1d`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Yahoo Finance API error: ${response.status}`);
    }

    const data = await response.json();
    const result = data.chart?.result?.[0];

    if (!result) {
      throw new Error(`No data found for ${upperSymbol}`);
    }

    const meta = result.meta;
    const quote: StockQuote = {
      symbol: upperSymbol,
      price: meta.regularMarketPrice,
      previousClose: meta.previousClose || meta.chartPreviousClose,
      change: meta.regularMarketPrice - (meta.previousClose || meta.chartPreviousClose),
      changePercent: ((meta.regularMarketPrice - (meta.previousClose || meta.chartPreviousClose)) / (meta.previousClose || meta.chartPreviousClose)) * 100,
      timestamp: Date.now(),
    };

    // Cache the result
    quoteCache.set(upperSymbol, { data: quote, timestamp: Date.now() });

    return quote;
  } catch (error) {
    // If direct API fails, try CORS proxy
    return getStockPriceViaProxy(upperSymbol);
  }
}

/**
 * Fallback: Fetch stock price via CORS proxy
 */
async function getStockPriceViaProxy(symbol: string): Promise<StockQuote> {
  const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(`${YAHOO_QUOTE_URL}/${symbol}?interval=1d&range=1d`)}`;

  const response = await fetch(proxyUrl);

  if (!response.ok) {
    throw new Error(`Failed to fetch stock price for ${symbol}`);
  }

  const data = await response.json();
  const result = data.chart?.result?.[0];

  if (!result) {
    throw new Error(`No data found for ${symbol}`);
  }

  const meta = result.meta;
  const quote: StockQuote = {
    symbol: symbol,
    price: meta.regularMarketPrice,
    previousClose: meta.previousClose || meta.chartPreviousClose,
    change: meta.regularMarketPrice - (meta.previousClose || meta.chartPreviousClose),
    changePercent: ((meta.regularMarketPrice - (meta.previousClose || meta.chartPreviousClose)) / (meta.previousClose || meta.chartPreviousClose)) * 100,
    timestamp: Date.now(),
  };

  quoteCache.set(symbol, { data: quote, timestamp: Date.now() });

  return quote;
}

/**
 * Fetch options chain data for a symbol
 */
export async function getOptionsChain(symbol: string, expirationDate?: string): Promise<OptionsChainData | null> {
  const upperSymbol = symbol.toUpperCase();

  try {
    let url = `${YAHOO_OPTIONS_URL}/${upperSymbol}`;
    if (expirationDate) {
      // Convert date string to Unix timestamp
      const expTimestamp = Math.floor(new Date(expirationDate).getTime() / 1000);
      url += `?date=${expTimestamp}`;
    }

    // Try via CORS proxy since options endpoint often has CORS issues
    const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
    const response = await fetch(proxyUrl);

    if (!response.ok) {
      console.warn(`Options chain fetch failed for ${upperSymbol}`);
      return null;
    }

    const data = await response.json();
    const result = data.optionChain?.result?.[0];

    if (!result) {
      return null;
    }

    const options = result.options?.[0];
    if (!options) {
      return null;
    }

    return {
      expirationDates: result.expirationDates || [],
      strikes: result.strikes || [],
      calls: (options.calls || []).map((c: any) => ({
        strike: c.strike,
        expiration: new Date(c.expiration * 1000).toISOString().split('T')[0],
        lastPrice: c.lastPrice || 0,
        bid: c.bid || 0,
        ask: c.ask || 0,
        impliedVolatility: c.impliedVolatility || 0,
        volume: c.volume || 0,
        openInterest: c.openInterest || 0,
      })),
      puts: (options.puts || []).map((p: any) => ({
        strike: p.strike,
        expiration: new Date(p.expiration * 1000).toISOString().split('T')[0],
        lastPrice: p.lastPrice || 0,
        bid: p.bid || 0,
        ask: p.ask || 0,
        impliedVolatility: p.impliedVolatility || 0,
        volume: p.volume || 0,
        openInterest: p.openInterest || 0,
      })),
    };
  } catch (error) {
    console.error(`Failed to fetch options chain for ${symbol}:`, error);
    return null;
  }
}

/**
 * Get implied volatility for a specific option
 */
export async function getImpliedVolatility(
  symbol: string,
  strike: number,
  expiration: string,
  optionType: 'call' | 'put'
): Promise<number | null> {
  const chain = await getOptionsChain(symbol, expiration);

  if (!chain) {
    return null;
  }

  const options = optionType === 'call' ? chain.calls : chain.puts;
  const option = options.find(o => Math.abs(o.strike - strike) < 0.5);

  if (option && option.impliedVolatility > 0) {
    return option.impliedVolatility;
  }

  // If exact strike not found, interpolate from nearby strikes
  const sortedByStrike = options.sort((a, b) => Math.abs(a.strike - strike) - Math.abs(b.strike - strike));
  if (sortedByStrike.length > 0 && sortedByStrike[0].impliedVolatility > 0) {
    return sortedByStrike[0].impliedVolatility;
  }

  return null;
}

/**
 * Get multiple stock prices at once
 */
export async function getMultipleStockPrices(symbols: string[]): Promise<Map<string, StockQuote>> {
  const results = new Map<string, StockQuote>();

  // Fetch in parallel with some concurrency limit
  const batchSize = 5;
  for (let i = 0; i < symbols.length; i += batchSize) {
    const batch = symbols.slice(i, i + batchSize);
    const promises = batch.map(async (symbol) => {
      try {
        const quote = await getStockPrice(symbol);
        results.set(symbol.toUpperCase(), quote);
      } catch (error) {
        console.warn(`Failed to fetch price for ${symbol}:`, error);
      }
    });
    await Promise.all(promises);
  }

  return results;
}

/**
 * Clear the quote cache
 */
export function clearQuoteCache(): void {
  quoteCache.clear();
}
