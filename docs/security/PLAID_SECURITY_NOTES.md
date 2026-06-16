# Plaid Security Notes (Draft)

**Status:** Sandbox + optional personal live mode (Phase 12)  
**Product:** MoneyOS

## Integration overview

- **Sandbox:** Plaid sandbox for development and testing — always available when configured
- **Personal live (Phase 12):** Plaid Production for the **owner/developer only** — not public SaaS launch
- **Server routes:** `/api/plaid/*` (link token, exchange, accounts, sync, status, disconnect, institutions, refresh-balances)
- **Token storage (signed-in + DB + encryption key):** Encrypted in Postgres `PlaidItem.accessTokenEncrypted` via AES-256-GCM (`src/lib/security/encryption.ts`)
- **Token storage (local/unauthenticated dev):** `src/lib/plaid/token-store.ts` — in-memory on `globalThis`, lost on restart (**sandbox only**)
- **Client:** `react-plaid-link` for Link UI; **no access tokens in responses or localStorage**
- **Environment separation:** `PlaidItem.environment` is `sandbox` or `production`; sync queries filter by environment to avoid mixing data

## Personal live mode gates (Phase 12)

Production Link creation is blocked unless **all** of the following are true:

| Check | Env / condition |
|-------|-----------------|
| Feature flag | `MONEYOS_ENABLE_LIVE_PLAID=true` |
| Owner allowlist | Signed-in Clerk email matches `MONEYOS_ALLOWED_LIVE_USER_EMAIL` |
| Plaid production | `PLAID_ENV=production` with valid production secret |
| Auth | Clerk configured, user signed in |
| Database | `DATABASE_URL` configured |
| Encryption | `PLAID_TOKEN_ENCRYPTION_KEY` valid (32-byte base64 or hex) |

Safe error codes returned to clients (no secrets): `live_plaid_disabled`, `live_user_not_allowed`, `production_env_not_configured`, `encryption_required`, `auth_required`, `database_required`.

Before production Link opens, the UI requires:

1. Consent modal with explicit real-data warnings
2. Checkbox: “I understand this connects real financial data.”
3. Typed confirmation: `CONNECT REAL DATA`

## Security requirements (Plaid-aligned)

| Requirement | Status | Notes |
|-------------|--------|-------|
| Secrets server-side | ✅ | `PLAID_CLIENT_ID` / `PLAID_SECRET` in env only — never commit production secret |
| Access tokens server-side | ✅ | Encrypted in Postgres when auth+DB+encryption; live mode **requires** DB path |
| HTTPS in production | 🔲 | Required before any public launch |
| User auth before live Link | ✅ | Clerk + email allowlist for personal live |
| Consent tracking | 🟡 | Modal + optional DB consent records |
| Data deletion on disconnect | ✅ | Disconnect clears token; optional delete institution history |
| Privacy policy | 🟡 | Draft at `/privacy` and `docs/PRIVACY_POLICY_DRAFT.md` |
| Balance API cost control | ✅ | Live balances: manual refresh + max once/day auto; not on every page load |

## Data retrieved

When connected, MoneyOS may display:

- Account names, masks, balances (depository/credit/loan/investment types as returned)
- Transactions (normalized and categorized in-app)
- Recurring, liabilities, investments per enabled Plaid products

MoneyOS **does not** initiate ACH/wires, pay bills, or make automatic financial decisions.

## Normalization & categorization

- Plaid amounts inverted to MoneyOS convention (negative = outflow)
- `classifyTransaction()` separates spending, income, transfers, payments, and review items
- Transfers/payments excluded from spending totals

## Multi-device note

When sharing the same Neon database across devices, **`PLAID_TOKEN_ENCRYPTION_KEY` must be identical** on every device. A mismatch prevents decrypting stored tokens.

## Pre-public-launch checklist

Phase 12 personal live mode is **not** public launch. Full compliance/security review is still required before any SaaS or public production release. See `PRODUCTION_READINESS_CHECKLIST.md`.

## Do not

- Store Plaid access tokens in `localStorage` or client state
- Return `access_token` from API routes
- Enable public access to live Plaid without full production readiness review
- Mix sandbox and production transaction data in charts without clear labeling
