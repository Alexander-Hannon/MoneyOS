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

## Where things live

- `src/lib/mock-data.ts` — mock bills, income, subscriptions, and accounts.
- `src/lib/finance.ts` — cashflow math, the Money Agent alert engine, and the "next responsible action".
- `src/components/dashboard/` — the five dashboard sections.
- `src/components/ui/` — shadcn-style primitives (Card, Badge, Button, Table).
