import "server-only";

import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateImage, generateText } from "ai";
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
    return "Write any internal reasoning in English, but do not render visible text inside the image.";
  }

  if (language === "bilingual") {
    return "The story is bilingual. Keep the illustration universal, warm, and text-free so it works in both Spanish and English.";
  }

  return "The story is in Spanish. Keep the illustration expressive and text-free.";
}

function buildPrompt(input: IllustrationRequest) {
  return [
    "Create a premium bedtime-story illustration for a family app called Monobedtime.",
    "The image must look like a polished children's picture book scene with soft cinematic lighting.",
    "Do not place readable text, captions, letters, logos, or watermarks inside the image.",
    "Keep the child-safe tone gentle, sleepy, calm, and emotionally warm.",
    "Use rich blacks, pure white highlights, and subtle orange warmth that fits the Monobedtime brand.",
    languageDirection(input.language),
    `Scene title: ${input.title}`,
    `Scene type: ${input.sceneType}`,
    `Scene brief: ${input.prompt}`,
    "Composition rules: close enough for emotional connection, clear focal subject, cozy bedtime atmosphere, premium illustration finish.",
  ].join("\n");
}

function buildFallback(note: string): IllustrationResponse {
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

function quotaFallbackNote(error: unknown) {
  const message = toErrorMessage(error).toLowerCase();

  if (message.includes("quota exceeded")) {
    return "Tu llave de Gemini todavia no tiene cuota de imagen habilitada. Seguimos usando la ilustracion base.";
  }

  if (message.includes("paid plans")) {
    return "Este proyecto todavia no tiene un plan de imagen activo en Gemini. Seguimos usando la ilustracion base.";
  }

  return null;
}

async function tryGeminiImage(input: IllustrationRequest) {
  const result = await generateText({
    model: getGoogle()("gemini-3.1-flash-image-preview"),
    prompt: buildPrompt(input),
    maxRetries: 0,
    providerOptions: {
      google: {
        responseModalities: ["IMAGE"],
      },
    },
    temperature: 0.7,
  });

  const image = result.files.find((file) => file.mediaType.startsWith("image/"));

  if (!image) {
    throw new Error("Gemini did not return an image file.");
  }

  return illustrationResponseSchema.parse({
    imageDataUrl: `data:${image.mediaType};base64,${image.base64}`,
    fallback: false,
    note: "Premium illustration generated with Gemini.",
  });
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

  return illustrationResponseSchema.parse({
    imageDataUrl: `data:${result.image.mediaType};base64,${result.image.base64}`,
    fallback: false,
    note: "Premium illustration generated with Google Imagen.",
  });
}

export async function generateIllustration(rawInput: unknown) {
  const input = illustrationRequestSchema.parse(rawInput);
  const apiKey =
    process.env.GEMINI_API_KEY ?? process.env.GOOGLE_GENERATIVE_AI_API_KEY;

  if (!apiKey) {
    return buildFallback(
      "Using the built-in scene art while Gemini is not configured yet.",
    );
  }

  try {
    return await tryGeminiImage(input);
  } catch (geminiError) {
    console.error("Gemini illustration attempt failed, trying Imagen:", geminiError);

    const note = quotaFallbackNote(geminiError);

    if (note) {
      return buildFallback(note);
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
      quotaFallbackNote(imagenError) ??
        "No pudimos terminar la ilustracion premium, asi que dejamos la escena base.",
    );
  }
}
