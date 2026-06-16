import { NextResponse } from "next/server";
import { getOptionalAuthUser } from "@/lib/auth/session";
import { resolvePlaidStorageContext } from "@/lib/plaid/storage-mode";
import { refreshPlaidBalancesForUser } from "@/lib/plaid/sync-service";
import { validateLivePlaidAccess } from "@/lib/plaid/live-mode";

// POST /api/plaid/refresh-balances  { plaidItemId? }
export async function POST(request: Request) {
  const authUser = await getOptionalAuthUser();
  const liveCheck = validateLivePlaidAccess({
    user: authUser,
    targetEnvironment: "production",
  });

  if (!liveCheck.ok) {
    return NextResponse.json(
      {
        ok: false,
        errorCode: liveCheck.errorCode,
        message: liveCheck.message,
      },
      { status: 403 },
    );
  }

  const storage = await resolvePlaidStorageContext();
  if (storage.mode !== "database" || !storage.userId) {
    return NextResponse.json(
      {
        ok: false,
        errorCode: "database_required",
        message: "Database persistence is required to refresh live balances.",
      },
      { status: 403 },
    );
  }

  let plaidItemId: string | undefined;
  try {
    const body = await request.json();
    plaidItemId =
      typeof body?.plaidItemId === "string" ? body.plaidItemId : undefined;
  } catch {
    // optional
  }

  try {
    const result = await refreshPlaidBalancesForUser(
      storage.userId,
      plaidItemId,
      { force: true },
    );

    return NextResponse.json({
      ok: true,
      refreshed: result.refreshed,
      lastBalanceRefreshAt: result.lastBalanceRefreshAt,
      message:
        result.refreshed > 0
          ? "Balances refreshed from Plaid."
          : "Balances were refreshed within the last 24 hours. Use manual refresh to force update.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Could not refresh balances.",
      },
      { status: 502 },
    );
  }
}
