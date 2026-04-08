import "server-only";

import type { ImageUsage } from "@/lib/story-contract";
import {
  isImageSubscriptionConfigured,
  verifyImageSubscription,
} from "@/server/subscription-access";

export const FREE_IMAGE_LIMIT_PER_DAY = 3;

type UsageRecord = {
  dayKey: string;
  usedFreeImages: number;
};

declare global {
  // eslint-disable-next-line no-var
  var __monobedtimeImageUsageStore: Map<string, UsageRecord> | undefined;
}

function getStore() {
  if (!globalThis.__monobedtimeImageUsageStore) {
    globalThis.__monobedtimeImageUsageStore = new Map<string, UsageRecord>();
  }

  return globalThis.__monobedtimeImageUsageStore;
}

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

function getUsageRecord(sessionId: string, dayKey: string) {
  const store = getStore();
  const key = `${dayKey}:${sessionId}`;
  const current = store.get(key);

  if (!current || current.dayKey !== dayKey) {
    return {
      key,
      record: {
        dayKey,
        usedFreeImages: 0,
      },
    };
  }

  return {
    key,
    record: current,
  };
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

  const { record } = getUsageRecord(sessionId, dayKey);
  return toUsage(false, record.usedFreeImages);
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

  const { key, record } = getUsageRecord(sessionId, dayKey);

  if (record.usedFreeImages >= FREE_IMAGE_LIMIT_PER_DAY) {
    return {
      allowed: false,
      usage: toUsage(false, record.usedFreeImages),
    };
  }

  const nextRecord = {
    dayKey,
    usedFreeImages: record.usedFreeImages + 1,
  };

  getStore().set(key, nextRecord);

  return {
    allowed: true,
    usage: toUsage(false, nextRecord.usedFreeImages),
  };
}
