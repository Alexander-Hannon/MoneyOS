import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth/session";
import { validateLivePlaidAccess } from "@/lib/plaid/live-mode";
import { listBalanceSnapshotsForUser } from "@/lib/db/balance-snapshots";

const MAX_DAYS = 730;

// GET /api/user/balance-history?environment=production|sandbox&days=365
// Returns recorded snapshots only, with display-safe account fields.
export async function GET(request: Request) {
  const auth = await requireAuthUser();
  if (!auth.ok) {
    return NextResponse.json(auth.body, { status: auth.status });
  }

  const url = new URL(request.url);
  const environment = url.searchParams.get("environment");
  if (environment !== "production" && environment !== "sandbox") {
    return NextResponse.json(
      { ok: false, errorCode: "invalid_environment", message: "environment must be production or sandbox." },
      { status: 400 },
    );
  }

  if (environment === "production") {
    const live = validateLivePlaidAccess({ user: auth.user, targetEnvironment: "production" });
    if (!live.ok) {
      return NextResponse.json(
        { ok: false, errorCode: live.errorCode, message: live.message },
        { status: 403 },
      );
    }
  }

  const daysParam = Number(url.searchParams.get("days") ?? 365);
  const days = Number.isFinite(daysParam) ? Math.min(Math.max(1, Math.round(daysParam)), MAX_DAYS) : 365;
  const since = new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);

  try {
    const { accounts, snapshots } = await listBalanceSnapshotsForUser({
      userId: auth.user.userId,
      source: environment === "production" ? "plaid_live" : "plaid_sandbox",
      sinceDate: since,
    });
    return NextResponse.json({
      ok: true,
      environment,
      accounts,
      snapshots: snapshots.map((s) => ({
        accountId: s.accountId,
        accountType: s.accountType,
        snapshotDate: s.snapshotDate,
        currentBalance: s.currentBalance,
        availableBalance: s.availableBalance,
      })),
    });
  } catch {
    return NextResponse.json(
      { ok: false, errorCode: "history_unavailable", message: "Balance history could not be loaded." },
      { status: 500 },
    );
  }
}
