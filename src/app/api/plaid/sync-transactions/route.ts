import { NextResponse } from "next/server";
import type { Transaction } from "plaid";
import {
  describePlaidError,
  getPlaidClient,
  getPlaidConfig,
} from "@/lib/plaid/client";
import { getPlaidSession, updatePlaidSync } from "@/lib/plaid/token-store";
import { normalizePlaidTransaction } from "@/lib/plaid/normalize";
import { resolvePlaidStorageContext } from "@/lib/plaid/storage-mode";
import {
  loadPersistedPlaidDataForUser,
  syncAllPlaidItemsForUser,
  syncPlaidItemForUser,
} from "@/lib/plaid/sync-service";
import { countActivePlaidItemsForUser } from "@/lib/db/plaid-items";

// POST /api/plaid/sync-transactions  { plaidItemId?: string }
export async function POST(request: Request) {
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

  let plaidItemId: string | undefined;
  try {
    const body = await request.json();
    plaidItemId =
      typeof body?.plaidItemId === "string" ? body.plaidItemId : undefined;
  } catch {
    // optional body
  }

  const storage = await resolvePlaidStorageContext();

  if (storage.mode === "database" && storage.userId) {
    const activeCount = await countActivePlaidItemsForUser(storage.userId);
    if (activeCount === 0) {
      return NextResponse.json({
        configured: true,
        connected: false,
        storageMode: "database",
        source: "mock",
        message: "Connect a sandbox bank first to sync transactions.",
      });
    }

    try {
      if (plaidItemId) {
        await syncPlaidItemForUser(storage.userId, plaidItemId);
      } else {
        await syncAllPlaidItemsForUser(storage.userId);
      }

      const data = await loadPersistedPlaidDataForUser(storage.userId);
      return NextResponse.json({
        configured: true,
        connected: true,
        storageMode: "database",
        source: "plaid_sandbox",
        transactions: data.transactions,
        count: data.transactions.length,
        lastSyncAt: data.lastSyncAt,
      });
    } catch (error) {
      return NextResponse.json(
        {
          configured: true,
          connected: true,
          storageMode: "database",
          source: "plaid_sandbox",
          error: "Failed to sync persisted Plaid sandbox data.",
          detail: describePlaidError(error),
        },
        { status: 502 },
      );
    }
  }

  const session = getPlaidSession();
  if (!session) {
    return NextResponse.json({
      configured: true,
      connected: false,
      storageMode: "memory",
      source: "mock",
      message: "Connect a sandbox bank first to sync transactions.",
    });
  }

  try {
    const added: Transaction[] = [];
    let cursor = session.cursor ?? undefined;
    let hasMore = true;
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

    const transactions = added.map(normalizePlaidTransaction);

    return NextResponse.json({
      configured: true,
      connected: true,
      storageMode: "memory",
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
        storageMode: "memory",
        source: "plaid_sandbox",
        error: "Failed to sync transactions from Plaid.",
        detail: describePlaidError(error),
      },
      { status: 502 },
    );
  }
}
