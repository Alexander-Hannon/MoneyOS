<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Cursor Cloud specific instructions

MoneyOS is a single-service Next.js 16 (App Router) + React 19 + Tailwind v4 app. It is AJ's private finance command center, organized around one question: "What is the next responsible financial action?"

By design (per product spec) there is **no database, no auth, and no bank APIs yet** — data is local mock data that is now **editable in-browser and persisted to `localStorage`**. Don't add Prisma/Plaid/Teller/auth unless the spec changes.

Standard scripts are in `package.json` (`dev`, `build`, `lint`); there are no DB scripts. Architecture / non-obvious notes:

- Types live in `src/types/money.ts` (`Account`, `Bill`, `IncomeSource`, `Subscription`, `Alert`, plus `DashboardStatus`/`Tone`). Note: this is `src/types`, NOT `src/lib/types`.
- Editing & persistence: `src/lib/storage/local-storage.ts` is the thin localStorage layer (SSR-safe no-ops, `newId`); `src/lib/storage/store.tsx` is the `MoneyDataProvider` + `useMoneyData()` client store with CRUD for bills/income/subscriptions/alerts and `resetAll()`. The provider + `ToastProvider` wrap the app in `layout.tsx`.
- Hydration pattern (important): the store initializes from defaults and loads `localStorage` in a `useEffect` after mount, so SSR/first-client render == defaults (no hydration mismatch), then saved edits apply. That effect intentionally calls `setState` (the `react-hooks/set-state-in-effect` rule is disabled there) — keep it that way. The dashboard is therefore a client tree (`src/components/dashboard/Dashboard.tsx`); `page.tsx` just renders it (kept `force-dynamic`).
- Editable sections (`BillsCommandCenter`, `IncomePipeline`, `SubscriptionWatchlist`, `MoneyAgentAlerts`) are client components that read `useMoneyData()` directly and edit via modals (`src/components/ui/dialog.tsx` + forms in `src/components/forms/`). Form primitives are in `src/components/ui/form.tsx`; success feedback via `useToast()`.
- Mock data is split per domain in `src/lib/data/` (`mock-accounts.ts`, `mock-bills.ts`, `mock-income.ts`, `mock-subscriptions.ts`, `mock-alerts.ts`, plus `mock-financials.ts`/`mock-spending-later.ts`). Bill/income dates are generated **relative to "now"** via `nextMonthlyDate`/`daysFromNow`. These are the **defaults**; user edits in localStorage override them until "Reset" is clicked in the header.
- All calculations are pure functions in `src/lib/money-utils.ts`: monthly recurring cost, bills due soon, expected income, total cash available, `computeDashboardStatus` (Danger > Tight > Review Needed > Watch > Stable, in that priority), alert-driven `nextResponsibleAction` (returns the top `Alert`), `cashflowTrend`, summary helpers, plus formatting and `tone*` mappers for badges.
- Alerts (`src/lib/data/mock-alerts.ts`) carry `severity` (low/medium/high), `category`, `suggestedAction`, and `reviewRequired`. The highest-priority alert becomes the prominent "Next Responsible Action" card (currently the credit-card-from-savings decision).
- The cashflow chart uses `recharts` and lives in `src/components/dashboard/CashflowChart.tsx` — it MUST stay a client component (`"use client"`). Its data comes from manual estimates in `src/lib/data/mock-financials.ts` (labeled mock, not live).
- `src/app/page.tsx` is a server component that sets `export const dynamic = "force-dynamic"` so relative mock dates are recomputed per request. It composes the layout shell (`src/components/layout/Header.tsx`, `Nav.tsx`) + dashboard sections; nav is anchor-based (`#dashboard`, `#bills`, ...). Keep `page.tsx` thin — sections live in their own components.
- UI is shadcn/ui-style primitives hand-built in `src/components/ui/` (Card/Badge/Button/Table via `class-variance-authority` + the `cn()` helper in `src/lib/utils.ts`). Reusable `StatusBadge`/`SectionHeader` live in `src/components/shared/`; sections are in `src/components/dashboard/`. Icons are `lucide-react`.
- Dark mode is the default and only theme: `<html className="dark">` in `layout.tsx`, with theme tokens defined in `src/app/globals.css` and mapped to Tailwind utilities (`bg-card`, `text-muted-foreground`, etc.) via `@theme inline`.
- Dev server runs at `http://localhost:3000`.
