// ============================================================================
// DEV-ONLY in-memory Plaid session store.
// ============================================================================
//
// SECURITY / SCOPE:
// - This holds the Plaid SANDBOX access_token on the SERVER ONLY. It is never
//   sent to the client and never written to localStorage.
// - It is intentionally simple: a single in-memory session for one local user.
//   It is lost on server restart and is NOT multi-user safe.
//
// 🚧 BEFORE REAL/LIVE USAGE this MUST be replaced with:
//   - An encrypted database (access tokens encrypted at rest), AND
//   - Real user authentication so each user only sees their own items.
//   Do NOT ship live Plaid with this in-memory store.
//
// We attach the store to `globalThis` so it survives Next.js hot-reloads in
// development (module re-evaluation would otherwise wipe it).

export interface PlaidSession {
  accessToken: string;
  itemId: string;
  /** transactions/sync cursor for incremental syncs. */
  cursor: string | null;
  lastSyncAt: string | null;
}

const globalForPlaid = globalThis as unknown as {
  __moneyosPlaidSession?: PlaidSession | null;
};

export function setPlaidSession(session: PlaidSession): void {
  globalForPlaid.__moneyosPlaidSession = session;
}

export function getPlaidSession(): PlaidSession | null {
  return globalForPlaid.__moneyosPlaidSession ?? null;
}

export function hasPlaidSession(): boolean {
  return getPlaidSession() !== null;
}

export function updatePlaidSync(cursor: string | null, lastSyncAt: string): void {
  const current = getPlaidSession();
  if (!current) return;
  globalForPlaid.__moneyosPlaidSession = { ...current, cursor, lastSyncAt };
}

export function clearPlaidSession(): void {
  globalForPlaid.__moneyosPlaidSession = null;
}
