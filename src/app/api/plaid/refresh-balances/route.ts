import { NextResponse } from "next/server";
import { getOptionalAuthUser } from "@/lib/auth/session";
import {
  getBalanceRefreshQuota,
  markBalanceRefreshFailed,
  markBalanceRefreshSuccess,
  recordBalanceRefreshAttempt,
} from "@/lib/db/balance-refresh-events";
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

  const quotaBefore = await getBalanceRefreshQuota(storage.userId);
  if (quotaBefore.remaining <= 0) {
    return NextResponse.json(
      {
        ok: false,
        errorCode: "quota_exceeded",
        message: "Daily refresh limit reached.",
        quota: quotaBefore,
      },
      { status: 429 },
    );
  }

  const attempt = await recordBalanceRefreshAttempt({
    userId: storage.userId,
    plaidItemId,
    environment: "production",
  });

  try {
    const result = await refreshPlaidBalancesForUser(
      storage.userId,
      plaidItemId,
      { force: true },
    );

    if (result.refreshed > 0) {
      await markBalanceRefreshSuccess(attempt.id);
    } else {
      await markBalanceRefreshFailed(attempt.id, "no_live_items");
    }

    const quota = await getBalanceRefreshQuota(storage.userId);

    return NextResponse.json({
      ok: true,
      refreshed: result.refreshed,
      lastBalanceRefreshAt: result.lastBalanceRefreshAt,
      quota,
      message:
        result.refreshed > 0
          ? "Live balances refreshed."
          : "No live Plaid items were available to refresh.",
    });
  } catch (error) {
    await markBalanceRefreshFailed(
      attempt.id,
      error instanceof Error ? "refresh_failed" : "unknown",
    );

    return NextResponse.json(
      {
        ok: false,
        errorCode: "refresh_failed",
        message:
          error instanceof Error
            ? error.message
            : "Could not refresh balances.",
        quota: await getBalanceRefreshQuota(storage.userId),
      },
      { status: 502 },
    );
  }
}
