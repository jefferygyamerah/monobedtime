import { isImageSubscriptionConfigured } from "@/server/subscription-access";

export const runtime = "nodejs";

function isConfigured(value?: string | null) {
  return Boolean(value?.trim());
}

export async function GET() {
  const geminiKey =
    process.env.GEMINI_API_KEY ?? process.env.GOOGLE_GENERATIVE_AI_API_KEY ?? "";
  const unsplashKey = process.env.UNSPLASH_ACCESS_KEY ?? "";

  return Response.json(
    {
      storyWriterConfigured: isConfigured(process.env.DEEPSEEK_API_KEY),
      storyReviewerConfigured: isConfigured(geminiKey),
      imageGeneratorConfigured: isConfigured(geminiKey) || isConfigured(unsplashKey),
      subscriptionConfigured: isImageSubscriptionConfigured(),
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
