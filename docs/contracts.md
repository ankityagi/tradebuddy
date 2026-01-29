# TradeBuddy Contracts and Parser Examples

## Overview

This doc captures concrete examples for the paste-to-parse feature and the minimal API contracts. It also outlines the parsing heuristics/regex used to extract fields from broker confirmations.

## Parser Inputs → Parsed JSON

### Example A — Expired notice

Input

```
EXPIRED PUT (IREN) IREN LIMITED COM NPVJAN 16 26 $45 as of Jan-16-2026
```

Parsed

```json
{
  "action": "expired",
  "ticker": "IREN",
  "type": "put",
  "expiry": "2026-01-16",
  "strike": 45,
  "contracts": 1,
  "contractSize": 100,
  "amount": null,
  "account": null,
  "date": "2026-01-16",
  "notes": "EXPIRED notice"
}
```

### Example B — Full line with margin and size

Input

```
PUT (IREN) IREN LIMITED COM NPV JAN 16 26 $45 (100 SHS) (Margin)
```

Parsed

```json
{
  "action": null,
  "ticker": "IREN",
  "type": "put",
  "expiry": "2026-01-16",
  "strike": 45,
  "contracts": 1,
  "contractSize": 100,
  "amount": null,
  "account": null,
  "date": null,
  "margin": true
}
```

### Example C — Processing block with amount and metadata

Input

```
Processing
Date
Jan-20-2026
Symbol
-IREN260116P45
Symbol description
PUT (IREN) IREN LIMITED COM NPV JAN 16 26 $45 (100 SHS)
Type
Margin
Contracts
+2.000
YOU SOLD OPENING TRANSACTION PUT (IREN) IREN LIMITED COM NPVJAN 09 26 $43 (100 SHS) (Margin)
+$107.33
$10,590.38
```

Parsed

```json
{
  "action": "sell",
  "openClose": "open",
  "type": "put",
  "ticker": "IREN",
  "expiry": "2026-01-16",
  "strike": 45,
  "contracts": 2,
  "contractSize": 100,
  "amount": 107.33,
  "amountSign": "+",
  "account": null,
  "date": "2026-01-20",
  "symbol": "-IREN260116P45",
  "margin": true
}
```

Notes

- If both a symbol and a description exist, symbol drives expiry/strike, description confirms type and size.
- If multiple lines contain trades, the parser returns an array of entries.

### Example D — Detailed ticket with price/fees

Input

```
Date
Jan-05-2026
Symbol
-IREN260109P43
Symbol description
PUT (IREN) IREN LIMITED COM NPVJAN 09 26 $43 (100 SHS)
Type
Margin
Contracts
-1.000
Price
$1.08
Commission
$0.65
Fees
$0.02
Amount
$107.33
Settlement date
Jan-06-2026
```

Parsed

```json
{
  "action": "sell",
  "openClose": "open",
  "type": "put",
  "ticker": "IREN",
  "expiry": "2026-01-09",
  "strike": 43,
  "contracts": 1,
  "contractSize": 100,
  "price": 1.08,
  "commission": 0.65,
  "fees": 0.02,
  "amount": 107.33,
  "amountSign": "+",
  "date": "2026-01-05",
  "settlementDate": "2026-01-06",
  "symbol": "-IREN260109P43",
  "margin": true
}
```

## Parsing Heuristics and Regex

- Dates
  - Formats: `Jan-12-2026`, `Jan 12 26`, `as of Jan-16-2026`.
  - Regex: `/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[ -]?\d{1,2}[ -]?(\d{2}|\d{4})\b/i`
  - Normalize: 2-digit years → 2000 + yy; month names map to 01–12; output ISO `YYYY-MM-DD`.

- Symbol code
  - Pattern like `-IREN260116P45` or `+IREN260116C045`.
  - Regex: `/[+-]?([A-Z]{1,6})(\d{2})(\d{2})(\d{2})([CP])(\d{2,4})/`
  - Groups: ticker, YY, MM, DD, type, strike (e.g., 45 or 0045 → 45).

- Description line
  - Pattern: `PUT (IREN) ... JAN 16 26 $45 (100 SHS)`.
  - Ticker: `/\(([A-Z]{1,6})\)/`
  - Type: `/\bPUT\b|\bCALL\b/i`
  - Expiry: `/\b(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\s+\d{1,2}\s+\d{2}\b/i` → map to ISO date with 20YY.
  - Strike: `/\$(\d+(?:\.\d{1,2})?)/`
  - Contract size: `/\((\d+)\s*SHS\)/i`
  - Margin: `/\(Margin\)/i`

- Action and open/close
  - Look for verbs: `YOU (BOUGHT|SOLD) (OPENING|CLOSING) TRANSACTION`.
  - Action: `bought` → buy, `sold` → sell.
  - Open/close: opening/closing.

- Contracts quantity
  - From explicit numeric lines like `Contracts\n+2.000` → sign indicates buy/sell direction; magnitude is absolute count.
  - From action lines: default to 1 if not specified.

- Amounts
  - Cash: `/([+-])\$\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/`
  - Price: `/\$\s*(\d+(?:\.\d{1,4})?)/` on a `Price` line.
  - Commission/Fees: Same price regex on respective labeled lines.

- Idempotency and duplicates
  - Collapse repeated identical blocks by hashing normalized text (strip whitespace, punctuation variance).
  - If multiple symbol lines map to the same key (ticker+expiry+strike+type+action+date), merge numeric fields where appropriate or create separate legs.

## API Contracts (Optional Stubs)

- POST `/api/assess`
  - Request: `{ trade: Trade }`
  - Response: `{ assessment: string, factors: Record<string, number> }`

- GET `/api/market/:ticker`
  - Response: `{ ticker: string, price: number, iv?: number }`

## Notes

- Parser returns a normalized object and, when multiple entries are found, an array of such objects.
- Tolerate whitespace/newlines and missing fields; unknowns remain `null` or omitted.
- Record `source.kind = "paste"` with `source.raw` and `source.parsed` for traceability.
