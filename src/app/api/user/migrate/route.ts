import { Prisma } from "@prisma/client";
import { requireAuthUser } from "@/lib/auth/session";
import { importConsentRecordsForUser } from "@/lib/db/consent";
import {
  importUserDataBundle,
  loadUserDataBundle,
  updateUserProfile,
  type MigrationCounts,
} from "@/lib/db/users";

type MigrationAction = "save_local" | "keep_local" | "use_account";

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

export async function POST(request: Request) {
  const auth = await requireAuthUser();
  if (!auth.ok) {
    return Response.json(auth.body, { status: auth.status });
  }

  let body: {
    action?: MigrationAction;
    data?: {
      appMode?: string;
      bills?: unknown[];
      income?: unknown[];
      subscriptions?: unknown[];
      alerts?: unknown[];
      manualAccounts?: unknown[];
      spendingLater?: unknown[];
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
  if (!action || !["save_local", "keep_local", "use_account"].includes(action)) {
    return Response.json(
      { success: false, errorCode: "invalid_action", message: "Invalid migration action." },
      { status: 400 },
    );
  }

  if (action === "save_local") {
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

      if (!body.data.appMode) {
        await updateUserProfile(auth.user.userId, {
          migrationCompletedAt: new Date(),
        });
      }

      return Response.json({
        success: true,
        action,
        migrated: true,
        counts,
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
