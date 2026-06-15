import {
  classifyTransactionSuggestion,
  getAIConfig,
} from "@/lib/ai/money-agent-service";
import type { ClassifyTransactionInput } from "@/lib/ai/types";
import { getOptionalAuthUser } from "@/lib/auth/session";
import {
  createTransactionRuleForUser,
  listTransactionRulesForUser,
  matchTransactionRule,
  ruleCategoryToTransactionCategory,
} from "@/lib/db/transaction-rules";

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
    const rawBody = await request.json();
    const input = parseBody(rawBody);
    if (!input) {
      return Response.json(
        { error: "Invalid request body.", configured: getAIConfig().configured },
        { status: 400 },
      );
    }

    const authUser = await getOptionalAuthUser();
    if (authUser) {
      const rules = await listTransactionRulesForUser(authUser.userId);
      const matched = matchTransactionRule(input.merchantName, rules);
      if (matched) {
        const category = ruleCategoryToTransactionCategory(matched.category);
        return Response.json({
          ok: true,
          suggestedCategory: category,
          confidence: "high" as const,
          reason: `Matched your saved rule for "${matched.merchantPattern}".`,
          shouldCountAsSpending: matched.shouldCountAsSpending,
          requiresUserApproval: true as const,
          provider: "mock" as const,
          mock: true,
          fromPersistentRule: true,
        });
      }
    }

    const result = await classifyTransactionSuggestion(input);

    if (authUser && rawBody && typeof rawBody === "object") {
      const saveRule = Boolean((rawBody as Record<string, unknown>).saveRule);
      if (saveRule) {
        await createTransactionRuleForUser({
          userId: authUser.userId,
          merchantPattern: input.merchantName,
          category: result.suggestedCategory,
          shouldCountAsSpending: result.shouldCountAsSpending,
          confidenceSource: "user_approved",
        });
      }
    }

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
