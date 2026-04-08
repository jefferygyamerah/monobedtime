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
  const input = illustrationRequestSchema.parse(rawInput);
  const apiKey =
    process.env.GEMINI_API_KEY ?? process.env.GOOGLE_GENERATIVE_AI_API_KEY;

  if (!apiKey) {
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
    console.error("Gemini illustration attempt failed, trying Gemini preview:", geminiError);

    const note = quotaFallbackNote(geminiError, input);

    if (note) {
      return buildFallback(input, note);
    }
  }

  try {
    return await tryGeminiPreviewImage(input);
  } catch (geminiPreviewError) {
    console.error(
      "Gemini preview illustration attempt failed, trying Imagen:",
      geminiPreviewError,
    );

    const note = quotaFallbackNote(geminiPreviewError, input);

    if (note) {
      return buildFallback(input, note);
    }
  }

  try {
    return await tryImagen(input);
  } catch (imagenError) {
    console.error(
      "Monobedtime illustration generation fell back after Gemini and Imagen failures:",
      imagenError,
    );

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
