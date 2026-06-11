<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Cursor Cloud specific instructions

MoneyOS is a single-service Next.js 16 (App Router) + React 19 + Tailwind v4 app. It is AJ's private finance command center, organized around one question: "What is the next responsible financial action?"

By design (per product spec) there is **no database, no auth, and no bank APIs yet** — all data is local mock data. Don't add Prisma/Plaid/Teller/auth unless the spec changes.

Standard scripts are in `package.json` (`dev`, `build`, `lint`); there are no DB scripts. Architecture / non-obvious notes:

- Types live in `src/lib/types/money.ts` (`Account`, `Bill`, `IncomeSource`, `Subscription`, `Alert`, plus `DashboardStatus`/`Tone`).
- Mock data is split per domain in `src/lib/data/` (`mock-accounts.ts`, `mock-bills.ts`, `mock-income.ts`, `mock-subscriptions.ts`, `mock-alerts.ts`). Bill/income dates are generated **relative to "now"** via `nextMonthlyDate`/`daysFromNow` so the dashboard always looks live.
- All calculations are pure functions in `src/lib/money-utils.ts`: monthly recurring cost, bills due soon, expected income, total cash available, `computeDashboardStatus` (Stable/Watch/Tight/Danger/Review Needed), `nextResponsibleAction`, plus formatting and `tone*` mappers for badges.
- `src/app/page.tsx` is a server component that sets `export const dynamic = "force-dynamic"` so relative mock dates are recomputed per request rather than frozen at build time. The display title is "AJ Money Command Center".
- UI is shadcn/ui-style primitives hand-built in `src/components/ui/` (Card/Badge/Button/Table via `class-variance-authority` + the `cn()` helper in `src/lib/utils.ts`). Reusable `StatusBadge`/`SectionHeader` live in `src/components/shared/`; the five sections are in `src/components/dashboard/`. Icons are `lucide-react` (there is no chart library — Recharts was intentionally removed).
- Dark mode is the default and only theme: `<html className="dark">` in `layout.tsx`, with theme tokens defined in `src/app/globals.css` and mapped to Tailwind utilities (`bg-card`, `text-muted-foreground`, etc.) via `@theme inline`.
- Dev server runs at `http://localhost:3000`.
