import { NextResponse } from "next/server";
import { getOptionalAuthUser } from "@/lib/auth/session";
import { getBalanceRefreshQuota } from "@/lib/db/balance-refresh-events";
import { resolvePlaidStorageContext } from "@/lib/plaid/storage-mode";
import { validateLivePlaidAccess } from "@/lib/plaid/live-mode";

// GET /api/plaid/balance-refresh-quota
export async function GET() {
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
        message: "Database persistence is required.",
      },
      { status: 403 },
    );
  }

  const quota = await getBalanceRefreshQuota(storage.userId);
  return NextResponse.json({ ok: true, quota });
}
