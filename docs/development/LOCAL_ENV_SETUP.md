# Local environment setup

MoneyOS runs in **local/demo mode** by default — no Clerk, database, Plaid, or AI keys required. Enable optional integrations by copying the example env file and restarting the dev server.

## Quick start

```bash
cp .env.example .env.local
# Edit .env.local with your values (never commit this file)
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

**After any env change, restart `npm run dev`.** Next.js reads env vars at process start; a running dev server will not pick up new values.

## Environment file rules

| File | Tracked in Git? | Used by |
|------|-----------------|---------|
| `.env.example` | Yes (placeholders only) | Documentation template |
| `.env.local` | **Never** | Next.js dev/build, Prisma scripts via `dotenv-cli` |
| `.env` | **Never** | Optional Prisma CLI fallback (not recommended) |

See [SECRET_ROTATION.md](../security/SECRET_ROTATION.md) if secrets were ever committed.

For laptop + desktop workflows, see [MULTI_DEVICE_SETUP.md](./MULTI_DEVICE_SETUP.md).

## Required vs optional variables

### Always safe to leave unset (local mode)

With no env vars, MoneyOS uses:

- `localStorage` for editable bills/income/subscriptions/alerts
- Mock spending transactions
- In-memory Plaid sandbox token store (dev only, lost on restart)
- Mock AI Money Agent responses

### Plaid sandbox (optional)

Enable server-side Plaid Link and sandbox transaction sync:

```env
PLAID_CLIENT_ID=
PLAID_SECRET=
PLAID_ENV=sandbox
PLAID_PRODUCTS=transactions
PLAID_COUNTRY_CODES=US
```

Get free sandbox keys from the [Plaid Dashboard](https://dashboard.plaid.com/).

Test login in Link: `user_good` / `pass_good` (e.g. First Platypus Bank).

### Clerk authentication (optional)

Enable sign-in and user-scoped persistence:

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/
```

When unset, the app skips auth and API routes return local-mode responses.

When set, `src/proxy.ts` exports `clerkMiddleware()` when both Clerk keys are present (Next.js 16 proxy convention).

#### Clerk development key warning (expected in local dev)

If you see a console warning that your Clerk key is a **development** key (`pk_test_...`), that is **normal** during local development. Clerk uses separate development and production instances.

- **Local dev:** development keys in `.env.local` are fine.
- **Production deploy:** use production Clerk keys (`pk_live_...` / live secret key) in your hosting platform environment variables — never development keys.
- Do not treat the dev-key warning as a bug; it is a reminder not to ship development credentials.

### Database (optional — Neon Postgres)

Required for signed-in user persistence (accounts, transactions, Plaid items):

```env
DATABASE_URL=postgresql://...
```

First-time setup:

```bash
npm run db:push    # loads .env.local via dotenv-cli
npm run db:studio  # optional GUI
```

**Prisma note:** Bare `npx prisma db push` reads `.env`, not `.env.local`. Prefer the npm scripts above.

See [DATABASE_SETUP.md](./DATABASE_SETUP.md) for troubleshooting.

### Plaid token encryption (optional)

Required together with Clerk + `DATABASE_URL` to persist Plaid sandbox access tokens in Postgres:

```env
PLAID_TOKEN_ENCRYPTION_KEY=
```

Generate a 32-byte key:

```bash
openssl rand -base64 32
```

Store the output in `.env.local` only. Never commit it.

**Multi-device:** Use the **same** `PLAID_TOKEN_ENCRYPTION_KEY` on every machine that shares the same `DATABASE_URL`.

### Personal live Plaid (Phase 12 — private owner mode)

This is **not** public SaaS launch. It allows the owner/developer to connect real bank data through Plaid Production when all gates pass.

```env
MONEYOS_ENABLE_LIVE_PLAID=false
MONEYOS_ALLOWED_LIVE_USER_EMAIL=you@example.com
PLAID_ENV=production
PLAID_SECRET=           # production secret — NEVER commit
PLAID_PRODUCTION_SECRET=  # optional explicit production secret (preferred)
# Optional: keep sandbox Link working while PLAID_ENV=production
PLAID_SANDBOX_SECRET=
```

Requirements when `MONEYOS_ENABLE_LIVE_PLAID=true`:

- Clerk configured and signed in as the allowlisted email
- `DATABASE_URL` + `PLAID_TOKEN_ENCRYPTION_KEY`
- `PLAID_ENV=production` with valid production Plaid credentials
- Strong consent modal + typed `CONNECT REAL DATA` before Link opens

Blocked error codes (safe diagnostics): `live_plaid_disabled`, `live_user_not_allowed`, `production_env_not_configured`, `encryption_required`, `auth_required`, `database_required`.

Public launch still requires final compliance and security review — see `PRODUCTION_READINESS_CHECKLIST.md`.

### AI Money Agent (optional)

Default is mock mode (no API key):

```env
AI_PROVIDER=mock
GEMINI_API_KEY=
AI_MODEL=
```

For Gemini:

```env
AI_PROVIDER=gemini
GEMINI_API_KEY=
AI_MODEL=gemini-2.0-flash
```

## Development checklist

Before starting work each session:

- [ ] `.env.local` exists locally (from `.env.example`) if using integrations
- [ ] `.env` and `.env.local` are **not** tracked by Git (`bash scripts/check-secrets-hygiene.sh`)
- [ ] `npm run dev` restarted after env edits
- [ ] `npm run db:push` run after schema changes (when `DATABASE_URL` is set)

Before opening a PR:

- [ ] `npm run lint` passes
- [ ] `npm run build` passes
- [ ] No secrets in diff (only `.env.example` placeholders if env docs changed)
- [ ] Run secret hygiene check: `bash scripts/check-secrets-hygiene.sh`

## Verify API health (optional integrations)

With dev server running:

```bash
curl -s http://localhost:3000/api/user/status | jq .
curl -s http://localhost:3000/api/plaid/status | jq .
```

These should return JSON without Clerk proxy errors. In local mode, expect `authConfigured: false` and mock/in-memory Plaid storage.

## Related docs

- [Database setup](./DATABASE_SETUP.md)
- [Multi-device setup](./MULTI_DEVICE_SETUP.md)
- [Secret rotation](../security/SECRET_ROTATION.md)
- [Plaid security notes](../security/PLAID_SECURITY_NOTES.md)
