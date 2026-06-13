import { NextResponse } from "next/server";
import type { CountryCode } from "plaid";
import {
  describePlaidError,
  getPlaidClient,
  getPlaidConfig,
} from "@/lib/plaid/client";
import { getPlaidSession } from "@/lib/plaid/token-store";
import { normalizeAccount } from "@/lib/plaid/normalize";

// POST /api/plaid/accounts
// Fetches linked sandbox accounts using the server-side access token and
// returns them normalized into MoneyOS LinkedAccount shape (no token data).
export async function POST() {
  const config = getPlaidConfig();
  const client = getPlaidClient();

  if (!config || !client) {
    return NextResponse.json({
      configured: false,
      connected: false,
      message: "Plaid sandbox not configured.",
    });
  }

  const session = getPlaidSession();
  if (!session) {
    return NextResponse.json({
      configured: true,
      connected: false,
      message: "No sandbox bank connected yet.",
    });
  }

  try {
    const [accountsRes, itemRes] = await Promise.all([
      client.accountsGet({ access_token: session.accessToken }),
      client.itemGet({ access_token: session.accessToken }),
    ]);

    let institution = "Sandbox Institution";
    const institutionId = itemRes.data.item.institution_id;
    if (institutionId) {
      try {
        const inst = await client.institutionsGetById({
          institution_id: institutionId,
          country_codes: config.countryCodes as CountryCode[],
        });
        institution = inst.data.institution.name;
      } catch {
        // Non-fatal — fall back to a generic label.
      }
    }

    const accounts = accountsRes.data.accounts.map((a) =>
      normalizeAccount(a, institution),
    );

    return NextResponse.json({ configured: true, connected: true, accounts });
  } catch (error) {
    return NextResponse.json(
      {
        configured: true,
        connected: true,
        error: "Failed to fetch accounts from Plaid.",
        detail: describePlaidError(error),
      },
      { status: 502 },
    );
  }
}
