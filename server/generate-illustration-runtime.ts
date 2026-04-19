import "server-only";

import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateImage } from "ai";
import {
  illustrationRequestSchema,
  illustrationResponseSchema,
  type IllustrationRequest,
  type IllustrationResponse,
} from "@/lib/story-contract";

let googleProvider: ReturnType<typeof createGoogleGenerativeAI> | null = null;

const UNSPLASH_APP_NAME = "monobedtime";

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

function getGoogle() {
  if (!googleProvider) {
    googleProvider = createGoogleGenerativeAI({
      apiKey:
        process.env.GEMINI_API_KEY ??
        process.env.GOOGLE_GENERATIVE_AI_API_KEY ??
        "",
    });
  }

  return googleProvider;
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

function toErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

function quotaFallbackNote(
  error: unknown,
  input: IllustrationRequest,
) {
  const message = toErrorMessage(error).toLowerCase();

  if (
    message.includes("quota exceeded") ||
    message.includes("limit: 0") ||
    message.includes("paid plans")
  ) {
    return localizedNote(
      input,
      "Gemini image quota is unavailable on this deployment, so the app is showing the built-in illustration.",
      "La cuota de imagen de Gemini no esta disponible en este despliegue, asi que la app muestra la ilustracion integrada.",
    );
  }

  return null;
}

function toIllustrationResponse(
  mediaType: string,
  base64: string,
  note: string,
): IllustrationResponse {
  return illustrationResponseSchema.parse({
    imageDataUrl: `data:${mediaType};base64,${base64}`,
    fallback: false,
    note,
  });
}

async function tryGeminiImage(input: IllustrationRequest) {
  const result = await generateImage({
    model: getGoogle().image("gemini-2.5-flash-image"),
    prompt: buildPrompt(input),
    aspectRatio: "16:9",
    maxRetries: 0,
    providerOptions: {
      google: {
        personGeneration: "allow_all",
      },
    },
  });

  return toIllustrationResponse(
    result.image.mediaType,
    result.image.base64,
    localizedNote(
      input,
      "AI illustration generated with Gemini.",
      "Ilustracion generada con Gemini.",
    ),
  );
}

async function tryGeminiPreviewImage(input: IllustrationRequest) {
  const result = await generateImage({
    model: getGoogle().image("gemini-3.1-flash-image-preview"),
    prompt: buildPrompt(input),
    aspectRatio: "16:9",
    maxRetries: 0,
    providerOptions: {
      google: {
        personGeneration: "allow_all",
      },
    },
  });

  return toIllustrationResponse(
    result.image.mediaType,
    result.image.base64,
    localizedNote(
      input,
      "AI illustration generated with Gemini preview.",
      "Ilustracion generada con Gemini preview.",
    ),
  );
}

async function tryImagen(input: IllustrationRequest) {
  const result = await generateImage({
    model: getGoogle().image("imagen-4.0-fast-generate-001"),
    prompt: buildPrompt(input),
    aspectRatio: "16:9",
    maxRetries: 0,
    providerOptions: {
      google: {
        personGeneration: "allow_all",
      },
    },
  });

  return toIllustrationResponse(
    result.image.mediaType,
    result.image.base64,
    localizedNote(
      input,
      "AI illustration generated with Google Imagen.",
      "Ilustracion generada con Google Imagen.",
    ),
  );
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
  const apiKey =
    process.env.GEMINI_API_KEY ?? process.env.GOOGLE_GENERATIVE_AI_API_KEY;

  if (preferUnsplash) {
    const unsplash = await tryUnsplash(input);
    if (unsplash) {
      return unsplash;
    }

    logIllustrationRuntimeEvent("warn", "unsplash_not_available_preferred", {
      sceneType: input.sceneType,
      language: input.language,
    });

    return buildFallback(
      input,
      localizedNote(
        input,
        "Unsplash is not configured on this deployment yet, so the app is showing the built-in illustration.",
        "Unsplash todavia no esta configurado en este despliegue, asi que la app muestra la ilustracion integrada.",
      ),
    );
  }

  if (!apiKey) {
    const unsplash = await tryUnsplash(input);
    if (unsplash) {
      return unsplash;
    }

    logIllustrationRuntimeEvent("warn", "gemini_not_configured_fallback", {
      sceneType: input.sceneType,
      language: input.language,
    });

    return buildFallback(
      input,
      localizedNote(
        input,
        "Gemini is not configured on this deployment yet, so the app is showing the built-in illustration.",
        "Gemini todavia no esta configurado en este despliegue, asi que la app muestra la ilustracion integrada.",
      ),
    );
  }

  try {
    return await tryGeminiImage(input);
  } catch (geminiError) {
    logIllustrationRuntimeEvent("warn", "gemini_image_failed", {
      message: geminiError instanceof Error ? geminiError.message : String(geminiError),
    });

    const note = quotaFallbackNote(geminiError, input);

    if (note) {
      const unsplash = await tryUnsplash(input);
      if (unsplash) {
        return unsplash;
      }

      return buildFallback(input, note);
    }
  }

  try {
    return await tryGeminiPreviewImage(input);
  } catch (geminiPreviewError) {
    logIllustrationRuntimeEvent("warn", "gemini_preview_failed", {
      message:
        geminiPreviewError instanceof Error
          ? geminiPreviewError.message
          : String(geminiPreviewError),
    });

    const note = quotaFallbackNote(geminiPreviewError, input);

    if (note) {
      const unsplash = await tryUnsplash(input);
      if (unsplash) {
        return unsplash;
      }

      return buildFallback(input, note);
    }
  }

  try {
    return await tryImagen(input);
  } catch (imagenError) {
    logIllustrationRuntimeEvent("error", "imagen_failed_fallback", {
      message: imagenError instanceof Error ? imagenError.message : String(imagenError),
      sceneType: input.sceneType,
      language: input.language,
    });

    const unsplash = await tryUnsplash(input);
    if (unsplash) {
      return unsplash;
    }

    return buildFallback(
      input,
      quotaFallbackNote(imagenError, input) ??
        localizedNote(
          input,
          "AI illustration could not finish, so the app is showing the built-in illustration.",
          "No pudimos terminar la ilustracion con IA, asi que la app muestra la ilustracion integrada.",
        ),
    );
  }
}
