# MoneyOS

Private personal finance dashboard for bills, income, subscriptions, spending alerts, and Money Agent reviews.

## Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS v4**
- **Prisma** ORM with a local **SQLite** database (zero external services)

## Quick start

```bash
npm install          # installs deps and generates the Prisma client
npm run db:push      # create the local SQLite database (prisma/dev.db)
npm run db:seed      # load demo bills, income, and subscriptions
npm run dev          # start the dev server on http://localhost:3000
```

## Features

- **Dashboard** — monthly income, bills, subscriptions, and net cashflow at a glance.
- **Bills / Income / Subscriptions** — add entries from the UI; data persists to SQLite.
- **Spending alerts** — automatic warnings for overspending, subscription creep, thin savings buffers, and bills due early in the month.
- **Money Agent** — generates a financial health score (0–100) with a plain-language summary and personalized recommendations.

## Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Production build |
| `npm run start` | Run the production build |
| `npm run lint` | Lint with ESLint |
| `npm run db:push` | Sync the Prisma schema to SQLite |
| `npm run db:seed` | Reset + seed demo data |

## Configuration

`DATABASE_URL` is defined in `.env` and points at a local SQLite file (`file:./dev.db`). It contains no secrets and is committed for convenience.
