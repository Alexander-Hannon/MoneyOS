import { NextResponse } from "next/server";
import { isPlaidConfigured } from "@/lib/plaid/client";
import { resolvePlaidStorageContext } from "@/lib/plaid/storage-mode";
import { getConnectedInstitutionSummaries } from "@/lib/plaid/persistent-items";
import { getPlaidSession } from "@/lib/plaid/token-store";

// GET /api/plaid/institutions
export async function GET() {
  const configured = isPlaidConfigured();
  const storage = await resolvePlaidStorageContext();

  if (storage.mode === "database" && storage.userId) {
    const institutions = await getConnectedInstitutionSummaries(storage.userId);
    return NextResponse.json({
      configured,
      storageMode: "database",
      institutions,
    });
  }

  const session = getPlaidSession();
  if (session) {
    return NextResponse.json({
      configured,
      storageMode: "memory",
      institutions: [
        {
          id: "memory-session",
          plaidItemId: null,
          institutionName: "Sandbox Institution",
          accountCount: 0,
          status: "connected",
          connectedAt: session.lastSyncAt ?? new Date().toISOString(),
          lastSyncAt: session.lastSyncAt,
          source: "plaid_sandbox",
        },
      ],
    });
  }

  return NextResponse.json({
    configured,
    storageMode: storage.mode,
    institutions: [],
  });
}
