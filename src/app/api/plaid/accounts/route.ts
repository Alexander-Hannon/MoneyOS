import { NextResponse } from "next/server";
import type { CountryCode } from "plaid";
import {
  describePlaidError,
  getPlaidClientForEnvironment,
  getPlaidConfig,
} from "@/lib/plaid/client";
import { getPlaidSession } from "@/lib/plaid/token-store";
import { normalizeAccount } from "@/lib/plaid/normalize";
import { loadPlaidAccountsWithDiagnostics } from "@/lib/plaid/account-persistence";
import { resolvePlaidStorageContext } from "@/lib/plaid/storage-mode";
import { countActivePlaidItemsForUser } from "@/lib/db/plaid-items";
import {
  parsePlaidEnvironmentFromBody,
  type PlaidEnvironment,
} from "@/lib/plaid/plaid-env";

// POST /api/plaid/accounts  { environment?, refreshIfEmpty? }
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
  let refreshIfEmpty = true;
  try {
    const body = await request.json();
    environment = parsePlaidEnvironmentFromBody(body) ?? undefined;
    if (body?.refreshIfEmpty === false) refreshIfEmpty = false;
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

    const { data, diagnostics } = await loadPlaidAccountsWithDiagnostics(
      storage.userId,
      environment,
      { refreshIfEmpty },
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
      accountDiagnostics: diagnostics,
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
      accountDiagnostics: {
        accountCountFromPlaid: accounts.length,
        accountCountSaved: accounts.length,
        accountCountForItem: {},
        accountTypesFound: [...new Set(accounts.map((a) => a.type))],
        environment: "sandbox",
        refreshedEmptyAccounts: false,
      },
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
