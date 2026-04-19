import { cookies } from "next/headers";
import { bedtimeRequestSchema } from "@/lib/story-contract";
import { normalizeDayKey, normalizeSessionId } from "@/server/image-access";
import { generateBedtimeStory } from "@/server/generate-story-runtime";
import {
  getSubscriptionCookieName,
  isImageSubscriptionConfigured,
  verifyImageSubscription,
} from "@/server/subscription-access";
import { reserveDailyUsage } from "@/server/usage-access";
import { ZodError } from "zod";

export const runtime = "nodejs";
export const FREE_STORY_LIMIT_PER_DAY = 3;

type ApiErrorResponse = {
  code: string;
  error: string;
  details?: unknown;
};

function toErrorMessage(error: unknown) {
  if (error instanceof ZodError) {
    const firstIssue = error.issues[0];
    const field = firstIssue?.path.join(".");
    const issueMessage = firstIssue?.message;

    if (field === "age") {
      return "Age must be between 0 and 12.";
    }

    if (field === "summary") {
      return "The story draft came back too long, so we could not use it. Please try again.";
    }

    if (field) {
      return `Story validation failed at ${field}: ${issueMessage ?? "invalid value"}`;
    }

    return "We could not shape the story into the expected bedtime format. Please try again.";
  }

  return error instanceof Error
    ? error.message
    : "No pudimos crear el cuento de esta noche.";
}

function jsonError(
  status: number,
  payload: ApiErrorResponse,
  extraHeaders?: Record<string, string>,
) {
  return Response.json(payload, {
    status,
    headers: {
      "Cache-Control": "no-store",
      ...extraHeaders,
    },
  });
}

export async function POST(request: Request) {
  let rawInput: unknown;

  try {
    rawInput = await request.json();
  } catch {
    return jsonError(400, {
      code: "INVALID_JSON",
      error: "Request body must be valid JSON.",
    });
  }

  const parsedInput = bedtimeRequestSchema.safeParse(rawInput);
  if (!parsedInput.success) {
    const firstIssue = parsedInput.error.issues[0];
    return jsonError(422, {
      code: "INVALID_STORY_REQUEST",
      error: toErrorMessage(parsedInput.error),
      details: firstIssue
        ? {
            path: firstIssue.path.join("."),
            message: firstIssue.message,
          }
        : undefined,
    });
  }

  try {
    const cookieStore = cookies();
    const dayKey = normalizeDayKey(request.headers.get("x-monobedtime-day-key"));
    const sessionId = normalizeSessionId(
      request.headers.get("x-monobedtime-session-id"),
    );
    const subscription = await verifyImageSubscription(
      cookieStore.get(getSubscriptionCookieName())?.value ?? null,
    );
    const billingConfigured = isImageSubscriptionConfigured();

    if (!subscription.active) {
      const reservation = await reserveDailyUsage({
        kind: "story",
        dayKey,
        sessionId,
        limitPerDay: FREE_STORY_LIMIT_PER_DAY,
      });

      if (!reservation.allowed) {
        return jsonError(429, {
          code: "FREE_STORY_LIMIT_REACHED",
          error: billingConfigured
            ? `Today's ${FREE_STORY_LIMIT_PER_DAY} free stories are used up. Subscribe for unlimited stories.`
            : `Today's ${FREE_STORY_LIMIT_PER_DAY} free stories are used up. Story generation resumes tomorrow.`,
          details: {
            dailyLimit: FREE_STORY_LIMIT_PER_DAY,
            usedFreeStories: reservation.used,
          },
        });
      }
    }

    const story = await generateBedtimeStory(parsedInput.data);
    return Response.json(story, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("[monobedtime:api:generate-story] provider/runtime failure", error);
    return jsonError(502, {
      code: "STORY_GENERATION_UNAVAILABLE",
      error: toErrorMessage(error),
    });
  }
}
