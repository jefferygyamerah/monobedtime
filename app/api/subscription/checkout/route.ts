import { createImageSubscriptionCheckoutSession } from "@/server/subscription-access";
import { normalizeSessionId } from "@/server/image-access";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const rawBody = await request.json().catch(() => ({}));
    const sessionId = normalizeSessionId(
      request.headers.get("x-monobedtime-session-id") ??
        rawBody?.sessionId ??
        null,
    );

    const checkoutSession = await createImageSubscriptionCheckoutSession(sessionId);

    return Response.json({
      url: checkoutSession.url,
    });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "We could not start the subscription checkout.",
      },
      {
        status: 503,
      },
    );
  }
}
