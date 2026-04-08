import { cookies } from "next/headers";
import { createCustomerPortalUrl, getSubscriptionCookieName, verifyImageSubscription } from "@/server/subscription-access";

export const runtime = "nodejs";

export async function POST() {
  try {
    const cookieStore = cookies();
    const subscription = await verifyImageSubscription(
      cookieStore.get(getSubscriptionCookieName())?.value ?? null,
    );

    if (!subscription.active || !subscription.customerId) {
      return Response.json(
        {
          error: "There is no active subscription to manage on this browser.",
        },
        {
          status: 403,
        },
      );
    }

    const url = await createCustomerPortalUrl(subscription.customerId);

    return Response.json({ url });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "We could not open the subscription manager.",
      },
      {
        status: 500,
      },
    );
  }
}
