<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Cursor Cloud specific instructions

MoneyOS is a single-service Next.js 16 (App Router) + React 19 app with a local SQLite database via Prisma. There is no separate backend; API logic lives in `src/app/api/*/route.ts` and the dashboard is the server component `src/app/page.tsx`.

Standard scripts are in `package.json` (`dev`, `build`, `lint`, `db:push`, `db:seed`). Non-obvious caveats:

- The SQLite DB file is git-ignored, so it does NOT exist on a fresh clone. Before running `dev`/`build`/tests, create and seed it once: `npm run db:push` then `npm run db:seed`. The startup update script only installs deps (which runs `prisma generate`); it intentionally does not create/seed the DB.
- `DATABASE_URL` lives in a committed `.env` (`file:./dev.db`) — it is a path, not a secret, so it is intentionally not git-ignored.
- `npm run db:seed` is idempotent: it clears all tables (`deleteMany`) and re-inserts demo data, so use it to get back to a clean state. Avoid `prisma db push --force-reset` / `npm run db:reset` — Prisma blocks it for AI agents without explicit user consent.
- `src/app/page.tsx` sets `export const dynamic = "force-dynamic"` so the dashboard is never prerendered at build time (it queries the DB at request time). `next build` therefore succeeds without a populated DB, but the running app still needs the DB.
- Dev server runs at `http://localhost:3000`. After mutating data through the API, the client calls `router.refresh()` to re-render the server component.
