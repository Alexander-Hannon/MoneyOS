# Access Control Policy (Draft)

**Status:** Template — development / sandbox phase  
**Product:** MoneyOS

## Scope

Defines who may access MoneyOS systems, code, secrets, and financial data integrations.

## Current state

MoneyOS is a **single-user private app** in development:

- No multi-user auth yet
- Plaid sandbox session is server-side in memory (one implicit local user)
- Repository and hosting access is controlled by the founder’s GitHub/cloud accounts

## Access principles

1. **Production financial data requires authenticated users** — each user sees only their data.
2. **Plaid secrets are server-only** — `PLAID_CLIENT_ID`, `PLAID_SECRET`, and access tokens are never exposed to clients.
3. **Separate environments** — development, staging, and production must use different credentials and databases.
4. **MFA on internal systems** — GitHub, cloud provider, database admin, and auth provider consoles.

## Access types

| System | Who needs access | Controls today | Production target |
|--------|------------------|----------------|-------------------|
| Source repo | Founder | GitHub MFA | GitHub MFA + branch protection |
| Cloud runtime | Founder | Cloud agent secrets | IAM roles, least privilege |
| Plaid Dashboard | Founder | Plaid account MFA | Plaid MFA + team policy |
| Database | N/A yet | N/A | Encrypted Postgres, app role only |
| Plaid tokens | Server process | In-memory dev store | Encrypted at rest, per-user |

## De-provisioning

**Solo-founder process (until IAM is centralized):**

1. Rotate compromised credentials immediately (Plaid secret, DB, auth provider).
2. Revoke cloud/GitHub tokens for lost devices.
3. Clear Plaid items via disconnect API + token deletion workflow.
4. Document incident in incident log.

**Production target:** automated de-provisioning tied to auth provider offboarding + periodic access reviews (quarterly).

## Periodic access reviews

- **Now:** manual checklist before each production milestone.
- **Production:** quarterly review of admin accounts, API keys, and Plaid dashboard users.

## Zero-trust direction

- No long-lived shared passwords
- Short-lived tokens where possible
- Network egress restrictions for production API routes
- Audit logging for token read/write and data export/deletion

## Review

Template only — must be reviewed before live consumer launch.
