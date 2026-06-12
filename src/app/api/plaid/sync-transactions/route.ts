import { NextResponse } from "next/server";
import {
  describePlaidError,
  getPlaidClient,
  getPlaidConfig,
} from "@/lib/plaid/client";

// POST /api/plaid/sync-transactions  { access_token?, cursor? }
// Syncs transactions via Plaid's `transactions/sync`. When env vars are
// missing it returns a safe "mock" response so the spending dashboard can keep
// using local mock data without crashing.
//
// SAFETY: a real access_token would be supplied/looked up server-side only and
// never read from the client. We do not persist anything in this phase.
export async function POST(request: Request) {
  const config = getPlaidConfig();
  const client = getPlaidClient();

  if (!config || !client) {
    return NextResponse.json({
      configured: false,
      source: "mock",
      message:
        "Plaid sandbox not configured. The spending dashboard is using local mock transactions.",
    });
  }

  let accessToken: string | undefined;
  let cursor: string | undefined;
  try {
    const body = await request.json();
    accessToken = body?.access_token;
    cursor = body?.cursor;
  } catch {
    // ignore — handled below
  }

  if (!accessToken) {
    return NextResponse.json({
      configured: true,
      source: "plaid_sandbox",
      message:
        "Connected, but no access_token provided. Connect an item first to sync transactions.",
    });
  }

  try {
    const response = await client.transactionsSync({
      access_token: accessToken,
      cursor,
    });
    const { added, modified, removed, next_cursor, has_more } = response.data;
    return NextResponse.json({
      configured: true,
      source: "plaid_sandbox",
      added,
      modified,
      removed,
      next_cursor,
      has_more,
    });
  } catch (error) {
    return NextResponse.json(
      {
        configured: true,
        error: "Failed to sync transactions.",
        detail: describePlaidError(error),
      },
      { status: 502 },
    );
  }
}
