import { requireAuthUser } from "@/lib/auth/session";
import {
  MAX_RECORDS_PER_REQUEST,
  RecordOwnershipError,
  applyRecordChanges,
  isRecordEntity,
  isValidRecordId,
} from "@/lib/db/records";

// POST /api/user/records  { entity, upserts: Record[], deletes: string[] }
// Applies only the changed records for one entity. Idempotent by record id.
export async function POST(request: Request) {
  const auth = await requireAuthUser();
  if (!auth.ok) {
    return Response.json(auth.body, { status: auth.status });
  }

  let body: { entity?: unknown; upserts?: unknown; deletes?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, message: "Invalid request body." }, { status: 400 });
  }

  const upserts = Array.isArray(body.upserts) ? body.upserts : [];
  const deletes = Array.isArray(body.deletes) ? body.deletes : [];
  if (!isRecordEntity(body.entity)) {
    return Response.json({ ok: false, message: "Unknown record type." }, { status: 400 });
  }
  if (upserts.length + deletes.length > MAX_RECORDS_PER_REQUEST) {
    return Response.json({ ok: false, message: "Too many records in one request." }, { status: 413 });
  }
  const validUpserts = upserts.filter(
    (r): r is Record<string, unknown> =>
      typeof r === "object" && r != null && isValidRecordId((r as Record<string, unknown>).id),
  );
  if (validUpserts.length !== upserts.length || !deletes.every(isValidRecordId)) {
    return Response.json({ ok: false, message: "Every record needs a valid id." }, { status: 400 });
  }

  try {
    const result = await applyRecordChanges({
      userId: auth.user.userId,
      entity: body.entity,
      upserts: validUpserts,
      deletes: deletes as string[],
    });
    return Response.json({ ok: true, ...result });
  } catch (error) {
    if (error instanceof RecordOwnershipError) {
      return Response.json({ ok: false, message: error.message }, { status: 403 });
    }
    return Response.json(
      { ok: false, message: "Could not save your changes. Try again." },
      { status: 500 },
    );
  }
}
