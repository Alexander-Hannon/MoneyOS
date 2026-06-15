import { NextResponse } from "next/server";
import {
  describePlaidError,
  getPlaidClient,
  getPlaidConfig,
} from "@/lib/plaid/client";
import {
  PlaidPersistenceError,
  resolveInstitutionNameFromToken,
  storePlaidItemForUser,
} from "@/lib/plaid/persistent-items";
import { resolvePlaidStorageContext } from "@/lib/plaid/storage-mode";
import { setPlaidSession } from "@/lib/plaid/token-store";

// POST /api/plaid/exchange-public-token  { public_token }
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
    // fall through
  }

  if (!publicToken) {
    return NextResponse.json(
      { configured: true, error: "public_token is required." },
      { status: 400 },
    );
  }

  const storage = await resolvePlaidStorageContext();

  try {
    const response = await client.itemPublicTokenExchange({
      public_token: publicToken,
    });

    const accessToken = response.data.access_token;
    const itemId = response.data.item_id;
    const institution = await resolveInstitutionNameFromToken(accessToken);

    if (storage.mode === "database" && storage.userId) {
      try {
        const summary = await storePlaidItemForUser({
          userId: storage.userId,
          exchange: { item_id: itemId, access_token: accessToken },
          institutionId: institution.institutionId,
          institutionName: institution.institutionName,
        });

        return NextResponse.json({
          configured: true,
          ok: true,
          storageMode: "database",
          connected: true,
          item_id: itemId,
          plaidItemId: summary.plaidItemId,
          institutionName: summary.institutionName,
          accountCount: summary.accountCount,
          transactionCount: summary.transactionCount,
          lastSyncAt: summary.lastSyncAt,
          note: "Sandbox connection persisted with encrypted server-side token storage.",
        });
      } catch (error) {
        if (error instanceof PlaidPersistenceError) {
          return NextResponse.json(
            {
              configured: true,
              ok: false,
              storageMode: "database",
              error: error.message,
              code: error.code,
            },
            { status: 503 },
          );
        }
        throw error;
      }
    }

    setPlaidSession({
      accessToken,
      itemId,
      cursor: null,
      lastSyncAt: null,
    });

    return NextResponse.json({
      configured: true,
      ok: true,
      storageMode: "memory",
      connected: true,
      item_id: itemId,
      note: "access_token stored in dev-only server memory (not persisted). Sign in with database + encryption key to persist.",
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
