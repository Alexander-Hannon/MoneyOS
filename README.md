# MoneyOS

AJ's private personal finance **command center** — built around one question:

> **What is the next responsible financial action?**

It is intentionally *not* a public fintech SaaS, spreadsheet clone, or generic budgeting app. The goal is a dashboard so clean and simple that it's actually checked daily.

## What's inside (v1)

1. **Money Snapshot** — balance, safe-to-spend, monthly outflow, net cashflow, and a 6-month cashflow trend.
2. **Bills Command Center** — upcoming bills with due dates and status badges.
3. **Income Pipeline** — income sources and when the next payment lands.
4. **Subscription Watchlist** — recurring spend with flags for unused, trials, and price hikes.
5. **Money Agent Alerts** — prioritized insights that surface the single next responsible action.

## Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS v4**, dark-mode-first command-center design
- **shadcn/ui-style** components (hand-built) + **lucide-react** icons
- **Recharts** for the cashflow chart
- **Local mock data** only — no database, no auth, no bank APIs (by design)

## Quick start

```bash
npm install      # install dependencies
npm run dev      # start the dev server on http://localhost:3000
```

## Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Production build |
| `npm run start` | Run the production build |
| `npm run lint` | Lint with ESLint |

## Spending & Plaid (Phase 4)

The **Spending** section shows mock transactions: monthly totals, spending by category, top merchants, recent transactions, items needing review, recurring-charge candidates, an income-vs-spending trend, and rule-based spending alerts — all clearly labeled *manual/mock data*.

Plaid is **prepared but not connected**. Copy `.env.example` to `.env.local` and add sandbox credentials to enable it:

```bash
cp .env.example .env.local   # then fill PLAID_CLIENT_ID / PLAID_SECRET
```

Without credentials, the Plaid API routes (`/api/plaid/*`) return safe "not configured" responses and the "Connect a sandbox bank" card says so. Tokens are exchanged server-side only and never stored in the browser.

With sandbox credentials in `.env.local`, the Spending section's **Connect a sandbox bank** button opens Plaid Link; on success the dashboard switches to **Plaid sandbox** mode and shows sandbox accounts and transactions (labeled "Plaid sandbox data — not live bank data"). A Plaid connection status card shows configured/connection/source/last-sync and a Sync button. The sandbox access token is kept in a **dev-only in-memory server store** (`src/lib/plaid/token-store.ts`) — it must be replaced with an encrypted database + auth before any real/live usage. Sandbox only; no live banks.

## Editing data

Bills, income, subscriptions, and alerts are **editable from the UI** (add / edit / delete, status changes). Edits are saved to your browser's `localStorage` — no account, server, or database. Use **Reset** in the header to restore the default mock data.

## Where things live

- `src/types/money.ts` — `Account`, `Bill`, `IncomeSource`, `Subscription`, `Alert` types.
- `src/lib/data/` — default mock data: `mock-accounts`, `mock-bills`, `mock-income`, `mock-subscriptions`, `mock-alerts`, `mock-financials`, `mock-spending-later`.
- `src/lib/storage/` — `local-storage.ts` (persistence) and `store.tsx` (`MoneyDataProvider` + `useMoneyData()` with CRUD + reset).
- `src/lib/money-utils.ts` — monthly recurring cost, bills due soon, expected income, dashboard status, and the "next responsible action".
- `src/components/dashboard/` — the dashboard sections (editable ones use the store + modals).
- `src/components/forms/` — Bill/Income/Subscription/Alert edit forms.
- `src/components/shared/` — `StatusBadge`, `SectionHeader`, `RowActions`, `EmptyState`.
- `src/components/ui/` — shadcn-style primitives (Card, Badge, Button, Table, Dialog, form fields, Toast).

## Installing Locally

```Cloning
- git clone https://github.com/Alexander-Hannon/MoneyOS.git
- gh repo clone Alexander-Hannon/MoneyOS

