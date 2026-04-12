import { cookies } from "next/headers";
import {
  getImageUsageStatus,
  normalizeDayKey,
  normalizeSessionId,
} from "@/server/image-access";
import {
  getSubscriptionCookieName,
  isImageSubscriptionConfigured,
} from "@/server/subscription-access";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const cookieStore = cookies();
  const usage = await getImageUsageStatus({
    dayKey: normalizeDayKey(request.headers.get("x-monobedtime-day-key")),
    sessionId: normalizeSessionId(
      request.headers.get("x-monobedtime-session-id"),
    ),
    subscriptionCookieValue:
      cookieStore.get(getSubscriptionCookieName())?.value ?? null,
  });
  const billingConfigured = isImageSubscriptionConfigured();

  return Response.json(
    {
      usage,
      billingConfigured,
      actions: {
        canCheckout: billingConfigured && !usage.subscribed,
        canManage: billingConfigured && usage.subscribed,
      },
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
