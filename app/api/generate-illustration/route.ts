import { illustrationRequestSchema } from "@/lib/story-contract";
import { generateIllustration } from "@/server/generate-illustration-runtime";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const rawInput = await request.json();
    illustrationRequestSchema.parse(rawInput);

    const illustration = await generateIllustration(rawInput);
    return Response.json(illustration, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "No pudimos crear la ilustracion de esta escena.";

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
