# Plaid Security Notes (Draft)

**Status:** Development / sandbox only  
**Product:** MoneyOS

## Current integration

- **Environment:** Plaid sandbox only — no live mode
- **Server routes:** `/api/plaid/*` (link token, exchange, accounts, sync, status, disconnect)
- **Token storage:** `src/lib/plaid/token-store.ts` — in-memory on `globalThis`, single session, lost on restart
- **Client:** `react-plaid-link` for Link UI; **no access tokens in responses or localStorage**

## Security requirements (Plaid-aligned)

| Requirement | Status | Notes |
|-------------|--------|-------|
| Secrets server-side | ✅ | `PLAID_CLIENT_ID` / `PLAID_SECRET` in env only |
| Access tokens server-side | ✅ (dev) | In-memory — **replace with encrypted DB** |
| HTTPS in production | 🔲 | Required before live |
| User auth before Link | 🔲 | Placeholder consent modal exists; MFA TBD |
| Consent tracking | 🔲 | Log consent timestamp + version before Link |
| Data deletion on disconnect | 🟡 | Disconnect API clears server token; full user purge TBD |
| Privacy policy | 🟡 | Draft at `/privacy` and `docs/PRIVACY_POLICY_DRAFT.md` |

## Data retrieved (sandbox)

When connected, MoneyOS may display:

- Account names, masks, balances (depository/credit/loan/investment types as returned)
- Transactions (normalized and categorized in-app)
- Future: recurring, liabilities, investments per Plaid product enablement

MoneyOS **does not** initiate ACH/wires or move money.

## Normalization & categorization

- Plaid amounts inverted to MoneyOS convention (negative = outflow)
- `classifyTransaction()` separates spending, income, transfers, payments, and review items
- Prevents sandbox transfers/payments from inflating “Review” spending totals

## Pre-production checklist

See `PRODUCTION_READINESS_CHECKLIST.md` for full Plaid remediation mapping.

## Do not

- Store Plaid access tokens in `localStorage` or client state
- Return `access_token` from API routes
- Enable Plaid production without encrypted storage + auth + policies signed off
