import { NextResponse } from "next/server";
import {
  describePlaidError,
  getPlaidClient,
  getPlaidConfig,
} from "@/lib/plaid/client";
import { setPlaidSession } from "@/lib/plaid/token-store";

// POST /api/plaid/exchange-public-token  { public_token }
// Exchanges a public token for an access token ENTIRELY server-side.
//
// SAFETY: the resulting access_token is NEVER returned to the client and is
// NOT persisted in this phase. In a real deployment it would be stored in a
// secure server-side secret store / database — never in localStorage.
export async function POST(request: Request) {
  const config = getPlaidConfig();
  const client = getPlaidClient();

  if (!config || !client) {
    return NextResponse.json({
      configured: false,
      message:
        "Plaid sandbox not configured yet. Add credentials to .env.local to enable token exchange.",
    });
  }

  let publicToken: string | undefined;
  try {
    const body = await request.json();
    publicToken = body?.public_token;
  } catch {
    // fall through to validation below
  }

  if (!publicToken) {
    return NextResponse.json(
      { configured: true, error: "public_token is required." },
      { status: 400 },
    );
  }

  try {
    const response = await client.itemPublicTokenExchange({
      public_token: publicToken,
    });

    // The access_token stays on the SERVER. We store it in a dev-only in-memory
    // store (see token-store.ts). It is NEVER returned to the client or written
    // to localStorage. (Production requires encrypted DB storage + auth.)
    setPlaidSession({
      accessToken: response.data.access_token,
      itemId: response.data.item_id,
      cursor: null,
      lastSyncAt: null,
    });

    return NextResponse.json({
      configured: true,
      ok: true,
      item_id: response.data.item_id,
      note: "access_token was exchanged and stored server-side only (never sent to the client).",
    });
  } catch (error) {
    return NextResponse.json(
      {
        configured: true,
        error: "Failed to exchange public token.",
        detail: describePlaidError(error),
      },
      { status: 502 },
    );
  }
}
