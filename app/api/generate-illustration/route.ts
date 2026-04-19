import { cookies } from "next/headers";
import { illustrationRequestSchema } from "@/lib/story-contract";
import {
  normalizeDayKey,
  normalizeSessionId,
  reserveImageGeneration,
} from "@/server/image-access";
import { generateIllustrationWithOptions } from "@/server/generate-illustration-runtime";
import { getSubscriptionCookieName } from "@/server/subscription-access";
import { ZodError } from "zod";

export const runtime = "nodejs";

type ApiErrorResponse = {
  code: string;
  error: string;
  details?: unknown;
};

function toErrorMessage(error: unknown) {
  if (error instanceof ZodError) {
    return "We could not prepare that illustration request. Please try again.";
  }

  return error instanceof Error
    ? error.message
    : "No pudimos crear la ilustracion de esta escena.";
}

function jsonError(status: number, payload: ApiErrorResponse) {
  return Response.json(payload, {
    status,
    headers: {
      "Cache-Control": "no-store",
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

  const parsedInput = illustrationRequestSchema.safeParse(rawInput);
  if (!parsedInput.success) {
    const firstIssue = parsedInput.error.issues[0];
    return jsonError(422, {
      code: "INVALID_ILLUSTRATION_REQUEST",
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
    const allowance = await reserveImageGeneration({
      dayKey: normalizeDayKey(request.headers.get("x-monobedtime-day-key")),
      sessionId: normalizeSessionId(
        request.headers.get("x-monobedtime-session-id"),
      ),
      subscriptionCookieValue:
        cookieStore.get(getSubscriptionCookieName())?.value ?? null,
    });

    if (!allowance.allowed) {
      const exhaustedMessage = allowance.usage.subscriptionConfigured
        ? `Today's ${allowance.usage.dailyLimit} free illustrations are used up. Your story is complete - illustration resumes tomorrow.`
        : "Illustration subscription is coming soon. Your full story still generates.";

      return Response.json(
        {
          code: "FREE_IMAGE_LIMIT_REACHED",
          error: exhaustedMessage,
          usage: allowance.usage,
        },
        {
          status: 402,
        },
      );
    }

    const illustration = await generateIllustrationWithOptions(parsedInput.data, {
      // Free tier: use Unsplash (no per-image AI cost). Subscribers: prefer AI.
      preferUnsplash: !allowance.usage.subscribed,
    });
    return Response.json(
      {
        ...illustration,
        usage: allowance.usage,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    console.error(
      "[monobedtime:api:generate-illustration] provider/runtime failure",
      error,
    );
    return jsonError(502, {
      code: "ILLUSTRATION_GENERATION_UNAVAILABLE",
      error: toErrorMessage(error),
    });
  }
}
