/**
 * Per-browser identity for daily usage quotas on API routes.
 * Call only from client components (uses localStorage).
 */

const SESSION_STORAGE_KEY = "monobedtime-session-id";

export function createLocalDayKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function createSessionId() {
  if (typeof window.crypto?.randomUUID === "function") {
    return window.crypto.randomUUID();
  }

  return `session-${Date.now()}-${Math.round(Math.random() * 1_000_000)}`;
}

export function ensureMonobedtimeSessionId() {
  if (typeof window === "undefined") {
    return "guest-session";
  }

  const existing = window.localStorage.getItem(SESSION_STORAGE_KEY);
  if (existing) {
    return existing;
  }

  const next = createSessionId();
  window.localStorage.setItem(SESSION_STORAGE_KEY, next);
  return next;
}

/** Headers expected by `/api/generate-illustration`, `/api/generate-story`, `/api/subscription/status`. */
export function monobedtimeQuotaHeaders(): Record<string, string> {
  if (typeof window === "undefined") {
    return {};
  }

  return {
    "x-monobedtime-day-key": createLocalDayKey(),
    "x-monobedtime-session-id": ensureMonobedtimeSessionId(),
  };
}
