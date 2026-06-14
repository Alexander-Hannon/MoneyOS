# Secure Storage Plan (Technical Draft)

**Product:** MoneyOS  
**Status:** Planning document — not implemented  
**Goal:** Replace dev-only in-memory Plaid token store with production-safe persistence

## Problem

Today, Plaid sandbox `access_token` values live in `globalThis.__moneyosPlaidSession` (see `src/lib/plaid/token-store.ts`). This is acceptable for **local sandbox development only** and fails requirements for:

- Multi-user isolation
- Durability across restarts
- Encryption at rest
- Audit and deletion compliance

## Target architecture

```
User (browser)
  → Auth provider session (Clerk / Auth0 / Supabase / Cognito)
  → Next.js API routes (authenticated)
  → Postgres (encrypted at rest)
      ├── users
      ├── plaid_items (encrypted access_token, item_id, cursor, institution)
      ├── consent_records
      └── audit_events
```

## Auth provider (choose one)

| Provider | Pros | Considerations |
|----------|------|----------------|
| **Clerk** | Fast Next.js integration, MFA built-in | Cost at scale |
| **Auth0** | Mature, Plaid-friendly enterprise story | Config complexity |
| **Supabase Auth** | Auth + Postgres in one stack | RLS design required |
| **Cognito** | AWS-native | More ops overhead |

**Recommendation for solo founder:** Clerk or Supabase Auth for speed; enforce **MFA before Plaid Link**.

## Database

- **Postgres** (Neon, Supabase, RDS, or Cloud SQL)
- **Encryption at rest** enabled at provider level
- **Application-level encryption** for `access_token` column (AES-256-GCM with KMS-managed key)

### Suggested schema (minimal)

```sql
-- users.id maps to auth provider subject

create table plaid_items (
  id uuid primary key,
  user_id text not null references users(id) on delete cascade,
  item_id text not null,
  access_token_encrypted bytea not null,
  cursor text,
  institution_name text,
  last_sync_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, item_id)
);

create table consent_records (
  id uuid primary key,
  user_id text not null,
  policy_version text not null,
  consented_at timestamptz not null default now(),
  ip_hash text,
  user_agent text
);

create table audit_events (
  id uuid primary key,
  user_id text,
  action text not null,
  metadata jsonb,
  created_at timestamptz not null default now()
);
```

## Token handling

1. Exchange `public_token` → `access_token` server-side only.
2. Encrypt token immediately; store ciphertext only.
3. Decrypt in memory per request; never log plaintext.
4. On disconnect: delete row + call Plaid `/item/remove` when in production.

## Session management

- HTTP-only secure cookies for app session (via auth provider)
- Short session TTL + refresh rotation
- CSRF protection on state-changing routes

## Audit logging

Log (without sensitive payloads):

- `plaid.link.started` / `plaid.link.completed`
- `plaid.sync.completed` (count, duration)
- `plaid.disconnect`
- `user.data_deleted`

## Deletion workflow

1. Authenticated **Delete my account** request
2. Delete all `plaid_items` for user (cascade)
3. Call Plaid item removal for each item
4. Purge cached transactions if stored
5. Write audit event + confirmation email (optional)

## Migration from in-memory store

1. Introduce auth + user id on all Plaid routes
2. Implement Postgres `plaid_items` + encryption helper
3. On exchange-public-token: persist encrypted token keyed by `user_id`
4. Replace `getPlaidSession()` with `getPlaidSession(userId)` from DB
5. Keep in-memory store behind feature flag for local dev only
6. Remove `globalThis` store before production deploy

## Environment secrets

| Secret | Storage |
|--------|---------|
| `PLAID_CLIENT_ID` / `PLAID_SECRET` | Host secret manager |
| Token encryption key | KMS / provider secret |
| Database URL | Secret manager |
| Auth provider keys | Secret manager |

## Open items

- [ ] Pick auth provider
- [ ] Provision Postgres
- [ ] Implement encryption module
- [ ] Migrate API routes to per-user sessions
- [ ] Add consent + audit tables
- [ ] Load test sync with encrypted tokens

## Review

Planning document only — implementation tracked in Phase 7+ engineering work.
