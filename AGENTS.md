<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Cursor Cloud specific instructions

MoneyOS is a single-service Next.js 16 (App Router) + React 19 + Tailwind v4 app. It is AJ's private finance command center, organized around one question: "What is the next responsible financial action?"

By design (per product spec) there is **no database, no auth, and no bank APIs yet** — all data is local mock data. Don't add Prisma/Plaid/Teller/auth unless the spec changes.

Standard scripts are in `package.json` (`dev`, `build`, `lint`); there are no DB scripts. Architecture / non-obvious notes:

- Data lives in `src/lib/mock-data.ts` (`getMockData()`), with dates generated **relative to "now"** so the dashboard always looks live. Derived metrics, the spending-alert engine, and the "next responsible action" are pure functions in `src/lib/finance.ts`.
- `src/app/page.tsx` is a server component that sets `export const dynamic = "force-dynamic"` so relative mock dates are recomputed per request rather than frozen at build time.
- UI is shadcn/ui-style primitives hand-built in `src/components/ui/` (Card/Badge/Button/Table via `class-variance-authority` + the `cn()` helper in `src/lib/utils.ts`); feature sections are in `src/components/dashboard/`. Icons are `lucide-react`; the cashflow chart uses `recharts` and must stay a client component (`"use client"`).
- Dark mode is the default and only theme: `<html className="dark">` in `layout.tsx`, with theme tokens defined in `src/app/globals.css` and mapped to Tailwind utilities (`bg-card`, `text-muted-foreground`, etc.) via `@theme inline`.
- Dev server runs at `http://localhost:3000`.
