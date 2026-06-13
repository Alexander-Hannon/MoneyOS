import { NextResponse } from "next/server";
import { isPlaidConfigured } from "@/lib/plaid/client";
import { getPlaidSession } from "@/lib/plaid/token-store";

// GET /api/plaid/status
// Lightweight status for the connection card / initial load. Never exposes
// tokens — only booleans, a source label, and the last sync time.
export async function GET() {
  const configured = isPlaidConfigured();
  const session = getPlaidSession();
  const connected = configured && session !== null;

  return NextResponse.json({
    configured,
    connected,
    status: connected ? "connected" : "not_connected",
    source: connected ? "plaid_sandbox" : "mock",
    lastSyncAt: session?.lastSyncAt ?? null,
  });
}
