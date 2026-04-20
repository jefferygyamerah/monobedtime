import "server-only";

import {
  illustrationRequestSchema,
  illustrationResponseSchema,
  type IllustrationRequest,
  type IllustrationResponse,
} from "@/lib/story-contract";

/** Synchronous endpoint — often fastest when it completes within the server timeout budget. */
const FAL_FLUX_SYNC_URL = "https://fal.run/fal-ai/flux/schnell";
/** Queue API — durable; use when sync fails or times out. */
const FAL_FLUX_QUEUE_SUBMIT_URL = "https://queue.fal.run/fal-ai/flux/schnell";
const FAL_FETCH_TIMEOUT_MS = 120_000;
const FAL_QUEUE_POLL_MS = 600;
const FAL_SINGLE_FETCH_MAX_MS = 45_000;

/** Default ms for sync attempt (fits Vercel Hobby ~10s wall clock with overhead). */
const FAL_SYNC_BUDGET_MS_DEFAULT = 9_000;

function extractFalImageUrl(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const pickUrl = (entry: unknown): string | null => {
    if (!entry || typeof entry !== "object") {
      return null;
    }
    const o = entry as Record<string, unknown>;
    const raw = o.url ?? o.file_url;
    return typeof raw === "string" && raw.length > 0 ? raw : null;
  };

  const root = payload as Record<string, unknown>;

  const img = root.image;
  if (img && typeof img === "object") {
    const u = pickUrl(img);
    if (u) {
      return u;
    }
  }

  const fromImages = (images: unknown): string | null => {
    if (!Array.isArray(images) || images.length === 0) {
      return null;
    }
    return pickUrl(images[0]);
  };

  const direct = fromImages(root.images);
  if (direct) {
    return direct;
  }

  const data = root.data;
  if (data && typeof data === "object") {
    const d = data as Record<string, unknown>;
    const di = d.image;
    if (di && typeof di === "object") {
      const u = pickUrl(di);
      if (u) {
        return u;
      }
    }
    const nested = fromImages(d.images);
    if (nested) {
      return nested;
    }
  }

  const output = root.output;
  if (output && typeof output === "object") {
    const nested = fromImages((output as Record<string, unknown>).images);
    if (nested) {
      return nested;
    }
  }

  const result = root.result;
  if (result && typeof result === "object") {
    const r = result as Record<string, unknown>;
    const nested = fromImages(r.images);
    if (nested) {
      return nested;
    }
  }

  return null;
}

function logIllustrationRuntimeEvent(
  level: "warn" | "error",
  event: string,
  payload: Record<string, unknown>,
) {
  const logger = level === "warn" ? console.warn : console.error;
  logger(
    JSON.stringify({
      scope: "monobedtime.illustration-runtime",
      event,
      ...payload,
      timestamp: new Date().toISOString(),
    }),
  );
}

function getFalApiKey() {
  return process.env.FAL_KEY ?? process.env.FAL_API_KEY ?? "";
}

function isFalConfigured() {
  return Boolean(getFalApiKey().trim());
}

function languageDirection(language: IllustrationRequest["language"]) {
  if (language === "en") {
    return "Keep the illustration warm, gentle, and completely text-free.";
  }

  if (language === "bilingual") {
    return "The story is bilingual. Keep the illustration universal, warm, and text-free so it works in both Spanish and English.";
  }

  return "La historia es en espanol. Mantén la ilustracion expresiva, suave y sin texto visible.";
}

function buildPrompt(input: IllustrationRequest) {
  return [
    "Create a premium bedtime-story illustration for a family app called Monobedtime.",
    "The image must feel safe for babies, toddlers, and young children.",
    "Do not place readable text, captions, letters, logos, or watermarks inside the image.",
    "Keep the tone gentle, sleepy, emotionally warm, and visually clear.",
    "Use soft moonlight, warm neutrals, and subtle orange warmth that fits the Monobedtime brand.",
    languageDirection(input.language),
    `Scene title: ${input.title}`,
    `Scene type: ${input.sceneType}`,
    `Scene brief: ${input.prompt}`,
    "Composition rules: close enough for emotional connection, clear focal subject, cozy bedtime atmosphere, premium picture-book finish.",
  ].join("\n");
}

function localizedNote(
  input: IllustrationRequest,
  english: string,
  spanish: string,
) {
  return input.language === "en" ? english : spanish;
}

function buildFallback(
  input: IllustrationRequest,
  note: string,
): IllustrationResponse {
  return illustrationResponseSchema.parse({
    imageDataUrl: null,
    fallback: true,
    note,
  });
}

function falFluxInputBody(input: IllustrationRequest) {
  return JSON.stringify({
    prompt: buildPrompt(input),
    image_size: "landscape_16_9",
    num_images: 1,
    /** Lower steps keep sync generation inside typical serverless windows (e.g. Vercel Hobby ~10s). */
    num_inference_steps: 2,
    enable_safety_checker: true,
  });
}

function fetchTimeoutMs(deadline: number) {
  const left = deadline - Date.now();
  return Math.min(FAL_SINGLE_FETCH_MAX_MS, Math.max(5_000, left));
}

function falSuccessResponse(
  input: IllustrationRequest,
  imageUrl: string,
): IllustrationResponse {
  return illustrationResponseSchema.parse({
    imageDataUrl: imageUrl,
    fallback: false,
    note: localizedNote(
      input,
      "AI illustration generated with FAL.",
      "Ilustracion generada con FAL.",
    ),
  });
}

/**
 * Fast path: blocking fal.run call. Returns null so caller can fall back to queue.
 */
async function tryFalSyncGenerate(input: IllustrationRequest): Promise<IllustrationResponse | null> {
  if (process.env.MONOBEDTIME_FAL_QUEUE_ONLY === "1") {
    return null;
  }

  const falKey = getFalApiKey().trim();
  if (!falKey) {
    return null;
  }

  const budgetRaw = process.env.MONOBEDTIME_FAL_SYNC_BUDGET_MS;
  const budget = Math.min(
    60_000,
    Math.max(
      3_000,
      budgetRaw ? Number.parseInt(budgetRaw, 10) || FAL_SYNC_BUDGET_MS_DEFAULT : FAL_SYNC_BUDGET_MS_DEFAULT,
    ),
  );

  try {
    const response = await fetch(FAL_FLUX_SYNC_URL, {
      method: "POST",
      headers: {
        Authorization: `Key ${falKey}`,
        "Content-Type": "application/json",
      },
      body: falFluxInputBody(input),
      cache: "no-store",
      signal: AbortSignal.timeout(budget),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logIllustrationRuntimeEvent("warn", "fal_sync_http_error", {
        status: response.status,
        body: errorText.slice(0, 300),
      });
      return null;
    }

    const payload: unknown = await response.json();
    const imageUrl = extractFalImageUrl(payload);
    if (!imageUrl) {
      logIllustrationRuntimeEvent("warn", "fal_sync_no_image_url", {
        preview:
          typeof payload === "object" && payload !== null
            ? JSON.stringify(payload).slice(0, 400)
            : String(payload),
      });
      return null;
    }

    return falSuccessResponse(input, imageUrl);
  } catch (syncError) {
    logIllustrationRuntimeEvent("warn", "fal_sync_failed", {
      message: syncError instanceof Error ? syncError.message : String(syncError),
    });
    return null;
  }
}

async function fetchQueueResultPayload(
  requestId: string,
  falKey: string,
  primaryUrl: string,
  deadline: number,
): Promise<unknown> {
  const candidates = Array.from(
    new Set([
      primaryUrl,
      `${FAL_FLUX_QUEUE_SUBMIT_URL}/requests/${requestId}/response`,
      `${FAL_FLUX_QUEUE_SUBMIT_URL}/requests/${requestId}`,
    ]),
  );

  let lastError = "unknown";

  for (const url of candidates) {
    try {
      const resultResponse = await fetch(url, {
        headers: { Authorization: `Key ${falKey}` },
        cache: "no-store",
        signal: AbortSignal.timeout(fetchTimeoutMs(deadline)),
      });

      if (!resultResponse.ok) {
        lastError = `${resultResponse.status} ${(await resultResponse.text()).slice(0, 200)}`;
        continue;
      }

      return await resultResponse.json();
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
    }
  }

  throw new Error(`FAL queue result failed (tried ${candidates.length} URLs): ${lastError}`);
}

async function tryFalQueueGenerate(input: IllustrationRequest): Promise<IllustrationResponse> {
  const falKey = getFalApiKey().trim();
  if (!falKey) {
    throw new Error("FAL is not configured.");
  }

  const authHeaders = {
    Authorization: `Key ${falKey}`,
    "Content-Type": "application/json",
  } as const;

  const body = falFluxInputBody(input);
  const deadline = Date.now() + FAL_FETCH_TIMEOUT_MS;

  const submitResponse = await fetch(FAL_FLUX_QUEUE_SUBMIT_URL, {
    method: "POST",
    headers: authHeaders,
    body,
    cache: "no-store",
    signal: AbortSignal.timeout(fetchTimeoutMs(deadline)),
  });

  if (!submitResponse.ok) {
    const errorText = await submitResponse.text();
    throw new Error(`FAL queue submit failed: ${submitResponse.status} ${errorText}`);
  }

  const submitPayload = (await submitResponse.json()) as {
    request_id?: string;
    status_url?: string;
    response_url?: string;
  };

  const requestId = submitPayload.request_id;
  if (!requestId) {
    throw new Error("FAL queue submit returned no request_id.");
  }

  const statusUrl =
    submitPayload.status_url ??
    `${FAL_FLUX_QUEUE_SUBMIT_URL}/requests/${requestId}/status`;

  let resultFetchUrl =
    submitPayload.response_url ??
    `${FAL_FLUX_QUEUE_SUBMIT_URL}/requests/${requestId}`;

  let completedOk = false;

  while (Date.now() < deadline) {
    const statusResponse = await fetch(statusUrl, {
      headers: { Authorization: `Key ${falKey}` },
      cache: "no-store",
      signal: AbortSignal.timeout(fetchTimeoutMs(deadline)),
    });

    if (!statusResponse.ok) {
      const errorText = await statusResponse.text();
      throw new Error(`FAL queue status failed: ${statusResponse.status} ${errorText}`);
    }

    const statusPayload = (await statusResponse.json()) as {
      status?: string;
      error?: string;
      error_type?: string;
      response_url?: string;
    };

    if (statusPayload.response_url) {
      resultFetchUrl = statusPayload.response_url;
    }

    const st = statusPayload.status?.toUpperCase() ?? "";

    if (st === "COMPLETED") {
      if (statusPayload.error) {
        throw new Error(
          `FAL generation failed: ${statusPayload.error}${
            statusPayload.error_type ? ` (${statusPayload.error_type})` : ""
          }`,
        );
      }
      completedOk = true;
      break;
    }

    if (st && !["IN_QUEUE", "IN_PROGRESS"].includes(st)) {
      throw new Error(
        `FAL queue stopped with status ${statusPayload.status}${
          statusPayload.error ? `: ${statusPayload.error}` : ""
        }`,
      );
    }

    await new Promise((resolve) => setTimeout(resolve, FAL_QUEUE_POLL_MS));
  }

  if (!completedOk) {
    throw new Error("FAL queue timed out waiting for completion.");
  }

  const payload = await fetchQueueResultPayload(requestId, falKey, resultFetchUrl, deadline);
  const imageUrl = extractFalImageUrl(payload);
  if (!imageUrl) {
    const preview =
      typeof payload === "object" && payload !== null
        ? JSON.stringify(payload).slice(0, 500)
        : String(payload);
    logIllustrationRuntimeEvent("warn", "fal_unexpected_response_shape", {
      preview,
      requestId,
    });
    throw new Error("FAL image generation returned no image URL.");
  }

  return falSuccessResponse(input, imageUrl);
}

/**
 * FAL-only illustrations. Throws on generation failure so the API route can return 502 with detail.
 * Returns fallback only when FAL_KEY is missing.
 */
export async function generateIllustration(rawInput: unknown) {
  const input = illustrationRequestSchema.parse(rawInput);

  if (!isFalConfigured()) {
    logIllustrationRuntimeEvent("warn", "fal_not_configured", {
      sceneType: input.sceneType,
    });
    return buildFallback(
      input,
      localizedNote(
        input,
        "FAL is not configured (set FAL_KEY). Showing the built-in scene for now.",
        "FAL no esta configurado (FAL_KEY). Mostramos la escena integrada por ahora.",
      ),
    );
  }

  const sync = await tryFalSyncGenerate(input);
  if (sync) {
    return sync;
  }

  return await tryFalQueueGenerate(input);
}
