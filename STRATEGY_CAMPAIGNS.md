# Strategy Campaigns — Implementation Plan

Adds first-class support for the **Wheel** and **PMCC** strategies as multi-trade
campaigns, with Adjusted Cost Basis (ACB) tracking, phase progression, and a
dedicated Strategy Dashboard — while keeping per-trade P/L fully intact.

---

## Data model summary

### Two levels of tracking (both always available)

| Level | Where | What it answers |
|---|---|---|
| Per-trade P/L | Column M on each ticker tab | Did this specific CSP/CC win or lose? |
| Campaign P/L | Sum of M across linked trades | Did this entire wheel run make money? |
| ACB | Computed: `assignedStrike − netPremium` | What's my breakeven so I never sell a CC below cost? |

### Sheet structure changes

**Existing ticker tabs** gain two optional columns:
```
... O:Status  P:Notes  Q:CampaignID  R:TradeRole
```
Existing rows without a campaign have blank Q and R — fully backward-compatible.

**New `Campaigns` tab** (auto-created on first campaign):
```
A:ID  B:Ticker  C:Type  D:Status  E:Phase  F:TradeIDs  G:AssignedStrike
H:AssignedAt  I:LeapsCost  J:LeapsStrike  K:LeapsExpiry  L:StartedAt
M:CompletedAt  N:Notes
```

---

## Phase 1 — Data model + sheet storage

**Goal:** Define all types and implement raw sheet CRUD for campaigns.
Nothing visible to the user yet.

Files touched:
- `src/domain/types.ts` — add `Campaign`, `CampaignType`, `WheelPhase`, `PMCCPhase`,
  `CampaignStatus`, `TradeRole`; extend `Trade` with `campaignId?` and `tradeRole?`
- `src/services/sheets.ts` — add `CAMPAIGNS_TAB` constant, `SheetCampaign` interface,
  `readCampaigns` / `writeCampaign` / `updateCampaign` functions; extend `SheetTrade`
  with `campaignId?` and `tradeRole?`; update `getTradesForTicker` to read columns
  A–R; update `addTrade` / `updateTrade` to write Q and R; filter `Campaigns` tab out
  of `getAllTrades`
- `src/data/repo.ts` — add `createCampaign`, `getCampaigns`, `getCampaignById`,
  `updateCampaign`, `linkTradeToCampaign`

---

## Phase 2 — Campaign calculation utilities

**Goal:** Pure functions for ACB, phase logic, and campaign-level P/L.
No UI yet, but fully testable.

Files touched:
- `src/domain/campaigns.ts` (new) — `wheelACB`, `pmccACB`, `campaignNetPL`,
  `campaignPremiumCollected`, `inferTradeRole`, `nextWheelPhase`

---

## Phase 3 — Paste screen campaign detection

**Goal:** When saving a trade from the paste screen, detect active campaigns on
that ticker and prompt the user to link the trade.

Files touched:
- `src/ui/PastePanel.tsx` — after parse, check for active campaigns on the ticker;
  show inline banner "Active Wheel on AAPL — link to campaign?"; auto-detect
  `tradeRole` from parsed trade type; write `campaignId` + `tradeRole` on save
- `src/ui/CampaignLinkBanner.tsx` (new) — the linking prompt component

Roll entry is a special case: a "Roll" trade type is selectable in the banner,
capturing net credit from BTC + STO as a single transaction.

---

## Phase 4 — Strategy Dashboard (`/strategies`)

**Goal:** Dedicated page showing active and completed campaigns as cards.

Files touched:
- `src/ui/Strategies/index.tsx` (new) — page container, active/completed split
- `src/ui/Strategies/WheelCampaignCard.tsx` (new) — phase timeline, ACB, open CC
- `src/ui/Strategies/PMCCCampaignCard.tsx` (new) — LEAPS details, extrinsic check,
  effective cost
- `src/App.tsx` — add `/strategies` route
- Nav component — add Strategies link

### WheelCampaignCard display
```
AAPL · Wheel · Active                    Phase: ● Selling Calls
──────────────────────────────────────────────────────────────
[Sell Puts] ──✓── [Assigned] ──●── [Sell Calls] ── [Called Away]

Assignment:        $185 strike · Jan 15 2026
Premium collected: CSP $4.20 + CC $2.10 = $6.30/shr (net of fees)
ACB:               $185 − $6.30 = $178.70/shr  ← your breakeven

Open CC:           Mar 21 $190C · Above ACB ✓

Campaign P/L:      +$630 collected   [view trades ↗]
```

### PMCCCampaignCard display
```
TSLA · PMCC · Active                     Phase: ● Selling Calls
──────────────────────────────────────────────────────────────
LEAPS:             Jan 2027 $200C · Cost $45.00/shr · Δ 0.82
Short calls sold:  4 across 3 expirations
Premium collected: $12.40/shr (net of fees)
Effective cost:    $45.00 − $12.40 = $32.60/shr

Extrinsic check:   short extrinsic < long extrinsic ✓

Campaign P/L:      +$1,240 realized
```

---

## Phase 5 — Wire campaigns into existing dashboard

**Goal:** Campaign-level win rate and monthly chart context.

Files touched:
- `src/ui/Dashboard/utils.ts` — add `calculateCampaignStats`: campaign win rate
  (win = completed campaign with positive net P/L), avg campaign duration
- `src/ui/Dashboard/index.tsx` — add campaign stat cards alongside existing ones
- `src/ui/Dashboard/PerformanceChart.tsx` — tooltip shows which campaigns
  contributed to that month's P/L (optional enhancement)

---

## Out of scope (deferred)

- Dividend tracking (reduces ACB, nice to have)
- Partial assignments
- Roll suggestions / optimizer
- Broker auto-sync
