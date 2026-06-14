<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Cursor Cloud specific instructions

MoneyOS is a single-service Next.js 16 (App Router) + React 19 + Tailwind v4 app — a personal finance command center by Apalym, organized around one question: "What is the next responsible financial action?"

By design there is **no database and no production auth yet** — manual data is editable in-browser (`localStorage`). Plaid is **sandbox-only** with server-side in-memory tokens (dev). Don't add live Plaid, Prisma, or production auth unless the spec changes — but Phase 6 added security **scaffolding** in `docs/security/`.

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

### Phase 4 (transactions + Plaid prep)

- Transaction/account types are in `src/types/transactions.ts`; mock transactions/accounts in `src/lib/data/mock-transactions.ts` (the linked-accounts export is `mockLinkedAccounts` to avoid colliding with `mockAccounts` in `mock-accounts.ts`). Transaction logic (categorization, totals, spending alerts, trend) is in `src/lib/transaction-utils.ts`. The Spending dashboard UI is in `src/components/spending/` (charts are `recharts`, client components). Transactions are display-only mock data (not in the editable localStorage store).
- Nav (`src/components/layout/Nav.tsx`) is a client scroll-spy (IntersectionObserver) that highlights the active section; sections carry `id`s + `scroll-mt-20`. The "Take action" button uses `HighlightProvider`/`useHighlight()` (`src/components/providers/highlight.tsx`): it sets a highlighted alert id; `MoneyAgentAlerts` switches to that alert's tab, scrolls to it, and pulses it via the `.highlight-target` animation in `globals.css`.
- **Plaid is sandbox-only and must stay server-side.** `src/lib/plaid/client.ts` is SERVER-ONLY (reads `PLAID_CLIENT_ID`/`PLAID_SECRET` from env) — never import it from a client component. API routes in `src/app/api/plaid/*` return safe `configured:false` JSON (HTTP 200) when env vars are missing, so they never crash. Never return/persist `access_token`, and never store Plaid tokens in localStorage. Copy `.env.example` → `.env.local` (git-ignored) to enable the sandbox; `react-plaid-link` powers the Connect-bank card in the Spending section.

### Phase 5 (Plaid sandbox data flow)

- Routes: `create-link-token`, `exchange-public-token` (stores the access token server-side), `accounts` (POST → normalized `LinkedAccount[]`), `sync-transactions` (POST → normalized `MoneyTransaction[]` via `transactions/sync`), and `status` (GET → `{configured, connected, status, source, lastSyncAt}`). All are token-free in their responses.
- The sandbox access token is held in `src/lib/plaid/token-store.ts` — a **DEV-ONLY in-memory store on `globalThis`** (single-user, lost on restart). It MUST be replaced with an encrypted DB + real auth before any live usage. Plaid→MoneyOS mapping lives in `src/lib/plaid/normalize.ts` (note: Plaid `amount` sign is inverted to MoneyOS's "negative = outflow").
- Client flow is orchestrated by `src/components/spending/plaid-context.tsx` (`PlaidProvider`/`usePlaid`): on mount it hits `/status`; if connected it loads `/accounts` + `/sync-transactions`. `ConnectBankCard` opens Plaid Link and posts the `public_token` to `/exchange-public-token`; `PlaidStatusCard` shows configured/status/source/last-sync + a Sync button. `SpendingDashboard` switches its data source: mock when not connected, sandbox transactions when connected, with a visible "Plaid sandbox data — not live bank data" label.
- To run the live sandbox round-trip you need real `PLAID_CLIENT_ID`/`PLAID_SECRET` (free Plaid sandbox keys) — in cloud runs these are provided as **secrets** (injected as env vars), and locally they go in `.env.local`. Without them everything still works on mock data. NOTE: secrets are injected into the VM env, so a dev server started **before** they were available won't see them — restart `npm run dev` (or recreate the tmux server) so the process picks them up.
- To test the connect flow, click "Connect sandbox bank" in the Spending section and use Plaid's sandbox login **`user_good` / `pass_good`** (institution e.g. "First Platypus Bank"); "Finish without saving" at the end. The token lives only in the in-memory store, so it resets when the dev server restarts.

### Phase 6 (global data source + security foundation)

- **Global provider:** `FinancialDataProvider` in `src/context/FinancialDataProvider.tsx` wraps the app in `layout.tsx` (inside `MoneyDataProvider`). Use `useFinancialData()` from `src/hooks/useFinancialData.ts` for data source, Plaid connection, accounts, transactions, and computed summaries. `src/lib/data-source.ts` holds pure helpers (`resolveAccounts`, `computeDashboardSummary`, etc.).
- **Header bank control:** `BankConnectionControl` in `src/components/layout/Header.tsx` — Connect bank / Sandbox connected dropdown with sync + disconnect. Consent modal: `src/components/plaid/PlaidConsentDialog.tsx` (required before Plaid Link). Privacy/terms: `/privacy`, `/terms` + drafts in `docs/`.
- **Plaid routes:** added `POST /api/plaid/disconnect` → `clearPlaidSession()`. Existing routes unchanged; all token-free in responses.
- **When Plaid connected:** dashboard cash (depository balances), spending totals, cashflow chart, and review counts use sandbox data; bills/income/alerts stay manual/localStorage with "Mixed manual + sandbox" labels. When not connected: mock/manual as before.
- **Transaction classification:** `TransactionClassification` on `MoneyTransaction`; `classifyTransaction()` / `normalizePlaidTransaction()` in `src/lib/transaction-utils.ts` + `src/lib/plaid/normalize.ts`. Monthly spending excludes transfers, credit card payments, loan payments, deposits, and income. Review = true uncategorized items only (`shouldCountAsReview`).
- **Security docs (templates, not production claims):** `docs/security/` — policies, Plaid notes, production checklist, `SECURE_STORAGE_PLAN.md`. Production requires auth, MFA, encrypted DB, consent logging — not implemented yet.
- **Deprecated:** `PlaidProvider` in `plaid-context.tsx` is a no-op passthrough; `usePlaid()` re-exports from financial data. Spending section still has `ConnectBankCard`/`PlaidStatusCard` but primary control is the header.

### Phase 7 (productization + AI Money Agent)

- **Branding:** Header tagline "Personal finance command center"; footer "MoneyOS by Apalym · Development / Sandbox mode". No personal names in UI.
- **Demo seed data:** centralized in `src/lib/data/demo-user-data.ts` (generic labels); mock-* files re-export. Marked as demo/local development data.
- **AI layer (server-side):** `src/lib/ai/` — types, prompts, `money-agent-service.ts`. Routes: `/api/ai/money-brief`, `/api/ai/explain-alert`, `/api/ai/classify-transaction`. Env: `AI_PROVIDER=mock` (default), `AI_API_KEY`, `AI_MODEL` in `.env.local` — never client-side.
- **UI:** `MoneyAgentBrief` (dashboard + alerts header), `ExplainAlertButton` on alerts, `SuggestCategoryButton` on review transactions (session-only approve). Disclaimer: "AI-generated guidance. Review before making financial decisions."
- **Safety:** `docs/security/AI_MONEY_AGENT_SAFETY.md` — AI never moves/spends/invests or makes final decisions. Mock responses when no API key.
