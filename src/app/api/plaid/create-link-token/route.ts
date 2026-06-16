import { NextResponse } from "next/server";
import type { CountryCode, Products } from "plaid";
import {
  getPlaidClientForEnvironment,
  getPlaidConfig,
  logPlaidError,
  parsePlaidApiError,
} from "@/lib/plaid/client";
import { getOptionalAuthUser } from "@/lib/auth/session";
import { resolvePlaidStorageContext } from "@/lib/plaid/storage-mode";
import { validateMoneyOSEnv } from "@/lib/env/validation";
import {
  parsePlaidLinkTarget,
  type PlaidLinkTarget,
} from "@/lib/plaid/plaid-env";
import { validateLivePlaidAccess } from "@/lib/plaid/live-mode";

// POST /api/plaid/create-link-token  { targetEnvironment?: "sandbox" | "production" }
export async function POST(request: Request) {
  const env = validateMoneyOSEnv();
  const storage = await resolvePlaidStorageContext();
  const authUser = await getOptionalAuthUser();

  let targetEnvironment: PlaidLinkTarget = "sandbox";
  try {
    const body = await request.json();
    const parsed = parsePlaidLinkTarget(body?.targetEnvironment);
    if (parsed) targetEnvironment = parsed;
  } catch {
    // default sandbox
  }

  const baseMeta = {
    storageMode: storage.mode,
    plaidEnv: env.plaidEnv,
    targetEnvironment,
    authConfigured: storage.authConfigured,
    databaseConfigured: storage.databaseConfigured,
    encryptionConfigured: storage.encryptionConfigured,
    livePlaidEnabled: env.livePlaidEnabled,
  };

  if (!env.plaidConfigured) {
    return NextResponse.json(
      {
        configured: false,
        errorCode: "plaid_config_missing",
        message:
          "Plaid is not configured. Add PLAID_CLIENT_ID and PLAID_SECRET to .env.local.",
        issues: env.issues.filter(
          (issue) =>
            issue.startsWith("plaid_client_id_") ||
            issue.startsWith("plaid_secret_"),
        ),
        ...baseMeta,
      },
      { status: 503 },
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
          ...baseMeta,
        },
        { status: 403 },
      );
    }
  } else if (!env.plaidConfigValid && env.plaidEnv === "production") {
    // Sandbox links still allowed when live mode uses production env — validate sandbox secret separately
    const sandboxClient = getPlaidClientForEnvironment("sandbox");
    if (!sandboxClient) {
      return NextResponse.json(
        {
          configured: false,
          errorCode: "plaid_config_invalid",
          message:
            "Sandbox Plaid client could not be initialized. Set PLAID_SANDBOX_SECRET or use PLAID_ENV=sandbox.",
          ...baseMeta,
        },
        { status: 503 },
      );
    }
  } else if (!env.plaidConfigValid) {
    return NextResponse.json(
      {
        configured: false,
        errorCode: "plaid_config_invalid",
        message:
          "Plaid environment variables are present but invalid. Check Settings → Environment Diagnostics.",
        issues: env.issues.filter((issue) => issue.startsWith("plaid_")),
        warnings: env.warnings,
        ...baseMeta,
      },
      { status: 503 },
    );
  }

  const config = getPlaidConfig();
  const client = getPlaidClientForEnvironment(targetEnvironment);

  if (!config || !client) {
    return NextResponse.json(
      {
        configured: false,
        errorCode: "plaid_config_missing",
        message: `Plaid client could not be initialized for ${targetEnvironment}.`,
        ...baseMeta,
      },
      { status: 503 },
    );
  }

  if (targetEnvironment === "production" && storage.mode !== "database") {
    return NextResponse.json(
      {
        configured: true,
        ok: false,
        errorCode: "database_required",
        message:
          "Sign in with database configured to connect real financial accounts.",
        ...baseMeta,
      },
      { status: 403 },
    );
  }

  try {
    const response = await client.linkTokenCreate({
      user: {
        client_user_id: authUser?.userId ?? "moneyos-local-user",
      },
      client_name: "MoneyOS",
      products: config.products as Products[],
      country_codes: config.countryCodes as CountryCode[],
      language: "en",
    });

    return NextResponse.json({
      configured: true,
      link_token: response.data.link_token,
      expiration: response.data.expiration,
      ...baseMeta,
    });
  } catch (error) {
    logPlaidError("create-link-token", error);
    const parsed = parsePlaidApiError(error);

    return NextResponse.json(
      {
        configured: true,
        errorCode: "plaid_api_error",
        message: "Plaid rejected the link token request.",
        plaidErrorType: parsed.plaidErrorType,
        plaidErrorCode: parsed.plaidErrorCode,
        plaidErrorMessage: parsed.plaidErrorMessage,
        requestId: parsed.requestId,
        ...baseMeta,
      },
      { status: 502 },
    );
  }
}
