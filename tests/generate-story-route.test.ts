import assert from "node:assert/strict";
import test, { mock } from "node:test";

type StoryRouteModule = {
  FREE_STORY_LIMIT_PER_DAY: number;
  POST: (request: Request) => Promise<Response>;
};

async function loadStoryRoute() {
  const headersMock = mock.module("next/headers", {
    namedExports: {
      cookies: () => ({
        get: () => undefined,
      }),
    },
  });

  const module = (await import(
    `../app/api/generate-story/route.ts?story-test=${Date.now()}-${Math.random()}`
  )) as StoryRouteModule;

  headersMock.restore();
  return module;
}

function validStoryRequestBody() {
  return {
    kidName: "Luna",
    age: 6,
    language: "en",
    culturalBackground: "Afrolatina",
    location: "Panama City",
    theme: "moonlight and cuddles",
    bedtimeMood: "calm",
    premium: true,
  };
}

test("generate-story returns 400 for invalid json", async () => {
  const { POST } = await loadStoryRoute();
  const response = await POST(
    new Request("http://localhost/api/generate-story", {
      method: "POST",
      body: "{",
    }),
  );
  const payload = (await response.json()) as { code?: string };

  assert.equal(response.status, 400);
  assert.equal(payload.code, "INVALID_JSON");
});

test("generate-story enforces daily free-story limit", async () => {
  const { POST, FREE_STORY_LIMIT_PER_DAY } = await loadStoryRoute();
  const dayKey = "2026-04-18";
  const sessionId = `test-session-${Date.now()}`;

  for (let index = 0; index < FREE_STORY_LIMIT_PER_DAY; index += 1) {
    const allowedResponse = await POST(
      new Request("http://localhost/api/generate-story", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-monobedtime-day-key": dayKey,
          "x-monobedtime-session-id": sessionId,
        },
        body: JSON.stringify(validStoryRequestBody()),
      }),
    );

    assert.equal(allowedResponse.status, 200);
  }

  const blockedResponse = await POST(
    new Request("http://localhost/api/generate-story", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-monobedtime-day-key": dayKey,
        "x-monobedtime-session-id": sessionId,
      },
      body: JSON.stringify(validStoryRequestBody()),
    }),
  );
  const payload = (await blockedResponse.json()) as { code?: string };

  assert.equal(blockedResponse.status, 429);
  assert.equal(payload.code, "FREE_STORY_LIMIT_REACHED");
});
