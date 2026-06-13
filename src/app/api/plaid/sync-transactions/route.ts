import { NextResponse } from "next/server";
import type { Transaction } from "plaid";
import {
  describePlaidError,
  getPlaidClient,
  getPlaidConfig,
} from "@/lib/plaid/client";
import { getPlaidSession, updatePlaidSync } from "@/lib/plaid/token-store";
import { normalizeTransaction } from "@/lib/plaid/normalize";

// POST /api/plaid/sync-transactions
// Uses Plaid `transactions/sync` with the server-side access token, normalizes
// results into MoneyOS MoneyTransaction shape (source = plaid_sandbox), and
// returns them. The access token is never sent to the client.
//
// SAFETY: when Plaid env vars are missing, this returns a safe "mock" response
// so the spending dashboard keeps working without crashing.
export async function POST() {
  const config = getPlaidConfig();
  const client = getPlaidClient();

  if (!config || !client) {
    return NextResponse.json({
      configured: false,
      connected: false,
      source: "mock",
      message:
        "Plaid sandbox not configured. The spending dashboard is using local mock transactions.",
    });
  }

  const session = getPlaidSession();
  if (!session) {
    return NextResponse.json({
      configured: true,
      connected: false,
      source: "mock",
      message: "Connect a sandbox bank first to sync transactions.",
    });
  }

  try {
    const added: Transaction[] = [];
    let cursor = session.cursor ?? undefined;
    let hasMore = true;
    // Drain pages (bounded) so the first sync pulls the full sandbox history.
    let guard = 0;
    while (hasMore && guard < 10) {
      const res = await client.transactionsSync({
        access_token: session.accessToken,
        cursor,
      });
      added.push(...res.data.added);
      cursor = res.data.next_cursor;
      hasMore = res.data.has_more;
      guard += 1;
    }

    const lastSyncAt = new Date().toISOString();
    updatePlaidSync(cursor ?? null, lastSyncAt);

    const transactions = added.map(normalizeTransaction);

    return NextResponse.json({
      configured: true,
      connected: true,
      source: "plaid_sandbox",
      transactions,
      count: transactions.length,
      lastSyncAt,
    });
  } catch (error) {
    return NextResponse.json(
      {
        configured: true,
        connected: true,
        source: "plaid_sandbox",
        error: "Failed to sync transactions from Plaid.",
        detail: describePlaidError(error),
      },
      { status: 502 },
    );
  }
}
