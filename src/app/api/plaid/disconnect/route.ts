import { NextResponse } from "next/server";
import { isPlaidConfigured } from "@/lib/plaid/client";
import {
  clearPlaidSession,
  hasPlaidSession,
} from "@/lib/plaid/token-store";
import { resolvePlaidStorageContext } from "@/lib/plaid/storage-mode";
import { disconnectPlaidItemForUser } from "@/lib/plaid/persistent-items";
import { getPlaidItemForUser } from "@/lib/db/plaid-items";

// POST /api/plaid/disconnect  { plaidItemId?: string, deleteHistory?: boolean }
export async function POST(request: Request) {
  if (!isPlaidConfigured()) {
    return NextResponse.json({
      configured: false,
      ok: false,
      message:
        "Plaid is not configured. Add PLAID_CLIENT_ID and PLAID_SECRET to enable sandbox.",
    });
  }

  let plaidItemId: string | undefined;
  let deleteHistory = false;
  try {
    const body = await request.json();
    plaidItemId =
      typeof body?.plaidItemId === "string" ? body.plaidItemId : undefined;
    deleteHistory = body?.deleteHistory === true;
  } catch {
    // optional body
  }

  const storage = await resolvePlaidStorageContext();

  if (storage.mode === "database" && storage.userId) {
    if (!plaidItemId) {
      return NextResponse.json(
        {
          configured: true,
          ok: false,
          storageMode: "database",
          error: "plaidItemId is required to disconnect a persisted institution.",
        },
        { status: 400 },
      );
    }

    try {
      const item = await getPlaidItemForUser(storage.userId, plaidItemId);
      const environment = item?.environment ?? "sandbox";

      await disconnectPlaidItemForUser(storage.userId, plaidItemId, {
        deleteHistory,
      });

      return NextResponse.json({
        configured: true,
        ok: true,
        connected: false,
        storageMode: "database",
        environment,
        deleteHistory,
        message: deleteHistory
          ? "Institution disconnected and historical data deleted."
          : "Institution disconnected. Historical transactions were kept.",
      });
    } catch (error) {
      return NextResponse.json(
        {
          configured: true,
          ok: false,
          storageMode: "database",
          error:
            error instanceof Error
              ? error.message
              : "Could not disconnect institution.",
        },
        { status: 404 },
      );
    }
  }

  if (!hasPlaidSession()) {
    return NextResponse.json({
      configured: true,
      ok: true,
      connected: false,
      storageMode: "memory",
      message: "No active sandbox session.",
    });
  }

  clearPlaidSession();

  return NextResponse.json({
    configured: true,
    ok: true,
    connected: false,
    storageMode: "memory",
    message:
      "Sandbox session disconnected. Access token removed from server memory.",
  });
}
