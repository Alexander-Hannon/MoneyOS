import { requireAuthUser } from "@/lib/auth/session";
import { createConsentForUser, listConsentForUser } from "@/lib/db/consent";
import type { ConsentRecord } from "@/types/user";

export async function GET() {
  const auth = await requireAuthUser();
  if (!auth.ok) {
    return Response.json(auth.body, { status: auth.status });
  }

  const consentHistory = await listConsentForUser(auth.user.userId);
  return Response.json({ ok: true, consentHistory });
}

export async function POST(request: Request) {
  const auth = await requireAuthUser();
  if (!auth.ok) {
    return Response.json(auth.body, { status: auth.status });
  }

  const body = (await request.json()) as Partial<ConsentRecord>;
  if (!body.consentType || !body.version || !body.textSummary) {
    return Response.json({ error: "Invalid consent payload." }, { status: 400 });
  }

  const record = await createConsentForUser(auth.user.userId, {
    consentType: body.consentType,
    acceptedAt: body.acceptedAt ?? new Date().toISOString(),
    version: body.version,
    textSummary: body.textSummary,
    dataScopes: Array.isArray(body.dataScopes) ? body.dataScopes : [],
    plaidProducts: Array.isArray(body.plaidProducts) ? body.plaidProducts : [],
    revokedAt: body.revokedAt,
  });

  return Response.json({
    ok: true,
    consent: {
      id: record.id,
      acceptedAt: record.acceptedAt.toISOString(),
      version: record.version,
    },
  });
}
