import { expect, test } from "@playwright/test";

test.describe("API validation", () => {
  test("GET /api/ai-status returns expected shape", async ({ request }) => {
    const response = await request.get("/api/ai-status");
    expect(response.ok()).toBeTruthy();
    const body = (await response.json()) as Record<string, unknown>;
    expect(body).toMatchObject({
      storyWriterConfigured: expect.any(Boolean),
      storyReviewerConfigured: expect.any(Boolean),
      imageGeneratorConfigured: expect.any(Boolean),
      subscriptionConfigured: expect.any(Boolean),
    });
  });

  test("POST /api/generate-story rejects invalid JSON", async ({ request }) => {
    const response = await request.post("/api/generate-story", {
      headers: { "Content-Type": "application/json" },
      body: "{",
    });
    expect(response.status()).toBe(400);
    const body = (await response.json()) as { code?: string };
    expect(body.code).toBe("INVALID_JSON");
  });

  test("POST /api/generate-illustration rejects invalid JSON", async ({ request }) => {
    const response = await request.post("/api/generate-illustration", {
      headers: { "Content-Type": "application/json" },
      body: "{",
    });
    expect(response.status()).toBe(400);
    const body = (await response.json()) as { code?: string };
    expect(body.code).toBe("INVALID_JSON");
  });
});
