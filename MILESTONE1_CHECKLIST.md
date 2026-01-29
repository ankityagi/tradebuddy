# Milestone 1 — Local-Only MVP Checklist

## Status Overview

- **Started**: [Date to be filled]
- **Target Completion**: TBD
- **Current Phase**: Planning

---

## 1. Dependencies & Project Setup

### 1.1 Install Required Dependencies

- [ ] Install Dexie for IndexedDB (`dexie@^3.2.4`)
- [ ] Install Zod for validation (`zod@^3.22.4`)
- [ ] Install React Router for navigation (`react-router-dom@^6.21.1`, `@types/react-router-dom`)
- [ ] Install Tailwind CSS for styling (`tailwindcss@^3.4.0`, `postcss`, `autoprefixer`)
- [ ] Install Recharts for future charts (`recharts@^2.10.3`)
- [ ] Verify all scripts work after installation (`npm run dev`, `npm run test`, `npm run lint`)

### 1.2 Tailwind Configuration

- [ ] Initialize Tailwind config (`npx tailwindcss init -p`)
- [ ] Configure content paths in `tailwind.config.js`
- [ ] Add Tailwind directives to main CSS file
- [ ] Test Tailwind classes render correctly

---

## 2. Type Definitions

### 2.1 Core Types (`src/domain/types.ts`)

- [ ] Define `Leg` type (type, side, strike, expiry, price, quantity)
- [ ] Define `Strategy` enum (vertical, coveredCall, singleOption, stock)
- [ ] Define `Metrics` type (maxRisk, maxReward, rr, breakeven[], popEst)
- [ ] Define `Trade` type (id, ticker, strategy, legs[], entryPrice, quantity, status, metrics, assessment, timestamps, exit fields, source)
- [ ] Define `TradeStatus` enum (open, closed)
- [ ] Define `LegType` enum (call, put, stock)
- [ ] Define `LegSide` enum (buy, sell)
- [ ] Add JSDoc comments for all types

---

## 3. Data Layer

### 3.1 Dexie Setup (`src/data/db.ts`)

- [ ] Create Dexie database class
- [ ] Define schema version 1 with `trades` table
- [ ] Add indexes for: `ticker`, `status`, `createdAt`
- [ ] Export singleton database instance
- [ ] Test database initialization

### 3.2 Repository (`src/data/repo.ts`)

- [ ] Implement `createTrade(trade: Omit<Trade, 'id' | 'createdAt' | 'updatedAt'>): Promise<Trade>`
- [ ] Implement `getTrade(id: string): Promise<Trade | undefined>`
- [ ] Implement `getAllTrades(): Promise<Trade[]>`
- [ ] Implement `getOpenTrades(): Promise<Trade[]>`
- [ ] Implement `getClosedTrades(): Promise<Trade[]>`
- [ ] Implement `updateTrade(id: string, updates: Partial<Trade>): Promise<void>`
- [ ] Implement `deleteTrade(id: string): Promise<void>`
- [ ] Implement `closeTrade(id: string, exitPrice: number, closedAt: string, realizedPL: number): Promise<void>`
- [ ] Add error handling for all operations

---

## 4. Domain Logic

### 4.1 Risk Utils (`src/domain/risk.ts`)

- [ ] Implement `calculateMaxRisk(legs: Leg[], entryPrice: number, quantity: number): number`
- [ ] Implement `calculateMaxReward(legs: Leg[], entryPrice: number, quantity: number): number`
- [ ] Implement `calculateRiskReward(maxRisk: number, maxReward: number): number`
- [ ] Implement `calculateBreakeven(legs: Leg[], entryPrice: number): number[]`
- [ ] Implement `estimatePOP(breakeven: number[], currentPrice?: number, iv?: number): number` (using normal CDF)
- [ ] Implement `computeMetrics(trade: Pick<Trade, 'legs' | 'entryPrice' | 'quantity'>): Metrics`
- [ ] Add helper functions for common spreads (credit/debit spreads, iron condors)
- [ ] Add JSDoc with formulas and assumptions
- [ ] Mark POP as estimate in output

### 4.2 Assessment Logic (`src/domain/assessment.ts`)

- [ ] Implement `generateAssessment(metrics: Metrics): string`
- [ ] Add threshold logic:
  - RR >= 1.5 and POP < 45% → "Risk-heavy; consider sizing down."
  - 0.7 <= RR < 1.5 and 45% <= POP <= 60% → "Balanced; monitor breakeven distance."
  - RR < 0.7 and POP > 60% → "Favorable risk reward."
- [ ] Add edge case handling (undefined metrics, extreme values)
- [ ] Return structured assessment with factors used
- [ ] Add JSDoc explaining deterministic rules

---

## 5. UI Components

### 5.1 Layout & Routing (`src/App.tsx`)

- [ ] Create main App component
- [ ] Set up React Router with routes:
  - `/` → TradesTable (home/list view)
  - `/new` → TradeForm (create new trade)
  - `/edit/:id` → TradeForm (edit existing trade)
- [ ] Add navigation header/menu
- [ ] Style with Tailwind

### 5.2 TradeForm Component (`src/ui/TradeForm.tsx`)

- [ ] Create form with fields:
  - Ticker (text input, required)
  - Strategy (select dropdown)
  - Legs (dynamic array of leg inputs)
  - Entry Price (number input)
  - Quantity (number input)
  - Notes (textarea, optional)
- [ ] Add leg input controls (add/remove leg)
- [ ] Implement Zod validation schema
- [ ] Show validation errors inline
- [ ] Real-time metrics calculation and display
- [ ] Real-time assessment display
- [ ] Submit handler to save to repo
- [ ] Navigate to list after successful save
- [ ] Add loading state during save
- [ ] Style with Tailwind (form layout, buttons, inputs)

### 5.3 TradesTable Component (`src/ui/TradesTable.tsx`)

- [ ] Create table with columns:
  - Ticker
  - Strategy
  - Entry Price
  - RR (Risk/Reward)
  - POP (Probability estimate)
  - Status
  - Created At
  - Unrealized/Realized P/L
  - Actions (View, Close, Delete)
- [ ] Load trades from repo on mount
- [ ] Implement filter by status (open/closed/all)
- [ ] Implement filter by ticker (text search)
- [ ] Add sort functionality (by date, ticker, RR)
- [ ] Add close trade action (modal or inline form)
- [ ] Add delete trade action (with confirmation)
- [ ] Show empty state when no trades
- [ ] Style with Tailwind (table, filters, badges)

### 5.4 Close Trade Flow (`src/ui/CloseTrade.tsx` or inline)

- [ ] Create close trade UI (modal or inline form)
- [ ] Input field for exit price
- [ ] Calculate realized P/L (formula based on strategy)
- [ ] Show preview of P/L before confirming
- [ ] Update trade via repo on confirm
- [ ] Refresh trades list after close
- [ ] Handle errors gracefully

---

## 6. Integration & App Assembly

### 6.1 Main Entry Point (`src/main.tsx`)

- [ ] Import App component (replace current PastePanel)
- [ ] Add CSS imports (Tailwind, global styles)
- [ ] Wrap with Router provider
- [ ] Test hot reload works

### 6.2 Global Styles (`src/index.css`)

- [ ] Add Tailwind directives
- [ ] Add custom CSS variables (colors, spacing)
- [ ] Add global styles for body, typography
- [ ] Ensure consistent font family

---

## 7. Testing

### 7.1 Unit Tests - Risk Utils (`tests/risk.test.ts`)

- [ ] Test maxRisk calculation for credit spread
- [ ] Test maxRisk calculation for debit spread
- [ ] Test maxReward calculation for credit spread
- [ ] Test maxReward calculation for debit spread
- [ ] Test RR calculation
- [ ] Test breakeven calculation for vertical spread
- [ ] Test POP estimation (with mocked values)
- [ ] Test computeMetrics integration
- [ ] Test edge cases (0 quantity, empty legs, invalid prices)

### 7.2 Unit Tests - Assessment (`tests/assessment.test.ts`)

- [ ] Test "Risk-heavy" assessment (RR >= 1.5, POP < 45%)
- [ ] Test "Balanced" assessment (0.7 <= RR < 1.5, 45% <= POP <= 60%)
- [ ] Test "Favorable" assessment (RR < 0.7, POP > 60%)
- [ ] Test edge cases (undefined metrics, NaN values)
- [ ] Test boundary conditions

### 7.3 Unit Tests - Repository (`tests/repo.test.ts`)

- [ ] Test createTrade (generates id, timestamps)
- [ ] Test getTrade (returns correct trade)
- [ ] Test getAllTrades (returns all)
- [ ] Test getOpenTrades (filters by status)
- [ ] Test getClosedTrades (filters by status)
- [ ] Test updateTrade (modifies fields)
- [ ] Test closeTrade (sets exit fields)
- [ ] Test deleteTrade (removes from db)
- [ ] Use in-memory Dexie for tests

### 7.4 Component Tests - TradeForm (`tests/TradeForm.test.tsx`)

- [ ] Test form renders all fields
- [ ] Test validation errors show for empty required fields
- [ ] Test metrics calculate on input change
- [ ] Test submit calls repo.createTrade
- [ ] Test navigation after successful submit
- [ ] Test loading state during submit
- [ ] Use React Testing Library

### 7.5 Component Tests - TradesTable (`tests/TradesTable.test.tsx`)

- [ ] Test table renders with mock trades
- [ ] Test empty state shows when no trades
- [ ] Test filter by status works
- [ ] Test filter by ticker works
- [ ] Test close trade action updates repo
- [ ] Test delete trade action removes from list
- [ ] Use React Testing Library + mocked repo

---

## 8. Documentation

### 8.1 Update README (`README.md`)

- [ ] Add "Quick Start" section
  - Prerequisites (Node >= 18)
  - Installation (`npm install`)
  - Run dev server (`npm run dev`)
  - Run tests (`npm run test`)
  - Run lint (`npm run lint`)
- [ ] Add "Usage" section
  - Creating a trade
  - Viewing trades
  - Closing a trade
- [ ] Add "Project Structure" diagram
- [ ] Add "Risk Calculation Formulas" reference (or link to `docs/`)
- [ ] Add screenshots (optional for MVP)

### 8.2 Risk Math Documentation (`docs/risk-math.md`)

- [ ] Document maxRisk formula for common strategies
- [ ] Document maxReward formula for common strategies
- [ ] Document breakeven formulas
- [ ] Document POP estimation method (normal CDF approximation)
- [ ] Note limitations and assumptions
- [ ] Add example calculations

---

## 9. Final Validation & Polish

### 9.1 Manual Testing

- [ ] Test full flow: create trade → view in table → close trade → verify P/L
- [ ] Test with multiple trades (at least 10)
- [ ] Test filters and sorting
- [ ] Test validation edge cases (empty fields, invalid numbers)
- [ ] Test persistence (refresh page, verify data persists)
- [ ] Test on different browsers (Chrome, Firefox, Safari)

### 9.2 Code Quality

- [ ] Run `npm run lint` and fix all warnings
- [ ] Run `npm run format` to format all files
- [ ] Run `npm run test` and ensure 100% pass rate
- [ ] Review all TODOs and FIXMEs in code
- [ ] Add error boundaries for React components

### 9.3 Performance Check

- [ ] Test with 100+ trades (should be smooth)
- [ ] Check for console errors/warnings
- [ ] Verify no memory leaks (DevTools profiler)

---

## 10. Completion Criteria

- [ ] All checkboxes above are complete
- [ ] All tests pass (`npm run test`)
- [ ] No lint errors (`npm run lint`)
- [ ] README Quick Start is accurate
- [ ] App runs without errors (`npm run dev`)
- [ ] User can create, view, and close trades
- [ ] Data persists in IndexedDB between sessions
- [ ] Metrics and assessment display correctly
- [ ] Ready for Milestone 2 (Paste Parser integration)

---

## Notes

- Parser and PastePanel (Milestone 2) are already implemented but not integrated into main app flow yet
- Focus on core trade management first
- Keep UI simple and functional; polish can come later
- Use Tailwind utility classes for fast styling
- Defer advanced features (charts, advanced filters) to later milestones
