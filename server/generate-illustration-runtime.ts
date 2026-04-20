import "server-only";

import {
  illustrationRequestSchema,
  illustrationResponseSchema,
  type IllustrationRequest,
  type IllustrationResponse,
} from "@/lib/story-contract";

/** Queue API — recommended by fal for production (retries, durable queue). */
const FAL_FLUX_QUEUE_SUBMIT_URL = "https://queue.fal.run/fal-ai/flux/schnell";
const FAL_FETCH_TIMEOUT_MS = 120_000;
const FAL_QUEUE_POLL_MS = 600;
const FAL_SINGLE_FETCH_MAX_MS = 45_000;

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
    const nested = fromImages((data as Record<string, unknown>).images);
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
    enable_safety_checker: true,
  });
}

function fetchTimeoutMs(deadline: number) {
  const left = deadline - Date.now();
  return Math.min(FAL_SINGLE_FETCH_MAX_MS, Math.max(5_000, left));
}

async function tryFalImage(input: IllustrationRequest) {
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

    if (statusPayload.status === "COMPLETED") {
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

    if (
      statusPayload.status &&
      !["IN_QUEUE", "IN_PROGRESS"].includes(statusPayload.status)
    ) {
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

  const resultResponse = await fetch(resultFetchUrl, {
    headers: { Authorization: `Key ${falKey}` },
    cache: "no-store",
    signal: AbortSignal.timeout(fetchTimeoutMs(deadline)),
  });

  if (!resultResponse.ok) {
    const fallbackUrl = `${FAL_FLUX_QUEUE_SUBMIT_URL}/requests/${requestId}`;
    if (resultFetchUrl !== fallbackUrl) {
      const retry = await fetch(fallbackUrl, {
        headers: { Authorization: `Key ${falKey}` },
        cache: "no-store",
        signal: AbortSignal.timeout(fetchTimeoutMs(deadline)),
      });
      if (retry.ok) {
        const payloadRetry: unknown = await retry.json();
        const imageUrlRetry = extractFalImageUrl(payloadRetry);
        if (imageUrlRetry) {
          return illustrationResponseSchema.parse({
            imageDataUrl: imageUrlRetry,
            fallback: false,
            note: localizedNote(
              input,
              "AI illustration generated with FAL.",
              "Ilustracion generada con FAL.",
            ),
          });
        }
      }
    }
    const errorText = await resultResponse.text();
    throw new Error(`FAL queue result failed: ${resultResponse.status} ${errorText}`);
  }

  const payload: unknown = await resultResponse.json();
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
 * Generate illustration via FAL only. Returns built-in fallback (HTTP 200 from route) when FAL
 * is missing or fails — avoids 502 for model/infrastructure errors.
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

  try {
    return await tryFalImage(input);
  } catch (falError) {
    const message = falError instanceof Error ? falError.message : String(falError);
    logIllustrationRuntimeEvent("warn", "fal_image_failed", { message });
    return buildFallback(
      input,
      localizedNote(
        input,
        "FAL illustration did not finish. Built-in scene shown; try again shortly.",
        "La ilustracion FAL no termino. Escena integrada; reintenta pronto.",
      ),
    );
  }
}

/** @deprecated Use {@link generateIllustration}; Unsplash and tier branching were removed. */
export async function generateIllustrationWithOptions(
  rawInput: unknown,
  _options?: unknown,
) {
  return generateIllustration(rawInput);
}
