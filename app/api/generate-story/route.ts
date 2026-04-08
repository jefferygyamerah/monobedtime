import { bedtimeRequestSchema } from "@/lib/story-contract";
import { generateBedtimeStory } from "@/server/generate-story-runtime";
import { ZodError } from "zod";

export const runtime = "nodejs";

function toErrorMessage(error: unknown) {
  if (error instanceof ZodError) {
    const firstIssue = error.issues[0];
    const field = firstIssue?.path.join(".");
    const issueMessage = firstIssue?.message;

    if (field === "age") {
      return "Age must be between 0 and 12.";
    }

    if (field === "summary") {
      return "The story draft came back too long, so we could not use it. Please try again.";
    }

    if (field) {
      return `Story validation failed at ${field}: ${issueMessage ?? "invalid value"}`;
    }

    return "We could not shape the story into the expected bedtime format. Please try again.";
  }

  return error instanceof Error
    ? error.message
    : "No pudimos crear el cuento de esta noche.";
}

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
    return Response.json(
      {
        error: toErrorMessage(error),
      },
      {
        status: 400,
      },
    );
  }
}
