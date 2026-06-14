import { explainAlert } from "@/lib/ai/money-agent-service";
import { getAIConfig } from "@/lib/ai/money-agent-service";
import type { ExplainAlertInput } from "@/lib/ai/types";

function parseBody(body: unknown): ExplainAlertInput | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  if (typeof b.title !== "string" || typeof b.suggestedAction !== "string") {
    return null;
  }
  const ctx = b.contextSummary as Record<string, unknown> | undefined;
  return {
    title: b.title,
    description: String(b.description ?? ""),
    severity: String(b.severity ?? "medium"),
    category: String(b.category ?? "general"),
    suggestedAction: b.suggestedAction,
    contextSummary: {
      dataSource: String(ctx?.dataSource ?? "unknown"),
      cashAvailable: Number(ctx?.cashAvailable) || 0,
      billsDue14Days: Number(ctx?.billsDue14Days) || 0,
      reviewItemsCount: Number(ctx?.reviewItemsCount) || 0,
    },
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const input = parseBody(body);
    if (!input) {
      return Response.json(
        { error: "Invalid request body.", configured: getAIConfig().configured },
        { status: 400 },
      );
    }

    const result = await explainAlert(input);
    return Response.json({ ok: true, ...result });
  } catch {
    return Response.json(
      {
        error: "Could not explain alert.",
        configured: getAIConfig().configured,
      },
      { status: 500 },
    );
  }
}
