import "server-only";

import {
  illustrationRequestSchema,
  illustrationResponseSchema,
  type IllustrationRequest,
  type IllustrationResponse,
} from "@/lib/story-contract";

const UNSPLASH_APP_NAME = "monobedtime";
/** Queue API is fal’s recommended path; survives cold starts better than synchronous fal.run. */
const FAL_FLUX_QUEUE_SUBMIT_URL = "https://queue.fal.run/fal-ai/flux/schnell";
const FAL_FETCH_TIMEOUT_MS = 120_000;
const FAL_QUEUE_POLL_MS = 750;

function freeTierPrefersStockPhotosFirst() {
  return process.env.MONOBEDTIME_FREE_TIER_STOCK_FIRST === "true";
}

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

function buildUnsplashAttributionLinks(photoUrl: string, photographerUrl: string) {
  const photo = new URL(photoUrl);
  photo.searchParams.set("utm_source", UNSPLASH_APP_NAME);
  photo.searchParams.set("utm_medium", "referral");

  const profile = new URL(photographerUrl);
  profile.searchParams.set("utm_source", UNSPLASH_APP_NAME);
  profile.searchParams.set("utm_medium", "referral");

  return {
    photoUrl: photo.toString(),
    photographerUrl: profile.toString(),
  };
}

function toUnsplashImageUrl(rawUrl: string) {
  const url = new URL(rawUrl);
  url.searchParams.set("auto", "format");
  url.searchParams.set("fit", "crop");
  url.searchParams.set("crop", "entropy");
  url.searchParams.set("w", "1600");
  url.searchParams.set("h", "900");
  url.searchParams.set("q", "80");
  return url.toString();
}

function sceneQueryHint(sceneType: IllustrationRequest["sceneType"]) {
  switch (sceneType) {
    case "moon":
      return "moonlight night sky";
    case "clouds":
      return "soft clouds night";
    case "forest":
      return "quiet forest night";
    case "jungle":
      return "gentle jungle night";
    case "ocean":
      return "calm ocean night";
    case "mountains":
      return "sleepy mountains night";
    case "village":
      return "warm village night";
    case "city":
      return "quiet city night";
    default:
      return "bedtime night";
  }
}

function buildUnsplashQuery(input: IllustrationRequest) {
  const base = `${sceneQueryHint(input.sceneType)} ${input.title} ${input.prompt}`
    .replace(/[^\w\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // Keep the query short and avoid names leaking into search.
  return base.split(" ").slice(0, 14).join(" ").trim() || sceneQueryHint(input.sceneType);
}

async function tryUnsplash(input: IllustrationRequest): Promise<IllustrationResponse | null> {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY?.trim();
  if (!accessKey) {
    return null;
  }

  const searchUrl = new URL("https://api.unsplash.com/search/photos");
  searchUrl.searchParams.set("query", buildUnsplashQuery(input));
  searchUrl.searchParams.set("orientation", "landscape");
  searchUrl.searchParams.set("content_filter", "high");
  searchUrl.searchParams.set("per_page", "10");

  const response = await fetch(searchUrl, {
    headers: {
      Authorization: `Client-ID ${accessKey}`,
      "Accept-Version": "v1",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as {
    results?: Array<{
      urls?: { raw?: string };
      links?: { html?: string; download_location?: string };
      user?: { name?: string; links?: { html?: string } };
    }>;
  };

  const pick = payload.results?.find((result) => Boolean(result.urls?.raw && result.user?.name));
  if (!pick?.urls?.raw || !pick.user?.name) {
    return null;
  }

  // Unsplash API guideline: hit download_location when the photo is used.
  if (pick.links?.download_location) {
    fetch(`${pick.links.download_location}`, {
      headers: {
        Authorization: `Client-ID ${accessKey}`,
        "Accept-Version": "v1",
      },
      cache: "no-store",
    }).catch(() => undefined);
  }

  const photoUrlRaw = pick.links?.html ?? "https://unsplash.com";
  const photographerUrlRaw = pick.user.links?.html ?? "https://unsplash.com";
  const { photoUrl, photographerUrl } = buildUnsplashAttributionLinks(
    photoUrlRaw,
    photographerUrlRaw,
  );

  return illustrationResponseSchema.parse({
    imageDataUrl: toUnsplashImageUrl(pick.urls.raw),
    fallback: false,
    note: localizedNote(
      input,
      "Photo selected from Unsplash.",
      "Foto seleccionada de Unsplash.",
    ),
    attribution: {
      provider: "unsplash",
      photographerName: pick.user.name,
      photographerUrl,
      photoUrl,
    },
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

  const submitResponse = await fetch(FAL_FLUX_QUEUE_SUBMIT_URL, {
    method: "POST",
    headers: authHeaders,
    body,
    cache: "no-store",
  });

  if (!submitResponse.ok) {
    const errorText = await submitResponse.text();
    throw new Error(`FAL queue submit failed: ${submitResponse.status} ${errorText}`);
  }

  const submitPayload = (await submitResponse.json()) as {
    request_id?: string;
    status_url?: string;
  };

  const requestId = submitPayload.request_id;
  if (!requestId) {
    throw new Error("FAL queue submit returned no request_id.");
  }

  const statusUrl =
    submitPayload.status_url ??
    `${FAL_FLUX_QUEUE_SUBMIT_URL}/requests/${requestId}/status`;

  const deadline = Date.now() + FAL_FETCH_TIMEOUT_MS;
  let completedOk = false;

  while (Date.now() < deadline) {
    const statusResponse = await fetch(statusUrl, {
      headers: { Authorization: `Key ${falKey}` },
      cache: "no-store",
    });

    if (!statusResponse.ok) {
      const errorText = await statusResponse.text();
      throw new Error(`FAL queue status failed: ${statusResponse.status} ${errorText}`);
    }

    const statusPayload = (await statusResponse.json()) as {
      status?: string;
      error?: string;
      error_type?: string;
    };

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

    await new Promise((resolve) => setTimeout(resolve, FAL_QUEUE_POLL_MS));
  }

  if (!completedOk) {
    throw new Error("FAL queue timed out waiting for completion.");
  }

  const resultUrl = `${FAL_FLUX_QUEUE_SUBMIT_URL}/requests/${requestId}`;
  const resultResponse = await fetch(resultUrl, {
    headers: { Authorization: `Key ${falKey}` },
    cache: "no-store",
  });

  if (!resultResponse.ok) {
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

export async function generateIllustration(rawInput: unknown) {
  return generateIllustrationWithOptions(rawInput, { preferUnsplash: false });
}

export async function generateIllustrationWithOptions(
  rawInput: unknown,
  options?: { preferUnsplash?: boolean },
) {
  const input = illustrationRequestSchema.parse(rawInput);
  const preferUnsplash = options?.preferUnsplash ?? false;

  if (preferUnsplash) {
    const stockFirst = freeTierPrefersStockPhotosFirst();

    if (stockFirst) {
      const unsplash = await tryUnsplash(input);
      if (unsplash) {
        return unsplash;
      }
    }

    if (isFalConfigured()) {
      try {
        return await tryFalImage(input);
      } catch (falError) {
        logIllustrationRuntimeEvent("warn", "fal_image_failed_free_tier", {
          message: falError instanceof Error ? falError.message : String(falError),
          stockFirstTried: stockFirst,
        });
      }
    }

    if (!stockFirst) {
      const unsplash = await tryUnsplash(input);
      if (unsplash) {
        return unsplash;
      }
    }

    logIllustrationRuntimeEvent("warn", "free_tier_no_illustration_source", {
      sceneType: input.sceneType,
      language: input.language,
      falConfigured: isFalConfigured(),
      unsplashConfigured: Boolean(process.env.UNSPLASH_ACCESS_KEY?.trim()),
    });

    return buildFallback(
      input,
      localizedNote(
        input,
        "We could not load an AI or stock photo illustration, so the app is showing the built-in scene.",
        "No pudimos cargar una ilustracion con IA ni de stock, asi que la app muestra la escena integrada.",
      ),
    );
  }

  if (isFalConfigured()) {
    try {
      return await tryFalImage(input);
    } catch (falError) {
      logIllustrationRuntimeEvent("warn", "fal_image_failed", {
        message: falError instanceof Error ? falError.message : String(falError),
      });
    }
  }

  const unsplash = await tryUnsplash(input);
  if (unsplash) {
    return unsplash;
  }

  logIllustrationRuntimeEvent("warn", "no_illustration_after_fal", {
    sceneType: input.sceneType,
    language: input.language,
    falConfigured: isFalConfigured(),
    unsplashConfigured: Boolean(process.env.UNSPLASH_ACCESS_KEY?.trim()),
  });

  return buildFallback(
    input,
    localizedNote(
      input,
      "We could not create a FAL illustration or load a stock photo, so the app is showing the built-in scene.",
      "No pudimos crear una ilustracion con FAL ni cargar una foto de stock, asi que la app muestra la escena integrada.",
    ),
  );
}
