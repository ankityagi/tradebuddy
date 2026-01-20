TradeBuddy MVP

Goals
- Simple flow: input trade, get assessment, track P/L.
- Inputs: manual form first; screenshot OCR next; broker import later.
- Data: default to yfinance; allow CSV/imports later.

Architecture
- Frontend: React + Vite + TypeScript (in `frontend/`).
- Backend: Node + Express + TypeScript (in `backend/`).
- Local storage: IndexedDB (Dexie) for MVP; server DB later.

Packages (planned)
- Frontend: React, React Router, Tailwind, Dexie, Zod, Recharts.
- Backend: Express, Zod, axios, dotenv, openai/anthropic SDK placeholder.
- Dev/Test: Vitest + RTL (frontend), Jest/Vitest (backend), ESLint/Prettier.

Directories
- frontend/
- backend/
- docs/

MVP Endpoints (backend)
- `POST /api/assess` — LLM-backed assessment (stub returns deterministic sample).
- `POST /api/ocr` — parse screenshot via Tesseract.js (planned; stub for now).
- `GET /api/market/:ticker` — fetch quote/IV proxy via yfinance wrapper.

Core Models (shared shape)
- Trade: id, ticker, legs[], entry, risk, assessment, status.
- Outcome: realized P/L, reason, lesson.

Local Risk Utils (frontend)
- Compute maxRisk, maxReward, RR, breakevens for common spreads.
- Approx POP using normal CDF; mark as estimate.

Scripts (once initialized)
- Frontend: `npm run dev`, `npm run build`, `npm run test`, `npm run lint`.
- Backend: `npm run dev`, `npm run build`, `npm run start`, `npm run test`.

Next Steps
1) Initialize Vite React TS in `frontend/`.
2) Initialize Express TS in `backend/`.
3) Add shared TypeScript types in both apps (duplicated initially).
4) Implement risk utils and TradeForm skeleton.
5) Stub `/api/assess` and wire UI panel.
6) Add yfinance market fetcher and open trades table.

