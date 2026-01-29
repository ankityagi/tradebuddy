# TradeBuddy MVP

A lightweight, offline-first options trading journal and risk assessment tool.

## Features

- **Trade Management**: Create, view, edit, and close trades
- **Risk Metrics**: Automatic calculation of max risk, max reward, R/R ratio, breakeven, and POP
- **Deterministic Assessment**: Real-time trade evaluation based on risk metrics
- **Local Storage**: All data persists in IndexedDB (offline-friendly)
- **Clean UI**: Built with React, Tailwind CSS, and React Router

## Quick Start

### Prerequisites

- Node.js >= 18.x
- npm or yarn

### Installation

1. Clone the repository and install dependencies:

```bash
npm install
```

### Development

Start the development server:

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

### Building for Production

```bash
npm run build
npm run preview
```

### Testing

Run all tests:

```bash
npm run test
```

Run tests in watch mode:

```bash
npm run test:watch
```

### Linting & Formatting

```bash
npm run lint        # Check for linting errors
npm run format      # Format all files with Prettier
```

## Usage

### Creating a Trade

1. Click "New Trade" in the navigation
2. Enter ticker symbol and select strategy
3. Add trade legs (buy/sell, call/put/stock, strikes, expiry)
4. Enter entry price (positive for debit, negative for credit)
5. View real-time risk metrics and assessment
6. Click "Create Trade" to save

### Viewing Trades

- All trades are displayed in the "My Trades" table
- Filter by status (open/closed) or ticker
- Sort by date, ticker, or R/R ratio
- Click column headers to sort

### Closing a Trade

1. Click "Close" on an open trade
2. Enter exit price
3. Review calculated P/L
4. Confirm to close the trade

### Editing a Trade

1. Click "Edit" on any trade
2. Modify fields as needed
3. Click "Update Trade" to save changes

## Project Structure

```
tradeBuddy/
├── src/
│   ├── domain/          # Business logic
│   │   ├── types.ts     # TypeScript type definitions
│   │   ├── risk.ts      # Risk calculation utilities
│   │   ├── assessment.ts # Trade assessment logic
│   │   └── parser.ts    # Trade confirmation parser (Milestone 2)
│   ├── data/            # Data layer
│   │   ├── db.ts        # Dexie database setup
│   │   └── repo.ts      # Repository (CRUD operations)
│   ├── ui/              # React components
│   │   ├── TradeForm.tsx
│   │   ├── TradesTable.tsx
│   │   ├── CloseTradeModal.tsx
│   │   └── PastePanel.tsx (Milestone 2)
│   ├── App.tsx          # Main app with routing
│   ├── main.tsx         # Entry point
│   └── index.css        # Global styles
├── tests/               # Test files
│   ├── risk.test.ts
│   ├── assessment.test.ts
│   ├── repo.test.ts
│   └── parser.test.ts
└── docs/                # Documentation

```

## Architecture

- **Frontend**: React + Vite + TypeScript
- **Routing**: React Router v6
- **Styling**: Tailwind CSS
- **State & Persistence**: Dexie (IndexedDB wrapper)
- **Validation**: Zod
- **Testing**: Vitest + React Testing Library

## Risk Calculation Formulas

### Vertical Spreads

- **Max Risk (Debit)**: Premium paid × Quantity × 100
- **Max Risk (Credit)**: (Strike difference - Premium received) × Quantity × 100
- **Max Reward (Debit)**: (Strike difference - Premium paid) × Quantity × 100
- **Max Reward (Credit)**: Premium received × Quantity × 100
- **Breakeven**: Long strike ± Net premium (direction depends on call/put)

### Probability of Profit (POP)

Estimated using normal distribution (Black-Scholes assumption):

- Requires current price, IV, and days to expiry
- Uses standard normal CDF for probability calculation
- Marked as "estimate" in UI

**Note**: These are approximations for educational purposes. Always verify with your broker.

## Roadmap

### Milestone 1 (Current) - Local-Only MVP ✅

- ✅ Trade form with validation
- ✅ Risk metrics calculation
- ✅ Deterministic assessment
- ✅ IndexedDB persistence
- ✅ Trades table with filters
- ✅ Close trade flow
- ✅ Unit tests

### Milestone 2 - Paste Parser & UI

- Parse broker confirmation text
- Auto-fill trade form from pasted text
- Support for multiple confirmation formats

### Milestone 3 - Backend Stubs (Optional)

- Express server setup
- `/api/assess` endpoint
- `/api/market/:ticker` endpoint
- Feature flags for API usage

### Milestone 4 - Hardening & Polish

- Enhanced error handling
- Performance optimizations
- Additional tests
- User documentation

## License

MIT
