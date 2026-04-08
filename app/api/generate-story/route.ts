import { bedtimeRequestSchema } from "@/lib/story-contract";
import { generateBedtimeStory } from "@/server/generate-story-runtime";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const rawInput = await request.json();
    bedtimeRequestSchema.parse(rawInput);

    const story = await generateBedtimeStory(rawInput);
    return Response.json(story, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No pudimos crear el cuento de esta noche.";

    return Response.json(
      {
        error: message,
      },
      {
        status: 400,
      },
    );
  }
}
