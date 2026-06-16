import { requireAuthUser } from "@/lib/auth/session";
import {
  listWeeklyReviewsForUser,
  saveWeeklyReviewForUser,
} from "@/lib/db/weekly-reviews";
import type { WeeklyReviewRecord } from "@/types/weekly-review";

export async function GET() {
  const auth = await requireAuthUser();
  if (!auth.ok) {
    return Response.json(auth.body, { status: auth.status });
  }

  const reviews = await listWeeklyReviewsForUser(auth.user.userId);
  return Response.json({ reviews });
}

export async function POST(request: Request) {
  const auth = await requireAuthUser();
  if (!auth.ok) {
    return Response.json(auth.body, { status: auth.status });
  }

  const body = (await request.json()) as { record?: WeeklyReviewRecord };
  if (!body.record?.id) {
    return Response.json({ error: "Missing review record." }, { status: 400 });
  }

  try {
    await saveWeeklyReviewForUser(auth.user.userId, body.record);
    return Response.json({ success: true });
  } catch (error) {
    return Response.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Could not save review.",
      },
      { status: 500 },
    );
  }
}
