import { NextResponse } from "next/server";
import {
  describePlaidError,
  getPlaidClientForEnvironment,
  getPlaidConfig,
} from "@/lib/plaid/client";
import {
  PlaidPersistenceError,
  resolveInstitutionNameFromToken,
  storePlaidItemForUser,
} from "@/lib/plaid/persistent-items";
import { resolvePlaidStorageContext } from "@/lib/plaid/storage-mode";
import { setPlaidSession } from "@/lib/plaid/token-store";
import { getOptionalAuthUser } from "@/lib/auth/session";
import {
  parsePlaidEnvironmentFromBody,
  type PlaidLinkTarget,
} from "@/lib/plaid/plaid-env";
import { validateLivePlaidAccess } from "@/lib/plaid/live-mode";

// POST /api/plaid/exchange-public-token  { public_token, environment? }
export async function POST(request: Request) {
  const config = getPlaidConfig();
  const authUser = await getOptionalAuthUser();

  if (!config) {
    return NextResponse.json({
      configured: false,
      message:
        "Plaid is not configured yet. Add credentials to .env.local to enable token exchange.",
    });
  }

  let publicToken: string | undefined;
  let targetEnvironment: PlaidLinkTarget = "sandbox";
  try {
    const body = await request.json();
    publicToken = body?.public_token;
    const parsed = parsePlaidEnvironmentFromBody(body);
    if (parsed) targetEnvironment = parsed;
  } catch {
    // fall through
  }

  if (!publicToken) {
    return NextResponse.json(
      { configured: true, error: "public_token is required." },
      { status: 400 },
    );
  }

  if (targetEnvironment === "production") {
    const liveCheck = validateLivePlaidAccess({
      user: authUser,
      targetEnvironment,
    });
    if (!liveCheck.ok) {
      return NextResponse.json(
        {
          configured: true,
          ok: false,
          errorCode: liveCheck.errorCode,
          message: liveCheck.message,
        },
        { status: 403 },
      );
    }
  }

  const client = getPlaidClientForEnvironment(targetEnvironment);
  if (!client) {
    return NextResponse.json(
      {
        configured: true,
        ok: false,
        error: `Plaid client not available for ${targetEnvironment}.`,
      },
      { status: 503 },
    );
  }

  const storage = await resolvePlaidStorageContext();

  if (targetEnvironment === "production") {
    if (storage.mode !== "database" || !storage.userId) {
      return NextResponse.json(
        {
          configured: true,
          ok: false,
          errorCode: "database_required",
          message:
            "Live Plaid requires signed-in database persistence.",
        },
        { status: 403 },
      );
    }
  }

  try {
    const response = await client.itemPublicTokenExchange({
      public_token: publicToken,
    });

    const accessToken = response.data.access_token;
    const itemId = response.data.item_id;
    const institution = await resolveInstitutionNameFromToken(
      accessToken,
      targetEnvironment,
    );

    if (storage.mode === "database" && storage.userId) {
      try {
        const summary = await storePlaidItemForUser({
          userId: storage.userId,
          exchange: { item_id: itemId, access_token: accessToken },
          institutionId: institution.institutionId,
          institutionName: institution.institutionName,
          environment: targetEnvironment,
        });

        return NextResponse.json({
          configured: true,
          ok: true,
          storageMode: "database",
          connected: true,
          targetEnvironment,
          source: summary.source,
          connectionKind: summary.connectionKind,
          item_id: itemId,
          plaidItemId: summary.plaidItemId,
          institutionName: summary.institutionName,
          accountCount: summary.accountCount,
          transactionCount: summary.transactionCount,
          lastSyncAt: summary.lastSyncAt,
          note:
            summary.connectionKind === "refreshed"
              ? "Existing bank connection refreshed."
              : targetEnvironment === "production"
                ? "New personal live bank connection added."
                : "New sandbox bank connection added.",
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

    if (targetEnvironment === "production") {
      return NextResponse.json(
        {
          configured: true,
          ok: false,
          errorCode: "database_required",
          message:
            "Live Plaid cannot use in-memory token storage. Sign in with database configured.",
        },
        { status: 403 },
      );
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
      targetEnvironment: "sandbox",
      source: "plaid_sandbox",
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
