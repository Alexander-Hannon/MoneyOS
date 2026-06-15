import { NextResponse } from "next/server";
import type { CountryCode, Products } from "plaid";
import {
  describePlaidError,
  getPlaidClient,
  getPlaidConfig,
} from "@/lib/plaid/client";
import { getOptionalAuthUser } from "@/lib/auth/session";
import { resolvePlaidStorageContext } from "@/lib/plaid/storage-mode";

// POST /api/plaid/create-link-token
export async function POST() {
  const config = getPlaidConfig();
  const client = getPlaidClient();

  if (!config || !client) {
    return NextResponse.json({
      configured: false,
      message:
        "Plaid sandbox not configured yet. Add PLAID_CLIENT_ID and PLAID_SECRET to .env.local.",
    });
  }

  const authUser = await getOptionalAuthUser();
  const storage = await resolvePlaidStorageContext();

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
      storageMode: storage.mode,
    });
  } catch (error) {
    return NextResponse.json(
      {
        configured: true,
        error: "Failed to create link token.",
        detail: describePlaidError(error),
      },
      { status: 502 },
    );
  }
}
