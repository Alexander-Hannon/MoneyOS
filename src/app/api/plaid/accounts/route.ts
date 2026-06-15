import { NextResponse } from "next/server";
import type { CountryCode } from "plaid";
import {
  describePlaidError,
  getPlaidClient,
  getPlaidConfig,
} from "@/lib/plaid/client";
import { getPlaidSession } from "@/lib/plaid/token-store";
import { normalizeAccount } from "@/lib/plaid/normalize";
import { resolvePlaidStorageContext } from "@/lib/plaid/storage-mode";
import { loadPersistedPlaidDataForUser } from "@/lib/plaid/sync-service";
import { countActivePlaidItemsForUser } from "@/lib/db/plaid-items";

// POST /api/plaid/accounts
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

  const storage = await resolvePlaidStorageContext();

  if (storage.mode === "database" && storage.userId) {
    const activeCount = await countActivePlaidItemsForUser(storage.userId);
    if (activeCount === 0) {
      return NextResponse.json({
        configured: true,
        connected: false,
        storageMode: "database",
        message: "No persisted sandbox banks connected yet.",
      });
    }

    const data = await loadPersistedPlaidDataForUser(storage.userId);
    return NextResponse.json({
      configured: true,
      connected: true,
      storageMode: "database",
      accounts: data.accounts,
      lastSyncAt: data.lastSyncAt,
    });
  }

  const session = getPlaidSession();
  if (!session) {
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
      normalizeAccount(a, institution),
    );

    return NextResponse.json({
      configured: true,
      connected: true,
      storageMode: "memory",
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
