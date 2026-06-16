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

When set, `src/middleware.ts` must export `clerkMiddleware()` (already configured when both Clerk keys are present).

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

These should return JSON without Clerk middleware errors. In local mode, expect `authConfigured: false` and mock/in-memory Plaid storage.

## Related docs

- [Database setup](./DATABASE_SETUP.md)
- [Secret rotation](../security/SECRET_ROTATION.md)
- [Plaid security notes](../security/PLAID_SECURITY_NOTES.md)
