# Secret rotation guide

**Status:** Required if secrets were ever committed to Git  
**Product:** MoneyOS

## Why this matters

A **private Git repository is not a safe place for secrets**. Anyone with repo access, CI logs, forks, backups, or a future accidental public exposure can read committed history — even after files are deleted in a later commit.

**If `.env`, `.env.local`, or any file containing real credentials was committed, treat those values as exposed.** Rotating them is not optional.

## Stop tracking env files (keep local copies)

Remove env files from Git index without deleting them from disk:

```bash
git rm --cached .env .env.local
git commit -m "Stop tracking local env files"
```

Verify nothing sensitive remains tracked:

```bash
git ls-files | rg '^\.env'
# Expected: .env.example only
```

Or run the hygiene script:

```bash
bash scripts/check-secrets-hygiene.sh
```

## What to rotate if committed

Rotate **all** values that appeared in committed env files:

| Service | Env vars | Where to rotate |
|---------|----------|-----------------|
| **Plaid** | `PLAID_CLIENT_ID`, `PLAID_SECRET` | [Plaid Dashboard](https://dashboard.plaid.com/) → Keys |
| **Clerk** | `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` | [Clerk Dashboard](https://dashboard.clerk.com/) → API Keys |
| **Google Gemini** | `GEMINI_API_KEY` | [Google AI Studio](https://aistudio.google.com/) → API keys |
| **Neon Postgres** | `DATABASE_URL` | [Neon Console](https://console.neon.tech/) → reset password / create new role |
| **Plaid token encryption** | `PLAID_TOKEN_ENCRYPTION_KEY` | Generate a new key locally; re-connect Plaid sandbox items (old ciphertext cannot be decrypted with a new key) |

After rotation:

1. Update **local** `.env.local` only (never commit it).
2. Update **deployment platform** environment variables (Vercel, Railway, etc.).
3. Restart the dev server (`npm run dev`) so Next.js picks up new values.
4. Re-run `npm run db:push` only if schema changed — not required for key rotation alone.

## Safe env file practices

| File | Commit? | Purpose |
|------|---------|---------|
| `.env.example` | ✅ Yes | Placeholder template with **no real values** |
| `.env.local` | ❌ Never | Local development secrets (Next.js loads automatically) |
| `.env` | ❌ Never | Optional root file for Prisma CLI; prefer `npm run db:*` with `.env.local` |

**Rules:**

- Never commit `.env` or `.env.local`.
- Never paste real secrets into docs, issues, PRs, or chat logs.
- Use platform env vars in production — not files in the repo.
- Prefer `npm run db:push` / `db:studio` (they load `.env.local` via `dotenv-cli`) over duplicating `DATABASE_URL` into `.env`.

## Generate a new encryption key

```bash
openssl rand -base64 32
```

Set the output as `PLAID_TOKEN_ENCRYPTION_KEY` in `.env.local` and your deployment environment.

## If secrets reached shared history

1. Rotate all affected credentials immediately (above).
2. Consider using [GitHub secret scanning](https://docs.github.com/en/code-security/secret-scanning) and revoking leaked tokens reported by your provider.
3. For highly sensitive leaks, evaluate history rewriting (`git filter-repo`) — rotation alone is usually sufficient if done promptly.

## Related docs

- [Local env setup](../development/LOCAL_ENV_SETUP.md)
- [Database setup](../development/DATABASE_SETUP.md)
- [Plaid security notes](./PLAID_SECURITY_NOTES.md)
