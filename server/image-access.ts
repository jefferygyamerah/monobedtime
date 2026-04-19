import "server-only";

import type { ImageUsage } from "@/lib/story-contract";
import {
  isImageSubscriptionConfigured,
  verifyImageSubscription,
} from "@/server/subscription-access";
import { getDailyUsage, reserveDailyUsage } from "@/server/usage-access";

export const FREE_IMAGE_LIMIT_PER_DAY = 3;

export function normalizeSessionId(rawValue?: string | null) {
  const trimmed = rawValue?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : "guest-session";
}

export function normalizeDayKey(rawValue?: string | null) {
  const trimmed = rawValue?.trim();

  if (trimmed && /^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  return new Date().toISOString().slice(0, 10);
}

function toUsage(subscribed: boolean, usedFreeImages: number): ImageUsage {
  const cappedUsage = subscribed
    ? 0
    : Math.max(0, Math.min(usedFreeImages, FREE_IMAGE_LIMIT_PER_DAY));

  return {
    subscribed,
    subscriptionConfigured: isImageSubscriptionConfigured(),
    canGenerate: subscribed || cappedUsage < FREE_IMAGE_LIMIT_PER_DAY,
    dailyLimit: FREE_IMAGE_LIMIT_PER_DAY,
    usedFreeImages: cappedUsage,
    remainingFreeImages: subscribed
      ? FREE_IMAGE_LIMIT_PER_DAY
      : Math.max(0, FREE_IMAGE_LIMIT_PER_DAY - cappedUsage),
  };
}

export async function getImageUsageStatus({
  dayKey,
  sessionId,
  subscriptionCookieValue,
}: {
  dayKey: string;
  sessionId: string;
  subscriptionCookieValue?: string | null;
}) {
  const subscription = await verifyImageSubscription(subscriptionCookieValue);

  if (subscription.active) {
    return toUsage(true, 0);
  }

  const usage = await getDailyUsage({
    kind: "image",
    dayKey,
    sessionId,
  });
  return toUsage(false, usage.used);
}

export async function reserveImageGeneration({
  dayKey,
  sessionId,
  subscriptionCookieValue,
}: {
  dayKey: string;
  sessionId: string;
  subscriptionCookieValue?: string | null;
}) {
  const subscription = await verifyImageSubscription(subscriptionCookieValue);

  if (subscription.active) {
    return {
      allowed: true,
      usage: toUsage(true, 0),
    };
  }

  const reservation = await reserveDailyUsage({
    kind: "image",
    dayKey,
    sessionId,
    limitPerDay: FREE_IMAGE_LIMIT_PER_DAY,
  });

  if (!reservation.allowed) {
    return {
      allowed: false,
      usage: toUsage(false, reservation.used),
    };
  }

  return {
    allowed: true,
    usage: toUsage(false, reservation.used),
  };
}
