import { NextResponse } from "next/server";
import type { CountryCode } from "plaid";
import {
  describePlaidError,
  getPlaidClientForEnvironment,
  getPlaidConfig,
} from "@/lib/plaid/client";
import { getPlaidSession } from "@/lib/plaid/token-store";
import { normalizeAccount } from "@/lib/plaid/normalize";
import { resolvePlaidStorageContext } from "@/lib/plaid/storage-mode";
import { loadPersistedPlaidDataForUser } from "@/lib/plaid/sync-service";
import { countActivePlaidItemsForUser } from "@/lib/db/plaid-items";
import {
  parsePlaidLinkTarget,
  type PlaidEnvironment,
} from "@/lib/plaid/plaid-env";

// POST /api/plaid/accounts  { environment? }
// Returns cached DB balances for persisted mode — does not call Plaid on page load.
export async function POST(request: Request) {
  const config = getPlaidConfig();

  if (!config) {
    return NextResponse.json({
      configured: false,
      connected: false,
      message: "Plaid is not configured.",
    });
  }

  let environment: PlaidEnvironment | undefined;
  try {
    const body = await request.json();
    const parsed = parsePlaidLinkTarget(body?.environment);
    if (parsed) environment = parsed;
  } catch {
    // optional body
  }

  const storage = await resolvePlaidStorageContext();

  if (storage.mode === "database" && storage.userId) {
    const activeCount = await countActivePlaidItemsForUser(
      storage.userId,
      environment,
    );
    if (activeCount === 0) {
      return NextResponse.json({
        configured: true,
        connected: false,
        storageMode: "database",
        environment: environment ?? null,
        message: "No persisted banks connected yet.",
      });
    }

    const data = await loadPersistedPlaidDataForUser(
      storage.userId,
      environment,
    );
    return NextResponse.json({
      configured: true,
      connected: true,
      storageMode: "database",
      environment: data.environment,
      source: data.source,
      accounts: data.accounts,
      lastSyncAt: data.lastSyncAt,
      lastBalanceRefreshAt: data.lastBalanceRefreshAt,
    });
  }

  const session = getPlaidSession();
  const client = getPlaidClientForEnvironment("sandbox");
  if (!session || !client) {
    return NextResponse.json({
      configured: true,
      connected: false,
      storageMode: "memory",
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
        // non-fatal
      }
    }

    const accounts = accountsRes.data.accounts.map((a) =>
      normalizeAccount(a, institution, "plaid_sandbox"),
    );

    return NextResponse.json({
      configured: true,
      connected: true,
      storageMode: "memory",
      environment: "sandbox",
      source: "plaid_sandbox",
      accounts,
    });
  } catch (error) {
    return NextResponse.json(
      {
        configured: true,
        connected: true,
        storageMode: "memory",
        error: "Failed to fetch accounts from Plaid.",
        detail: describePlaidError(error),
      },
      { status: 502 },
    );
  }
}
