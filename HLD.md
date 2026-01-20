# TradeBuddy MVP — High Level Design (HLD)

## 1. Overview
A lightweight, offline-first app to create trades, compute risk metrics locally, persist to IndexedDB, and list/close trades. Backend stubs can be added later without breaking the local flow.

## 2. Architecture
- Frontend (MVP): React + Vite + TypeScript
  - State & Persistence: Dexie (IndexedDB)
  - Modules: UI (Form, Table, Paste Panel), Domain (risk utils, assessment, parser), Data (repository)
- Backend (Optional Stubs): Node + Express + TypeScript
  - Endpoints: `/api/assess`, `/api/market/:ticker`
- No external services required for MVP simple functionality.

## 3. Data Flow
- Create Trade
  - User enters trade → validate → compute metrics → generate assessment → persist to Dexie → update UI list
- Paste Confirmation
  - User pastes text → parser extracts fields (ticker, side, type, expiry, strike, qty, account, amount, date) → preview/edit → compute metrics → persist → update list
- Read Trades
  - On app load: Dexie query → list view renders
- Close Trade
  - User enters exit → compute realized P/L → update trade → persist → refresh list

## 4. Key Modules (Frontend)
- UI
  - `TradeForm`: inputs, validation, submission handler
  - `TradesTable`: list, filter, open/close controls
  - `PastePanel`: textarea for confirmation text, parsed preview, apply-to-form
- Domain
  - `risk.ts`: maxRisk, maxReward, RR, breakeven, POP estimate
  - `assessment.ts`: deterministic text based on metrics thresholds
  - `parser.ts`: text extractor for broker confirmations
- Data
  - `db.ts`: Dexie schema, migrations
  - `repo.ts`: CRUD helpers for trades

## 5. Contracts (Shared Shape)
- Trade: `id, ticker, strategy, legs[], entryPrice, quantity, status, metrics, assessment, createdAt, updatedAt, exitPrice?, closedAt?, realizedPL?`
- Outcome (derived when closed): `realizedPL, reason?, lesson?`

## 6. Assessment Logic (Deterministic)
- Inputs: RR, POP estimate, distance to breakeven
- Heuristics (example):
  - RR >= 1.5 and POP < 45% → “Risk-heavy; consider sizing down.”
  - 0.7 <= RR < 1.5 and 45% <= POP <= 60% → “Balanced; monitor breakeven distance.”
  - RR < 0.7 and POP > 60% → “Favorable risk reward.”
- Output: text + factors used (for transparency). Frontend-first, mirrored by backend stub later.

## 7. Persistence Design
- Dexie DB: `trades` table, primary key `id`, indexes `ticker`, `status`, `createdAt`.
- Versioned schema to enable future migrations.
- Repository abstracts Dexie to keep UI testable.

## 8. Feature Flags
- `useApiAssess` (default false): when true, call `/api/assess` else local assessment.
- `useMockMarket` (default true): use mocked price/IV in UI metrics display.
 - `enablePasteParser` (default true): enables paste-to-parse UI and parser module.

## 9. Testing Strategy
- Unit: risk utils, assessment logic (threshold cases), parser extraction (with provided example), repo CRUD with Dexie in-memory.
- Component: TradeForm render/submit, TradesTable render/filter.
- (Optional) Backend: contract tests for stubs.

## 10. Performance & UX
- Debounce heavy calculations on form changes (if needed).
- Virtualize table if rows > 200 (future enhancement).
- Keyboard navigation and minimal required fields.

## 11. Security & Privacy
- Local-only; no secrets stored. No PII.
- If backend is enabled later, avoid logging trade contents in production.

## 12. Risks & Mitigations
- Risk math inaccuracies → document formulas in `docs/risk-math.md`, add unit tests.
- Scope creep (OCR/LLM) → enforce feature flags and defer.
- IndexedDB schema changes → use Dexie versions and migrations.

## 13. Rollout Plan
- Phase 1: Local-only frontend (forms, metrics, Dexie, table, close flow).
 - Phase 2: Paste parser + UI panel; ensure acceptance case passes.
 - Phase 3: Backend stubs with parity assessment.
 - Phase 4: Tests hardening, docs, and polish.
