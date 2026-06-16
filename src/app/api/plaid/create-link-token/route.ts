import { NextResponse } from "next/server";
import type { CountryCode, Products } from "plaid";
import {
  getPlaidClient,
  getPlaidConfig,
  logPlaidError,
  parsePlaidApiError,
} from "@/lib/plaid/client";
import { getOptionalAuthUser } from "@/lib/auth/session";
import { resolvePlaidStorageContext } from "@/lib/plaid/storage-mode";
import { validateMoneyOSEnv } from "@/lib/env/validation";

// POST /api/plaid/create-link-token
export async function POST() {
  const env = validateMoneyOSEnv();
  const storage = await resolvePlaidStorageContext();
  const authUser = await getOptionalAuthUser();

  const baseMeta = {
    storageMode: storage.mode,
    plaidEnv: env.plaidEnv,
    environment: env.plaidEnv,
    authConfigured: storage.authConfigured,
    databaseConfigured: storage.databaseConfigured,
    encryptionConfigured: storage.encryptionConfigured,
  };

  if (!env.plaidConfigured) {
    return NextResponse.json(
      {
        configured: false,
        errorCode: "plaid_config_missing",
        message:
          "Plaid sandbox is not configured. Add PLAID_CLIENT_ID and PLAID_SECRET to .env.local.",
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

  if (!env.plaidConfigValid) {
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
  const client = getPlaidClient();

  if (!config || !client) {
    return NextResponse.json(
      {
        configured: false,
        errorCode: "plaid_config_missing",
        message: "Plaid client could not be initialized.",
        ...baseMeta,
      },
      { status: 503 },
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
