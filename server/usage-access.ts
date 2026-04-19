import "server-only";

type UsageKind = "image" | "story";

type UsageRecord = {
  used: number;
  expiresAt: number;
};

type ReserveUsageResult = {
  allowed: boolean;
  used: number;
  store: "kv" | "memory";
};

declare global {
  // eslint-disable-next-line no-var
  var __monobedtimeUsageStore: Map<string, UsageRecord> | undefined;
  // eslint-disable-next-line no-var
  var __monobedtimeUsageStoreWarned: boolean | undefined;
}

const KV_REST_API_URL = process.env.KV_REST_API_URL?.trim();
const KV_REST_API_TOKEN = process.env.KV_REST_API_TOKEN?.trim();
const FALLBACK_TTL_MS = 1000 * 60 * 60 * 36;

function getStore() {
  if (!globalThis.__monobedtimeUsageStore) {
    globalThis.__monobedtimeUsageStore = new Map<string, UsageRecord>();
  }

  return globalThis.__monobedtimeUsageStore;
}

function warnMemoryFallbackOnce() {
  if (globalThis.__monobedtimeUsageStoreWarned) {
    return;
  }

  globalThis.__monobedtimeUsageStoreWarned = true;
  console.warn(
    "[monobedtime:usage] KV is not configured; quota counters are process-local and may reset.",
  );
}

function parseUsageCount(rawValue: unknown) {
  const value = Number(rawValue);
  if (!Number.isFinite(value) || value <= 0) {
    return 0;
  }

  return Math.floor(value);
}

function memoryKey(kind: UsageKind, dayKey: string, sessionId: string) {
  return `${kind}:${dayKey}:${sessionId}`;
}

function kvKey(kind: UsageKind, dayKey: string, sessionId: string) {
  return `monobedtime:usage:${kind}:${dayKey}:${sessionId}`;
}

function purgeExpiredStoreEntries(store: Map<string, UsageRecord>) {
  const now = Date.now();
  store.forEach((record, key) => {
    if (record.expiresAt <= now) {
      store.delete(key);
    }
  });
}

function getMemoryUsage(kind: UsageKind, dayKey: string, sessionId: string) {
  const store = getStore();
  purgeExpiredStoreEntries(store);
  const key = memoryKey(kind, dayKey, sessionId);
  const current = store.get(key);
  const used = current ? Math.max(0, current.used) : 0;

  return {
    used,
    store: "memory" as const,
  };
}

function reserveMemoryUsage(
  kind: UsageKind,
  dayKey: string,
  sessionId: string,
  limitPerDay: number,
): ReserveUsageResult {
  const store = getStore();
  purgeExpiredStoreEntries(store);
  const key = memoryKey(kind, dayKey, sessionId);
  const now = Date.now();
  const current = store.get(key);
  const used = current ? Math.max(0, current.used) : 0;

  if (used >= limitPerDay) {
    return {
      allowed: false,
      used,
      store: "memory",
    };
  }

  const nextUsed = used + 1;
  store.set(key, {
    used: nextUsed,
    expiresAt: now + FALLBACK_TTL_MS,
  });

  return {
    allowed: true,
    used: nextUsed,
    store: "memory",
  };
}

function isKvConfigured() {
  return Boolean(KV_REST_API_URL && KV_REST_API_TOKEN);
}

async function kvRequest<T>(path: string) {
  if (!KV_REST_API_URL || !KV_REST_API_TOKEN) {
    return null;
  }

  const response = await fetch(`${KV_REST_API_URL}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${KV_REST_API_TOKEN}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`KV request failed: ${response.status}`);
  }

  const payload = (await response.json()) as { result?: T };
  return payload.result ?? null;
}

async function getKvUsage(kind: UsageKind, dayKey: string, sessionId: string) {
  if (!isKvConfigured()) {
    return null;
  }

  const key = encodeURIComponent(kvKey(kind, dayKey, sessionId));
  const result = await kvRequest<string | number>(`/get/${key}`);

  return {
    used: parseUsageCount(result),
    store: "kv" as const,
  };
}

async function reserveKvUsage(
  kind: UsageKind,
  dayKey: string,
  sessionId: string,
  limitPerDay: number,
) {
  if (!isKvConfigured()) {
    return null;
  }

  const key = encodeURIComponent(kvKey(kind, dayKey, sessionId));
  const nextUsed = parseUsageCount(await kvRequest<number | string>(`/incr/${key}`));

  if (nextUsed <= 1) {
    await kvRequest(`/expire/${key}/172800`);
  }

  if (nextUsed > limitPerDay) {
    await kvRequest(`/decr/${key}`);
    return {
      allowed: false,
      used: limitPerDay,
      store: "kv" as const,
    };
  }

  return {
    allowed: true,
    used: nextUsed,
    store: "kv" as const,
  };
}

export async function getDailyUsage({
  kind,
  dayKey,
  sessionId,
}: {
  kind: UsageKind;
  dayKey: string;
  sessionId: string;
}) {
  try {
    const kvUsage = await getKvUsage(kind, dayKey, sessionId);
    if (kvUsage) {
      return kvUsage;
    }
  } catch (error) {
    console.error("[monobedtime:usage] KV read failed, falling back to memory.", error);
  }

  warnMemoryFallbackOnce();
  return getMemoryUsage(kind, dayKey, sessionId);
}

export async function reserveDailyUsage({
  kind,
  dayKey,
  sessionId,
  limitPerDay,
}: {
  kind: UsageKind;
  dayKey: string;
  sessionId: string;
  limitPerDay: number;
}) {
  try {
    const kvReserve = await reserveKvUsage(kind, dayKey, sessionId, limitPerDay);
    if (kvReserve) {
      return kvReserve;
    }
  } catch (error) {
    console.error("[monobedtime:usage] KV reserve failed, falling back to memory.", error);
  }

  warnMemoryFallbackOnce();
  return reserveMemoryUsage(kind, dayKey, sessionId, limitPerDay);
}
