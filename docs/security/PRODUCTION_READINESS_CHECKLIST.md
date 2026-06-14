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
| Encryption at rest | 🔲 | Encrypted Postgres + token field encryption |
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
