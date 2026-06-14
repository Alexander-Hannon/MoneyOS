# Database setup (Neon Postgres + Prisma)

MoneyOS uses **Prisma** with **PostgreSQL** (Neon-compatible). The database is **optional** — the app runs in localStorage mode when `DATABASE_URL` is not set.

## Environment files

| File | Read by | Purpose |
|------|---------|---------|
| `.env.local` | Next.js dev/build | App secrets including `DATABASE_URL`, Clerk, Plaid, AI |
| `.env` | Prisma CLI | Database URL for `prisma db push`, `prisma studio`, migrations |

**Important:** Next.js reads `.env.local` automatically. **Prisma CLI does not** — it loads `.env` from the project root by default, not `.env.local`.

### Recommended local workflow

1. Copy `.env.example` → `.env.local` and fill in values.
2. For Prisma commands, either:

   **Option A — use npm scripts (recommended)**

   ```bash
   npm run db:push
   npm run db:studio
   ```

   These load `.env.local` via `dotenv-cli`.

   **Option B — create a root `.env` file**

   ```bash
   echo 'DATABASE_URL="postgresql://..."' > .env
   npx prisma db push
   ```

   **Option C — export in your shell**

   ```bash
   export DATABASE_URL="postgresql://..."
   npx prisma db push
   ```

3. Never commit `.env` or `.env.local` — both are git-ignored.

## First-time database setup

```bash
# 1. Set DATABASE_URL in .env.local (Neon connection string)
# 2. Push schema to database
npm run db:push

# 3. (Optional) Open Prisma Studio
npm run db:studio
```

## Troubleshooting

### `Environment variable not found: DATABASE_URL`

Prisma CLI cannot see your URL. Fix:

1. Confirm `DATABASE_URL` exists in `.env.local`.
2. Run `npm run db:push` instead of bare `npx prisma db push`, **or**
3. Copy the `DATABASE_URL` line into a root `.env` file, **or**
4. `export DATABASE_URL=...` in your shell before running Prisma.

### Next.js works but Prisma does not

This is expected — different env loading. Use one of the options above.

## Scripts

| Script | Command |
|--------|---------|
| `npm run db:generate` | Generate Prisma client |
| `npm run db:push` | Push schema to database (loads `.env.local`) |
| `npm run db:studio` | Open Prisma Studio (loads `.env.local`) |

## Security

- Do not commit connection strings or secrets.
- Use separate Neon databases for dev/staging/production.
- Phase 9 does not yet persist Plaid access tokens in the database.
