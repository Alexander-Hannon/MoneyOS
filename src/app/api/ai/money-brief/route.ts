import {
  generateMoneyBrief,
  getAIConfig,
  sanitizeMoneyBriefInput,
} from "@/lib/ai/money-agent-service";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const input = sanitizeMoneyBriefInput(body);
    if (!input) {
      return Response.json(
        { error: "Invalid request body.", configured: getAIConfig().configured },
        { status: 400 },
      );
    }

    const result = await generateMoneyBrief(input);
    return Response.json({ ok: true, ...result });
  } catch {
    return Response.json(
      {
        error: "Could not generate Money Agent brief.",
        configured: getAIConfig().configured,
      },
      { status: 500 },
    );
  }
}
