import {
  generateWeeklyReview,
  sanitizeWeeklyReviewInput,
} from "@/lib/ai/weekly-review-service";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const input = sanitizeWeeklyReviewInput(body);
    if (!input) {
      return Response.json({ error: "Invalid weekly review input." }, { status: 400 });
    }
    const result = await generateWeeklyReview(input);
    return Response.json(result);
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not generate weekly review.",
      },
      { status: 500 },
    );
  }
}
