# TradeBuddy MVP — Requirements

## 1. Scope (Simple Functionality)
- Input a trade via a form or by pasting trade confirmation text.
- Compute basic risk metrics locally.
- Persist trades locally (offline friendly).
- Show a list of trades with P/L columns.
- Provide a deterministic text assessment (no LLM).

## 2. User Stories
- As a user, I can create a trade with ticker, strategy, legs, entry, and quantity so I can track it.
- As a user, I see calculated metrics (max risk/reward, RR, breakeven, POP estimate) after entering a trade so I can gauge risk.
- As a user, my trades persist between sessions so I don’t lose data.
- As a user, I can view a table of my trades and sort/filter by status/ticker so I can review activity.
- As a user, I can close a trade by entering an exit price and see realized P/L so I can record outcomes.
- As a user, I get a simple, deterministic assessment text so I have quick guidance without network dependence.
- As a user, I can paste a broker confirmation snippet and the app parses ticker, side, type, expiry, strike, quantity, account, and amount so I don’t retype details.

## 3. Out of Scope (MVP)
- OCR/screenshot ingestion.
- Broker import/export.
- Real LLM assessments.
- Live market data; use mocked prices when needed.
- Server-side database and authentication.

## 4. Functional Requirements
- Trade Creation
  - Fields: ticker, strategy, legs[], entryPrice (debit/credit), quantity, notes.
  - Client-side validation (ticker required, numbers positive, legs consistent).
- Paste-to-Parse (Text Ingestion)
  - Accept raw text confirmations and extract: date, account descriptor, action (buy/sell, opening/closing), option type (call/put/stock), ticker, underlying name, expiry, strike, contract size, margin tag, and cash amount.
  - Handle repeated lines and minimal noise; idempotent parsing when same block is pasted twice.
  - Provide a preview with extracted fields and allow user edits before save.
  - Example input supported:
    - "Jan-12-2026\nIndividual - TOD ***7678\nYOU SOLD OPENING TRANSACTION PUT (IREN) IREN LIMITED COM NPV JAN 16 26 $45 (100 SHS) (Margin)\n+$218.65"
- Metrics Calculation
  - maxRisk, maxReward, riskReward (RR), breakeven for common verticals and covered calls.
  - POP estimate via normal CDF approximation; clearly labeled as estimate.
- Persistence
  - IndexedDB via Dexie; schema versioning for future migrations.
- Listing & Filtering
  - Table view with columns: ticker, strategy, entry, RR, POP, status, createdAt, unrealized/realized P/L.
  - Filters: by status (open/closed), by ticker substring.
- Assessment
  - Local, deterministic logic; inputs include RR, distance to breakeven, time to expiry (if available).
- Close Trade
  - Capture exitPrice and closedAt; compute realized P/L.

## 5. Non-Functional Requirements
- Reliability: No network required for core flow; gracefully degrade when APIs are unavailable.
- Performance: Instant calculations; table handles at least 500 trades smoothly in modern browsers.
- Usability: Minimal clicks to create a trade; keyboard-friendly form.
- Portability: Runs via `npm run dev` in the frontend without backend.
- Quality: Unit tests for risk utils and assessment logic; basic component render test.

## 6. Data Model (Minimal)
- Trade
  - id: string (uuid)
  - ticker: string
  - strategy: enum (e.g., "vertical", "coveredCall", "singleOption", "stock")
  - legs: array of { type: "call"|"put"|"stock", side: "buy"|"sell", strike?: number, expiry?: string, price?: number, quantity: number }
  - entryPrice: number (net debit/credit per contract or per share)
  - quantity: number (contracts or shares)
  - status: "open" | "closed"
  - metrics: { maxRisk?: number, maxReward?: number, rr?: number, breakeven?: number[], popEst?: number }
  - assessment?: string
  - createdAt: string (ISO)
  - updatedAt: string (ISO)
  - exitPrice?: number
  - closedAt?: string (ISO)
  - realizedPL?: number
  - source?: { kind: "manual" | "paste" | "api", raw?: string, parsed?: Record<string, string> }

## 7. API (Stubbed, Optional)
- POST `/api/assess`
  - req: { trade }
  - res: { assessment: string, factors: Record<string, number> }
- GET `/api/market/:ticker`
  - res: { ticker, price, iv } (mocked)

## 8. Acceptance Criteria
- User can create, view, and persist trades locally.
- User can paste the provided confirmation example and see fields auto-filled correctly: date=2026-01-12, account suffix=***7678, side=sell, opening=true, type=put, ticker=IREN, expiry=2026-01-16, strike=45, contractSize=100, amount=+218.65.
- Metrics compute immediately and display alongside trade details.
- Deterministic assessment appears without calling any external API.
- User can close a trade and see realized P/L.
- Basic tests pass for risk utils and assessment.
