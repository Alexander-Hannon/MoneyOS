# Production Readiness Checklist (Draft)

**Product:** MoneyOS  
**Phase:** Pre-production — sandbox development  
**Last updated:** Template for Phase 6

Use this checklist before enabling Plaid **production** or handling **live consumer financial data**.

## Plaid remediation alignment

| Item | Status | Evidence / next step |
|------|--------|----------------------|
| Access control policy | 🟡 Draft | `ACCESS_CONTROL_POLICY.md` |
| Automated de-provisioning or solo manual removal | 🟡 Draft | Document in access policy; implement auth offboarding |
| Centralized IAM plan | 🔲 | Choose Auth0/Clerk/Supabase/Cognito — see `SECURE_STORAGE_PLAN.md` |
| MFA on internal systems | 🔲 | Enable on GitHub, cloud, Plaid dashboard |
| Privacy policy | 🟡 Draft | `/privacy`, `docs/PRIVACY_POLICY_DRAFT.md` |
| Consumer app MFA before Plaid Link | 🔲 | Auth provider + enforce before Link |
| Consent tracking | 🟡 Partial | Consent modal before Link; log consent server-side |
| Information Security Policy | 🟡 Draft | `INFORMATION_SECURITY_POLICY.md` |
| Secure tokens/certificates | 🔲 | TLS certs via host; rotate API keys |
| Patch SLA | 🟡 Draft | `VULNERABILITY_MANAGEMENT_POLICY.md` |
| Encryption at rest | 🟡 | Postgres + AES-256-GCM for Plaid sandbox tokens when `PLAID_TOKEN_ENCRYPTION_KEY` set; KMS rotation plan still required for production |
| Zero-trust access architecture | 🔲 | IAM roles, no shared prod passwords |
| Periodic access reviews | 🟡 Draft | Quarterly checklist |
| Vulnerability scanning | 🔲 | CI SCA + optional DAST |
| Data deletion/retention policy | 🟡 Draft | `DATA_RETENTION_AND_DELETION_POLICY.md` |
| EOL software monitoring | 🔲 | Node LTS tracking in CI |

Legend: ✅ done · 🟡 scaffolded · 🔲 not started

## Application security

- [ ] Authentication on all routes that touch user data
- [ ] Plaid access tokens in encrypted database only
- [ ] Disconnect + full user data deletion API
- [ ] Server-side consent log (user id, timestamp, policy version)
- [ ] Structured audit logging (link, sync, disconnect, delete)
- [ ] Rate limiting on Plaid API routes
- [ ] Error responses never leak tokens or stack traces to clients
- [ ] `npm run lint` and `npm run build` in CI
- [ ] Dependency audit in CI

## Plaid integration

- [ ] Production Plaid keys in secure secret manager (not `.env` in repo)
- [ ] Webhook signature verification (when webhooks enabled)
- [ ] Item error / reauth handling (`reauth_required` status)
- [ ] Sandbox fully tested; production enablement separate approval

## Infrastructure

- [ ] HTTPS only
- [ ] Database backups + restore test
- [ ] Separate dev/staging/prod environments
- [ ] Incident response runbook tested (`INCIDENT_RESPONSE_PLAN.md`)

## Legal / UX

- [ ] Privacy policy and terms published
- [ ] Clear “not live bank data” labeling in sandbox
- [ ] User-visible disconnect and data deletion paths

## Honest statement

**MoneyOS does not yet meet production security or Plaid production requirements.** This checklist tracks gaps; completing it is required before live launch.

## Phase map (MoneyOS roadmap)

### Before personal live use (single operator)

- [ ] Authentication (even for solo use — protect deployed instance)
- [x] Encrypted server-side Plaid **sandbox** token storage (Phase 10 — auth + DB + `PLAID_TOKEN_ENCRYPTION_KEY`)
- [ ] HTTPS deployment (TLS everywhere)
- [ ] Real Plaid production connection (separate from sandbox; live mode disabled)
- [ ] Backup / export verified (local export exists; server backup TBD)
- [ ] Onboarding + mode selection (Phase 8 — local only)
- [ ] Settings: reset, export, disconnect (Phase 8 — local only)

### Before public beta

- [ ] Privacy policy finalized (legal review)
- [ ] Terms of use finalized (legal review)
- [ ] Consent tracking server-side (replace localStorage dev records)
- [ ] User data isolation (auth + per-user database)
- [ ] MFA on internal systems (GitHub, cloud, Plaid dashboard)
- [ ] Vulnerability scanning in CI
- [ ] Logging / monitoring (structured logs, alerts)
- [ ] Data deletion workflow (API + admin process)
- [ ] App modes: demo vs user vs sandbox clearly labeled (Phase 8)

### Before public launch

- [ ] Compliance review (Plaid + applicable privacy laws)
- [ ] Security review (internal or third-party)
- [ ] Incident response tested (`INCIDENT_RESPONSE_PLAN.md`)
- [ ] Support process documented
- [ ] Cost controls (AI API, Plaid, hosting)
- [ ] Rate limits on API routes
- [ ] Production Plaid approval complete
- [x] Personal live mode (Phase 12) — owner-only, env-gated, not public launch
- [ ] Public SaaS launch with full compliance/security review

## Phase 12 (personal live Plaid) — implemented

Private owner mode for real bank data. **Not** public beta or SaaS launch.

- [x] `MONEYOS_ENABLE_LIVE_PLAID` + `MONEYOS_ALLOWED_LIVE_USER_EMAIL` env gates
- [x] Production Link blocked without auth + DB + encryption + allowlisted user
- [x] Strong consent modal (checkbox + typed `CONNECT REAL DATA`)
- [x] `PlaidItem.environment` separation (sandbox vs production)
- [x] Encrypted tokens server-side only; no client/localStorage tokens
- [x] Balance refresh controls (manual + daily auto limit for live)
- [x] Disconnect with keep/delete history options
- [ ] Final compliance review before any public production release

## Phase 9 (auth + database foundation) — scaffolded

Phase 9 adds production-shaped foundations without requiring them for local development:

- [x] Clerk auth foundation (optional — app runs without env vars)
- [x] Prisma + Postgres schema and client (optional — `DATABASE_URL`)
- [x] User-specific database models (User, Bill, Income, Subscription, Alert, Consent, PlaidItem scaffold, Account/Transaction scaffold)
- [x] Database service layer scoped per authenticated user
- [x] API routes for signed-in user data (`/api/user/*`)
- [x] Local-to-account migration with user confirmation
- [x] Database-backed consent records when signed in
- [x] Settings: account, database status, sync to account

### Still missing before production

- [x] Encrypted Plaid sandbox token storage (Phase 10 — `PlaidItem.accessTokenEncrypted`, signed-in users only)
- [x] Auth provider integrated (Clerk — optional)
- [x] Personal live Plaid mode (Phase 12 — owner-only, env-gated)
- [ ] MFA enforcement for users and internal systems
- [ ] Production deployment hardening (HTTPS, secrets manager)
- [ ] Logging / monitoring
- [ ] Vulnerability scanning automation in CI
- [ ] Data deletion workflow (API + admin process)
- [ ] Final privacy / terms legal review

**MoneyOS remains usable locally without Clerk or DATABASE_URL configured.**
