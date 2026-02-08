# Feature Plan: Sheet Setup & Greeks Population

## Overview
Two main features to implement:
1. **New Sheet Setup** - Help new users create a properly formatted Google Sheet
2. **Greeks Population** - Calculate and display option Greeks (Delta, Gamma, Theta, Vega, Rho)

---

## Feature 1: New Sheet Setup Wizard

### User Flow
1. User signs in with Google OAuth
2. If no sheet is connected, show "Create New Sheet" option alongside "Connect Existing Sheet"
3. Wizard creates a new Google Sheet with:
   - Proper column headers (A-O)
   - Summary tab with formulas
   - Example ticker tab structure

### Implementation

#### New Components
- `src/ui/SheetWizard.tsx` - Multi-step wizard component
- `src/services/sheetTemplate.ts` - Template definitions

#### Sheet Structure to Create
```
Columns: Ticker | Type | Strike | Qty | Delta | Opened | Expiry | DTE | Premium ($) | Exit | Fee | P/L | ROI | Status | Helper
```

#### API Calls Needed
- `sheets.googleapis.com/v4/spreadsheets` (POST) - Create new spreadsheet
- `sheets.googleapis.com/v4/spreadsheets/{id}:batchUpdate` - Format headers, add conditional formatting

### Tasks
- [ ] Add "Create New Sheet" button to SheetSetup component
- [ ] Create SheetWizard component with steps
- [ ] Implement `createNewSpreadsheet()` in sheets service
- [ ] Add header formatting (bold, freeze row 1)
- [ ] Add conditional formatting for Status column (green=OPEN, red=CLOSED)
- [ ] Create Summary tab with aggregation formulas

---

## Feature 2: Greeks Population

### Options for Calculating Greeks

#### Option A: Client-side calculation with `@uqee/black-scholes` (Recommended)
**Pros:**
- No backend needed
- Fast calculations
- TypeScript support
- Includes implied volatility calculation

**Cons:**
- Need to fetch current stock price & IV from external API
- Black-Scholes assumes European options (American options need adjustments)

**npm package:** `@uqee/black-scholes`

#### Option B: Use `greeks` npm package
**Pros:**
- Simple API
- Well-tested

**Cons:**
- 11 years old, may lack modern features
- No TypeScript types

#### Option C: Backend service with Python (yoptions/financetoolkit)
**Pros:**
- More accurate Greeks from yoptions
- Access to real-time Yahoo Finance data

**Cons:**
- Requires backend infrastructure
- Added complexity

### Recommended Approach: Option A + Yahoo Finance API

#### Implementation Plan

1. **Install dependencies**
   ```bash
   npm install @uqee/black-scholes
   ```

2. **Create Greeks service** (`src/services/greeks.ts`)
   - Calculate Delta, Gamma, Theta, Vega, Rho
   - Input: strike, expiry, current price, IV, risk-free rate, option type

3. **Fetch market data** (`src/services/marketData.ts`)
   - Get current stock price from Yahoo Finance (via CORS proxy or API)
   - Get implied volatility from options chain
   - Cache responses to avoid rate limiting

4. **UI Integration**
   - Add Greeks column to TradesTable (or expand existing Delta column)
   - Show Greeks in trade detail view
   - Option to sync Greeks to Google Sheet

### Greeks Calculation Formula (Black-Scholes)

Required inputs:
- `S` - Current stock price
- `K` - Strike price
- `T` - Time to expiration (years)
- `r` - Risk-free interest rate (~5% currently)
- `σ` - Implied volatility
- `type` - 'call' or 'put'

### Market Data Sources

| Source | Cost | Features |
|--------|------|----------|
| Yahoo Finance (unofficial) | Free | Stock price, options chain, IV |
| Alpha Vantage | Free tier | Stock price, limited options |
| Polygon.io | $29/mo | Full options data, Greeks |
| Tradier | Free (delayed) | Full options chain |

### Tasks
- [ ] Install `@uqee/black-scholes` package
- [ ] Create `src/services/greeks.ts` with calculation functions
- [ ] Create `src/services/marketData.ts` for fetching stock prices
- [ ] Add Yahoo Finance price fetching (via CORS proxy)
- [ ] Update TradesTable to display calculated Greeks
- [ ] Add "Refresh Greeks" button
- [ ] Option to write Greeks back to Google Sheet

---

## Priority Order

### Phase 1: Sheet Setup (simpler, immediate value)
1. Create new spreadsheet functionality
2. Sheet template with proper formatting
3. Wizard UI

### Phase 2: Greeks Calculation
1. Install Black-Scholes package
2. Create Greeks calculation service
3. Integrate market data fetching
4. UI updates

---

## Questions to Resolve
1. Should Greeks be stored in the Google Sheet or calculated on-demand?
2. Which market data API to use? (Yahoo Finance is free but unofficial)
3. Should we show all Greeks or just Delta initially?
