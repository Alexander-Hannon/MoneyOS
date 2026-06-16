# Multi-device local setup

MoneyOS is often developed on **more than one machine** (laptop + desktop). This guide explains how to keep local environments consistent without committing secrets.

## Golden rules

1. **Each machine needs its own `.env.local` and `.env` files** — copy from `.env.example`, never from Git.
2. **Never commit** `.env` or `.env.local`.
3. **Restart `npm run dev`** after any env change.
4. **Back up secrets in a password manager**, not in the repo or chat.

## Shared Neon database (recommended for multi-device)

If laptop and desktop point at the **same `DATABASE_URL`** (same Neon project):

| Variable | Must match across devices? | Why |
|----------|----------------------------|-----|
| `DATABASE_URL` | Yes (same DB) | Shared user data, Plaid items, transactions |
| `PLAID_TOKEN_ENCRYPTION_KEY` | **Yes — critical** | Plaid access tokens are encrypted at rest; a different key cannot decrypt tokens written by another device |
| `CLERK_SECRET_KEY` / publishable key | Yes (same Clerk app) | Same user accounts |
| `PLAID_CLIENT_ID` / `PLAID_SECRET` | Yes (same Plaid sandbox app) | Same sandbox institution links |
| `GEMINI_API_KEY` | Yes (if using Gemini) | Same AI provider access |

### Encryption key across devices

Plaid sandbox tokens stored in Postgres use **AES-256-GCM** with `PLAID_TOKEN_ENCRYPTION_KEY`.

- **Same Neon DB → same encryption key on every device.**
- If Device A connects a bank and Device B uses a different key, decrypt will fail and Plaid sync will break.
- MoneyOS Settings → **Environment diagnostics** (dev only) warns when decrypt fails or when a shared database is detected without a verifiable match.

Generate once, then copy the value to every machine:

```bash
openssl rand -base64 32
```

Store it in `.env.local` on each device (and in your password manager).

## Separate databases per device

If each machine uses its **own** Neon database (or no database):

- `PLAID_TOKEN_ENCRYPTION_KEY` can differ per device.
- Plaid connections and persisted data will **not** sync between machines.
- Local/demo mode (`localStorage`) remains per-browser regardless.

## Keeping `.env` and `.env.local` in sync on one machine

Next.js reads **`.env.local`** for the app. Prisma CLI reads **`.env`** by default.

Recommended on each machine:

```bash
cp .env.example .env.local
# fill in .env.local
cp .env.local .env
```

Or use npm scripts that load `.env.local` for Prisma:

```bash
npm run db:push
npm run db:studio
```

See [LOCAL_ENV_SETUP.md](./LOCAL_ENV_SETUP.md) and [DATABASE_SETUP.md](./DATABASE_SETUP.md).

## Syncing env between laptop and desktop

1. Export values from your password manager (not email/Slack).
2. Paste into `.env.local` on the target machine.
3. Run `cp .env.local .env` if you use bare Prisma commands.
4. Run `bash scripts/check-secrets-hygiene.sh` — only `.env.example` should be tracked.
5. Restart the dev server.

**Do not** copy `.env.local` via Git, iCloud Drive sync of the repo, or screenshots.

## After env rotation

If secrets were committed or exposed, rotate **all** affected keys. See [SECRET_ROTATION.md](../security/SECRET_ROTATION.md).

After rotation:

1. Update `.env.local` on **every** device.
2. Restart `npm run dev` on each device.
3. Re-connect Plaid sandbox if encryption key changed (old ciphertext is unreadable).
4. Check Settings → Environment diagnostics and `GET /api/plaid/status`.

## Troubleshooting Plaid link token (502 / 503)

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| `plaid_config_missing` | No `PLAID_CLIENT_ID` / `PLAID_SECRET` | Add to `.env.local`, restart dev |
| `plaid_config_invalid` | Wrong `PLAID_ENV`, products, or country codes | Use `PLAID_ENV=sandbox`, `PLAID_PRODUCTS=transactions`, restart dev |
| `plaid_api_error` + `INVALID_API_KEYS` | Rotated or wrong Plaid secret | Update keys in Plaid Dashboard → `.env.local` |
| Decrypt failed warning | Encryption key mismatch across devices | Use identical `PLAID_TOKEN_ENCRYPTION_KEY` on all machines sharing Neon |

Useful checks:

```bash
curl -s http://localhost:3000/api/plaid/status | jq .
curl -s -X POST http://localhost:3000/api/plaid/create-link-token | jq .
```

## Related docs

- [Local env setup](./LOCAL_ENV_SETUP.md)
- [Secret rotation](../security/SECRET_ROTATION.md)
- [Database setup](./DATABASE_SETUP.md)
