import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import Stripe from "stripe";

const SUBSCRIPTION_COOKIE_NAME = "mb_art_subscription";
const ACTIVE_SUBSCRIPTION_STATUSES = new Set<Stripe.Subscription.Status>([
  "active",
  "trialing",
]);

let stripeClient: Stripe | null = null;

function getStripe() {
  if (!stripeClient) {
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", {
      apiVersion: "2026-02-25.clover",
      typescript: true,
    });
  }

  return stripeClient;
}

function getSigningSecret() {
  const explicitSecret = process.env.COOKIE_SIGNING_SECRET?.trim();
  if (explicitSecret) {
    return explicitSecret;
  }

  if (process.env.NODE_ENV !== "production") {
    return (
      process.env.STRIPE_SECRET_KEY?.trim() ?? "monobedtime-dev-subscription-secret"
    );
  }

  throw new Error(
    "COOKIE_SIGNING_SECRET is required in production to sign subscription cookies.",
  );
}

function signValue(value: string) {
  return createHmac("sha256", getSigningSecret()).update(value).digest("base64url");
}

function getAppUrl() {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  return "http://localhost:3000";
}

function isActiveStatus(status: Stripe.Subscription.Status) {
  return ACTIVE_SUBSCRIPTION_STATUSES.has(status);
}

type SubscriptionCookiePayload = {
  subscriptionId: string;
};

export function getSubscriptionCookieName() {
  return SUBSCRIPTION_COOKIE_NAME;
}

export function isImageSubscriptionConfigured() {
  return Boolean(
    process.env.STRIPE_SECRET_KEY &&
      process.env.STRIPE_IMAGE_SUBSCRIPTION_PRICE_ID,
  );
}

export function createSubscriptionCookieValue(payload: SubscriptionCookiePayload) {
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encodedPayload}.${signValue(encodedPayload)}`;
}

function parseSubscriptionCookieValue(rawValue?: string | null) {
  if (!rawValue) {
    return null;
  }

  const [encodedPayload, signature] = rawValue.split(".");

  if (!encodedPayload || !signature) {
    return null;
  }

  const expectedSignature = signValue(encodedPayload);

  try {
    const providedBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);

    if (
      providedBuffer.length !== expectedBuffer.length ||
      !timingSafeEqual(providedBuffer, expectedBuffer)
    ) {
      return null;
    }

    const payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8"),
    ) as SubscriptionCookiePayload;

    return payload.subscriptionId ? payload : null;
  } catch {
    return null;
  }
}

export async function verifyImageSubscription(rawValue?: string | null) {
  if (!isImageSubscriptionConfigured()) {
    return {
      active: false,
      customerId: null,
      status: null,
      subscriptionId: null,
    };
  }

  const payload = parseSubscriptionCookieValue(rawValue);

  if (!payload) {
    return {
      active: false,
      customerId: null,
      status: null,
      subscriptionId: null,
    };
  }

  try {
    const subscription = await getStripe().subscriptions.retrieve(payload.subscriptionId);
    const customerId =
      typeof subscription.customer === "string"
        ? subscription.customer
        : subscription.customer.id;

    return {
      active: isActiveStatus(subscription.status),
      customerId,
      status: subscription.status,
      subscriptionId: subscription.id,
    };
  } catch {
    return {
      active: false,
      customerId: null,
      status: null,
      subscriptionId: payload.subscriptionId,
    };
  }
}

export async function createImageSubscriptionCheckoutSession(sessionId: string) {
  if (!isImageSubscriptionConfigured()) {
    throw new Error("Subscription checkout is not configured yet.");
  }

  const appUrl = getAppUrl();

  return getStripe().checkout.sessions.create({
    allow_promotion_codes: true,
    cancel_url: `${appUrl}/subscribe/cancel`,
    line_items: [
      {
        price: process.env.STRIPE_IMAGE_SUBSCRIPTION_PRICE_ID!,
        quantity: 1,
      },
    ],
    metadata: {
      monobedtimeSessionId: sessionId,
      product: "monobedtime-image-subscription",
    },
    mode: "subscription",
    success_url: `${appUrl}/subscribe/success?session_id={CHECKOUT_SESSION_ID}`,
    subscription_data: {
      metadata: {
        product: "monobedtime-image-subscription",
      },
    },
  });
}

export async function createCustomerPortalUrl(customerId: string) {
  const session = await getStripe().billingPortal.sessions.create({
    customer: customerId,
    return_url: getAppUrl(),
  });

  return session.url;
}

export async function finalizeImageSubscription(sessionId: string) {
  if (!isImageSubscriptionConfigured()) {
    return null;
  }

  const checkoutSession = await getStripe().checkout.sessions.retrieve(sessionId, {
    expand: ["subscription"],
  });

  if (checkoutSession.mode !== "subscription") {
    return null;
  }

  const subscription =
    typeof checkoutSession.subscription === "string"
      ? await getStripe().subscriptions.retrieve(checkoutSession.subscription)
      : checkoutSession.subscription;

  if (!subscription || !isActiveStatus(subscription.status)) {
    return null;
  }

  return {
    cookieValue: createSubscriptionCookieValue({
      subscriptionId: subscription.id,
    }),
    subscriptionId: subscription.id,
  };
}
