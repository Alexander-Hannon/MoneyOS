# MoneyOS Agent Instructions

MoneyOS is a personal finance command center by Apalym.

Its operating question is:

> What is the next responsible financial action?

MoneyOS may process real personal financial data through Plaid Personal Live mode. Treat all financial data, credentials, tokens, and account-linked records as highly sensitive.

## Current Architecture

* Next.js 16 App Router
* React 19
* Tailwind v4
* Clerk authentication
* Prisma + Neon/Postgres
* Plaid integration with separate Sandbox and Personal Live environments
* AES-256-GCM encrypted Plaid access-token storage
* Signed-in accounts with the database as the only store for financial data
* Signed-out visitors see an in-memory Demo Preview (never persisted)
* Per-record writes through `/api/user/records` (ownership-checked, idempotent by id)
* Gemini or mock AI provider for review-only financial guidance

## Current Product State

MoneyOS supports:

* Manual bills, income sources, subscriptions, alerts, and Spending Later items
* Weekly Money Review
* Action Center and deterministic First 3 Actions
* Personal Live Plaid connection for an allowlisted owner account
* Encrypted server-side Plaid token persistence
* Live account balances and transaction sync
* Manual live-balance refresh with a server-enforced shared quota
* Transaction classification and recurring-item detection
* Cross-device data sync between Laptop and Desktop

MoneyOS is moving toward a consumer subscription product for individuals. It is not yet public production: Personal Live bank access is still limited to an allowlisted owner email until multi-user entitlements, billing, and Plaid production approval are in place. Never claim public-production readiness.

## Security Rules

Never expose, print, log, commit, return to the browser, or store in localStorage:

* Plaid access tokens
* Plaid public tokens
* Plaid client secrets
* API keys
* `DATABASE_URL`
* encryption keys
* Clerk secret keys
* full bank account numbers
* raw sensitive financial identifiers

Never commit:

* `.env`
* `.env.local`
* credentials
* API keys
* production secrets
* database connection strings

Plaid token exchange, encryption, storage, decryption, balance refresh, and transaction sync must remain server-side.

Do not weaken authentication, authorization, encryption, environment validation, or live-mode gating to simplify testing.

## Financial Safety Rules

MoneyOS must never:

* move money
* initiate transfers
* pay bills
* open or close financial accounts
* execute trades
* make investment decisions
* automatically approve AI suggestions
* automatically create bills, subscriptions, recurring commitments, or transaction rules

AI output is always review-only.

Any destructive cleanup, disconnect, deletion, duplicate repair, or data replacement must require clear user confirmation and explain the consequence.

## Data Trust Rules

Always label data truthfully:

* `Your Data` (signed-in account data)
* `Demo Preview` / `Demo Data` (signed-out sample data)
* `Plaid Sandbox`
* `Personal Live`
* `Manual`
* `Projected`

Never show:

* demo values as live data
* sandbox data as Personal Live data
* mock trend data as actual financial history
* fabricated smooth historical chart values
* a projected value without a clear projection label

Treat these separately from normal spending:

* transfers
* internal account movement
* overdraft protection
* round-up transfers
* credit-card payments
* loan payments
* deposits
* refunds
* income

Personal Live Plaid Items, accounts, transactions, and balance data must stay separate from Sandbox data.

## Cross-Device and Persistence Rules

* A signed-in account's database data is the only source of truth.
* Never store financial data in localStorage, sessionStorage, or IndexedDB. Browser storage is for per-device UI state only.
* Signed-out Demo Preview data lives in memory and is never persisted or synced.
* Clients send only changed records; the server checks ownership before every write.
* Record ids are global primary keys: generate full UUIDs, never short random suffixes.
* Empty client state must never overwrite non-empty database data.
* Importing legacy browser-only data must preserve the browser copy until the server confirms success, and must never import demo data.
* Database mutations should be idempotent where practical.
* Reconnecting an existing Plaid Item must not silently duplicate accounts or transactions.
* Account and transaction upserts must use stable Plaid identifiers or safe deterministic hashes.
* Changes to bills, subscriptions, transaction decisions, alerts, and weekly reviews must sync across devices.

## Live Plaid Rules

Personal Live mode must require:

* Clerk authentication
* database configured
* encryption configured
* owner allowlist validation
* explicit consent confirmation before Link opens
* production Plaid environment
* server-side token handling

Balance refresh rules:

* Never refresh live balances automatically on page load.
* Never refresh balances during standard transaction sync.
* Refresh balances only through the explicit server-side refresh endpoint.
* Enforce the shared server-side rolling quota across all devices.
* Never expose live balance-refresh secrets or internal token state.

## Transaction Review Rules

Transaction decisions must persist.

For every reviewed transaction, support appropriate user-controlled actions:

* manual category selection
* accept AI suggestion
* mark as transfer/internal
* mark as refund
* mark as income
* link to an existing bill
* link to an existing subscription
* mark not recurring
* leave unresolved for later

A successful review decision must update:

* transaction review state
* spending totals
* category summaries
* Action Center count
* related recurring alerts
* cross-device synced data

Do not create a global category rule unless the user explicitly approves it.

When a transaction matches an existing bill or subscription, offer a link/reconciliation flow instead of creating a duplicate bill, subscription, or recurring alert.

## Engineering Standard

Before editing:

1. Read this file first.
2. Identify affected APIs, components, data models, and cross-device behavior.
3. Identify whether the change touches:

   * real financial data
   * Plaid
   * authentication
   * encryption
   * database persistence
   * transaction classification
   * balance refresh
   * cross-device sync
4. Prefer the smallest safe fix. Do not refactor unrelated code.

Before claiming work is complete:

1. Check schema/migration impact.
2. Add or preserve loading, empty, success, and failure states.
3. Check retry and duplicate behavior for mutations and Plaid reconnect flows.
4. Run `npm run lint`.
5. Run `npm run build`.
6. Run `npm run db:push` when Prisma schema changed.
7. State what was tested manually.
8. State what remains untested.
9. Never claim public-production readiness unless explicitly asked and verified.

## Debugging Rules

* Diagnose before rewriting.
* Return structured safe errors without secrets.
* Do not reconnect a live bank account as the first debugging step.
* Do not delete or disconnect existing live financial data as a first debugging step.
* Preserve data during repairs whenever possible.
* Use dry-run summaries before destructive duplicate cleanup.
* Keep Sandbox and Personal Live flows separate at every API and UI boundary.

## Current Priority

Path to a monetizable product, in order:

1. Foundation (done): database-canonical data layer, shared session, CI, no dev or personal leftovers in the UI.
2. Multi-user: plan-based entitlements replacing the single owner allowlist, Clerk production on a custom domain, landing and pricing pages, account deletion.
3. Billing: Stripe subscriptions, webhooks, trials, billing portal.
4. Production operations: Plaid webhooks and scheduled sync, rate limiting, error monitoring, audit logging, reviewed legal pages, Plaid production approval.

Transaction review must stay trustworthy throughout: persisted decisions, bill/subscription reconciliation, and no duplicate records or stale Action Center alerts.
