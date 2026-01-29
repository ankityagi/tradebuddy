# TradeBuddy MVP — Tasks

## Milestone 1 — Local-Only MVP

- Scaffold frontend (Vite React TS), add lint/test scripts.
- Add Dexie setup (`db.ts`) and repo (`repo.ts`).
- Define TS types for Trade and Legs.
- Implement risk utils (`risk.ts`): maxRisk, maxReward, RR, breakeven, POP estimate.
- Implement assessment logic (`assessment.ts`): deterministic thresholds.
- Build `TradeForm` with validation and submit to repo.
- Build `TradesTable` with filters and computed columns.
- Add close-trade flow (exitPrice → realized P/L).
- Basic tests: risk utils, assessment, form submit, table render.
- Update README Quick Start for frontend.

## Milestone 2 — Paste Parser & UI

- Implement parser module (`parser.ts`) to extract: date, account descriptor, side (buy/sell), open/close, type (call/put/stock), ticker, expiry, strike, contract size, amount.
- Add `PastePanel` UI with textarea, parse button, parsed preview, and "apply to form" action.
- Support idempotent parsing (handle duplicate lines/blocks gracefully).
- Unit tests: parser against provided example and a few variants (extra whitespace, repeated blocks, missing amount).
- Acceptance test: pasting the example auto-fills TradeForm fields correctly.

## Milestone 3 — Backend Stubs (Optional)

- Scaffold backend (Express TS) with `/health`.
- Implement stub `POST /api/assess` (mirror frontend logic).
- Implement stub `GET /api/market/:ticker` (mock price/IV).
- Add feature flag in frontend to toggle API usage.
- Contract tests for stubs.

## Milestone 4 — Hardening & Docs

- Increase test coverage (≥80% for changed code).
- Error states: Dexie failures, validation errors, empty states.
- Performance polish: memoization, optional table virtualization.
- Docs: `REQUIREMENTS.md`, `HLD.md`, `docs/contracts.md`, risk formulas note.
- CI: lint and test on push.

## Nice-to-Haves (Post-MVP)

- Import/export trades as JSON/CSV.
- Saved filters and basic charts (equity curve, win rate).
- Strategy presets for common option structures.
- Light/dark theme toggle.

## Tracking

- Tag issues by milestone and component: `ui`, `domain`, `data`, `backend`.
- Use checklists in PRs to confirm tests and docs updated.
