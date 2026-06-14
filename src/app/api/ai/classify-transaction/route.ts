import {
  classifyTransactionSuggestion,
  getAIConfig,
} from "@/lib/ai/money-agent-service";
import type { ClassifyTransactionInput } from "@/lib/ai/types";

function parseBody(body: unknown): ClassifyTransactionInput | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  if (typeof b.merchantName !== "string") return null;
  return {
    merchantName: b.merchantName,
    description: String(b.description ?? ""),
    amount: Number(b.amount) || 0,
    currentCategory: String(b.currentCategory ?? "Review"),
    date: String(b.date ?? ""),
    direction: b.direction === "inflow" ? "inflow" : "outflow",
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

    const result = await classifyTransactionSuggestion(input);
    return Response.json({ ok: true, ...result });
  } catch {
    return Response.json(
      {
        error: "Could not classify transaction.",
        configured: getAIConfig().configured,
      },
      { status: 500 },
    );
  }
}
