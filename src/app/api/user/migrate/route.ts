import { Prisma } from "@prisma/client";
import { requireAuthUser } from "@/lib/auth/session";
import { importConsentRecordsForUser } from "@/lib/db/consent";
import {
  getAccountDomainCountsFromDb,
  importUserDataBundle,
  loadUserDataBundle,
  recordAccountMigration,
  updateUserProfile,
  type MigrationCounts,
} from "@/lib/db/users";
import { countBundleRecords } from "@/lib/sync/account-data-utils";

type MigrationAction = "save_local" | "merge_local" | "keep_local" | "use_account";

function isMigrationTimeoutError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2028"
  );
}

function migrationErrorResponse(error: unknown) {
  if (isMigrationTimeoutError(error)) {
    return Response.json(
      {
        success: false,
        errorCode: "migration_timeout",
        message:
          "Migration took too long. Your local data is still safe on this device. Try again or keep local only.",
      },
      { status: 503 },
    );
  }

  const message =
    error instanceof Error ? error.message : "Migration failed unexpectedly.";

  return Response.json(
    {
      success: false,
      errorCode: "migration_failed",
      message,
    },
    { status: 500 },
  );
}

function toResultCounts(counts: MigrationCounts) {
  return {
    bills: counts.bills,
    incomeSources: counts.incomeSources,
    subscriptions: counts.subscriptions,
    alerts: counts.alerts,
    manualAccounts: counts.manualAccounts,
    spendingLater: counts.spendingLater,
    weeklyReviews: counts.weeklyReviews,
    skippedDuplicates: counts.skippedDuplicates,
  };
}

export async function POST(request: Request) {
  const auth = await requireAuthUser();
  if (!auth.ok) {
    return Response.json(auth.body, { status: auth.status });
  }

  let body: {
    action?: MigrationAction;
    deviceFingerprint?: string;
    data?: {
      appMode?: string;
      bills?: unknown[];
      income?: unknown[];
      subscriptions?: unknown[];
      alerts?: unknown[];
      manualAccounts?: unknown[];
      spendingLater?: unknown[];
      weeklyReviews?: unknown[];
      consentHistory?: {
        consentType: string;
        acceptedAt: string;
        version: string;
        textSummary: string;
        dataScopes: string[];
        plaidProducts?: string[];
      }[];
    };
  };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json(
      { success: false, errorCode: "invalid_json", message: "Invalid request body." },
      { status: 400 },
    );
  }

  const action = body.action;
  if (
    !action ||
    !["save_local", "merge_local", "keep_local", "use_account"].includes(action)
  ) {
    return Response.json(
      { success: false, errorCode: "invalid_action", message: "Invalid migration action." },
      { status: 400 },
    );
  }

  if (action === "save_local" || action === "merge_local") {
    if (!body.data) {
      return Response.json(
        {
          success: false,
          errorCode: "missing_payload",
          message: "Missing local data payload.",
        },
        { status: 400 },
      );
    }

    try {
      const beforeCounts = await getAccountDomainCountsFromDb(auth.user.userId);
      const localCounts = countBundleRecords({
        bills: body.data.bills as never[],
        income: body.data.income as never[],
        subscriptions: body.data.subscriptions as never[],
        alerts: body.data.alerts as never[],
        manualAccounts: body.data.manualAccounts as never[],
        spendingLater: body.data.spendingLater as never[],
      });

      const counts: MigrationCounts = await importUserDataBundle(
        auth.user.userId,
        {
          appMode: body.data.appMode,
          bills: body.data.bills ?? [],
          income: body.data.income ?? [],
          subscriptions: body.data.subscriptions ?? [],
          alerts: body.data.alerts ?? [],
          manualAccounts: body.data.manualAccounts ?? [],
          spendingLater: body.data.spendingLater ?? [],
          weeklyReviews: body.data.weeklyReviews ?? [],
        },
      );

      counts.consentRecords = await importConsentRecordsForUser(
        auth.user.userId,
        (body.data.consentHistory ?? []).map((consent) => ({
          consentType: consent.consentType as "plaid_link",
          acceptedAt: consent.acceptedAt,
          version: consent.version,
          textSummary: consent.textSummary,
          dataScopes: consent.dataScopes,
          plaidProducts: consent.plaidProducts,
        })),
      );

      const afterCounts = await getAccountDomainCountsFromDb(auth.user.userId);
      const deviceFingerprint =
        body.deviceFingerprint ??
        `local-${localCounts.bills}-${localCounts.subscriptions}-${localCounts.income}`;

      await recordAccountMigration({
        userId: auth.user.userId,
        deviceFingerprint,
        beforeCounts,
        afterCounts,
        resultCounts: counts,
      });

      const mergedTotal =
        counts.bills +
        counts.incomeSources +
        counts.subscriptions +
        counts.alerts +
        counts.manualAccounts +
        counts.spendingLater +
        counts.weeklyReviews;

      const localTotal =
        localCounts.bills +
        localCounts.income +
        localCounts.subscriptions +
        localCounts.alerts +
        localCounts.manualAccounts +
        localCounts.spendingLater +
        (body.data.weeklyReviews?.length ?? 0);

      let warning: string | undefined;
      if (localTotal > 0 && mergedTotal === 0) {
        warning =
          "No local records were found or the local data format did not match expected records.";
      }

      return Response.json({
        success: true,
        action,
        migrated: true,
        counts: toResultCounts(counts),
        beforeCounts,
        afterCounts,
        warning,
        message:
          counts.skippedDuplicates > 0
            ? `Merged with ${counts.skippedDuplicates} duplicate record${counts.skippedDuplicates === 1 ? "" : "s"} skipped. Account records were kept.`
            : warning ??
              "Local data merged into your MoneyOS account.",
      });
    } catch (error) {
      console.error("[migrate] save_local failed", {
        userId: auth.user.userId,
        code:
          error instanceof Prisma.PrismaClientKnownRequestError
            ? error.code
            : "unknown",
        message: error instanceof Error ? error.message : "unknown",
      });
      return migrationErrorResponse(error);
    }
  }

  if (action === "use_account") {
    try {
      const accountData = await loadUserDataBundle(auth.user.userId);
      await updateUserProfile(auth.user.userId, {
        migrationCompletedAt: new Date(),
      });
      return Response.json({
        success: true,
        action,
        accountData,
      });
    } catch (error) {
      return migrationErrorResponse(error);
    }
  }

  try {
    await updateUserProfile(auth.user.userId, {
      migrationCompletedAt: new Date(),
    });
    return Response.json({ success: true, action, migrated: false });
  } catch (error) {
    return migrationErrorResponse(error);
  }
}
