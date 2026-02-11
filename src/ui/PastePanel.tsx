import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { parseTradeText, ParsedTrade } from '../domain/parser';
import { createTrade } from '../data/repo';
import type { CreateTradeInput, Strategy, LegSide } from '../domain/types';

// Convert ParsedTrade to CreateTradeInput
function parsedToTradeInput(parsed: ParsedTrade): CreateTradeInput | null {
  if (!parsed.ticker || !parsed.type || parsed.strike === null) {
    return null;
  }

  // Determine side: sell if action is 'sell' or if contracts are negative (selling)
  const side: LegSide = parsed.action === 'sell' ? 'sell' : 'buy';

  // Determine strategy based on side and type
  let strategy: Strategy = 'singleOption';
  if (side === 'sell' && parsed.type === 'put') {
    strategy = 'singleOption'; // CSP - will show as CSP in sheet
  } else if (side === 'sell' && parsed.type === 'call') {
    strategy = 'coveredCall'; // CC
  }

  return {
    ticker: parsed.ticker,
    strategy,
    legs: [
      {
        type: parsed.type,
        side,
        strike: parsed.strike,
        expiry: parsed.expiry || undefined,
        quantity: parsed.contracts || 1,
      },
    ],
    entryPrice: parsed.price || 0,
    quantity: parsed.contracts || 1,
    status: 'open',
    metrics: {},
    notes: parsed.symbol || '',
    source: {
      kind: 'paste',
      raw: JSON.stringify(parsed),
      parsed: parsed as unknown as Record<string, string | number | null>,
    },
  };
}

export function PastePanel() {
  const navigate = useNavigate();
  const [text, setText] = useState('');
  const [parsed, setParsed] = useState<ParsedTrade[]>([]);
  const [hasError, setHasError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const onParse = () => {
    if (!text.trim()) {
      setHasError(true);
      setParsed([]);
      return;
    }
    setHasError(false);
    const res = parseTradeText(text);
    setParsed(res);
  };

  const onClear = () => {
    setText('');
    setParsed([]);
    setHasError(false);
    setSaveError(null);
  };

  const onSaveTrade = async (parsedTrade: ParsedTrade) => {
    const tradeInput = parsedToTradeInput(parsedTrade);
    if (!tradeInput) {
      setSaveError('Cannot save trade: missing required fields (ticker, type, or strike)');
      return;
    }

    setSaving(true);
    setSaveError(null);

    try {
      await createTrade(tradeInput);
      // Navigate to My Trades on success
      navigate('/');
    } catch (error) {
      console.error('Failed to save trade:', error);
      setSaveError(error instanceof Error ? error.message : 'Failed to save trade');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Paste Trade Confirmation</h2>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <p className="text-blue-800 text-sm">
          Copy and paste your broker trade confirmation text below. Supported formats include
          Schwab-style confirmations with option symbols, expiry dates, and transaction details.
        </p>
      </div>

      {/* Paste Input Card */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <label htmlFor="paste-input" className="block text-sm font-medium text-gray-700 mb-2">
          Broker Confirmation Text
        </label>
        <textarea
          id="paste-input"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setHasError(false);
          }}
          placeholder="Paste your broker confirmation text here...

Example:
Date
Jan-05-2026
Symbol
-IREN260109P43
Symbol description
PUT (IREN) IREN LIMITED COM NPV JAN 09 26 $43 (100 SHS)
Type
Margin
Contracts
-1.000
Price
$1.08
Commission
$0.65"
          rows={12}
          className={`w-full px-4 py-3 border rounded-lg font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
            hasError ? 'border-red-500 bg-red-50' : 'border-gray-300'
          }`}
        />
        {hasError && (
          <p className="mt-2 text-sm text-red-600">Please paste some text before parsing.</p>
        )}

        <div className="flex gap-3 mt-4">
          <button
            onClick={onParse}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            Parse
          </button>
          <button
            onClick={onClear}
            className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Parsed Results */}
      {parsed.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Parsed Results</h3>

          {saveError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
              <p className="text-red-700 text-sm">{saveError}</p>
            </div>
          )}

          {parsed.map((trade, index) => (
            <div key={index} className="bg-gray-50 rounded-lg p-4 mb-4 last:mb-0">
              <div className="flex justify-between items-start mb-3">
                <h4 className="font-semibold text-gray-700">
                  {trade.ticker || 'Unknown'} - {trade.type?.toUpperCase() || 'Option'}
                </h4>
                <button
                  onClick={() => onSaveTrade(trade)}
                  disabled={saving || !trade.ticker || !trade.type || trade.strike === null}
                  className="bg-green-600 text-white px-4 py-1.5 rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Saving...' : 'Add Trade'}
                </button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {trade.ticker && (
                  <div>
                    <span className="text-xs text-gray-500 uppercase">Ticker</span>
                    <p className="font-semibold text-gray-800">{trade.ticker}</p>
                  </div>
                )}
                {trade.type && (
                  <div>
                    <span className="text-xs text-gray-500 uppercase">Type</span>
                    <p className="font-semibold text-gray-800 capitalize">{trade.type}</p>
                  </div>
                )}
                {trade.action && (
                  <div>
                    <span className="text-xs text-gray-500 uppercase">Action</span>
                    <p className="font-semibold text-gray-800 capitalize">{trade.action}</p>
                  </div>
                )}
                {trade.strike !== null && (
                  <div>
                    <span className="text-xs text-gray-500 uppercase">Strike</span>
                    <p className="font-semibold text-gray-800">${trade.strike}</p>
                  </div>
                )}
                {trade.expiry && (
                  <div>
                    <span className="text-xs text-gray-500 uppercase">Expiry</span>
                    <p className="font-semibold text-gray-800">{trade.expiry}</p>
                  </div>
                )}
                {trade.contracts !== null && (
                  <div>
                    <span className="text-xs text-gray-500 uppercase">Contracts</span>
                    <p className="font-semibold text-gray-800">{trade.contracts}</p>
                  </div>
                )}
                {trade.price !== null && (
                  <div>
                    <span className="text-xs text-gray-500 uppercase">Price</span>
                    <p className="font-semibold text-gray-800">${trade.price.toFixed(2)}</p>
                  </div>
                )}
                {trade.amount !== null && (
                  <div>
                    <span className="text-xs text-gray-500 uppercase">Amount</span>
                    <p
                      className={`font-semibold ${trade.amountSign === '+' ? 'text-green-600' : 'text-red-600'}`}
                    >
                      {trade.amountSign}${trade.amount.toFixed(2)}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Raw JSON (collapsible) */}
          <details className="mt-4">
            <summary className="text-sm text-gray-500 cursor-pointer hover:text-gray-700">
              View raw JSON
            </summary>
            <pre className="mt-2 bg-gray-800 text-gray-100 p-4 rounded-lg text-xs overflow-x-auto">
              {JSON.stringify(parsed, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
}
