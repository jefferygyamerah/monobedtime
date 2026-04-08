import { cookies } from "next/headers";
import { illustrationRequestSchema } from "@/lib/story-contract";
import {
  normalizeDayKey,
  normalizeSessionId,
  reserveImageGeneration,
} from "@/server/image-access";
import { generateIllustration } from "@/server/generate-illustration-runtime";
import { getSubscriptionCookieName } from "@/server/subscription-access";
import { ZodError } from "zod";

export const runtime = "nodejs";

function toErrorMessage(error: unknown) {
  if (error instanceof ZodError) {
    return "We could not prepare that illustration request. Please try again.";
  }

  return error instanceof Error
    ? error.message
    : "No pudimos crear la ilustracion de esta escena.";
}

export async function POST(request: Request) {
  try {
    const rawInput = await request.json();
    illustrationRequestSchema.parse(rawInput);
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
      return Response.json(
        {
          code: "FREE_IMAGE_LIMIT_REACHED",
          error:
            "You have used all 3 free image generations for this browser session today. Start the subscription to keep going.",
          usage: allowance.usage,
        },
        {
          status: 402,
        },
      );
    }

    const illustration = await generateIllustration(rawInput);
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
    return Response.json(
      {
        error: toErrorMessage(error),
      },
      {
        status: 400,
      },
    );
  }
}
