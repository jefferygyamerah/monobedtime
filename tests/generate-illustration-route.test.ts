import assert from "node:assert/strict";
import test, { mock } from "node:test";

type IllustrationRouteModule = {
  POST: (request: Request) => Promise<Response>;
};

async function loadIllustrationRoute() {
  const headersMock = mock.module("next/headers", {
    namedExports: {
      cookies: () => ({
        get: () => undefined,
      }),
    },
  });

  const module = (await import(
    `../app/api/generate-illustration/route.ts?illustration-test=${Date.now()}-${Math.random()}`
  )) as IllustrationRouteModule;

  headersMock.restore();
  return module;
}

function validIllustrationRequestBody() {
  return {
    title: "Mono and the moon",
    prompt: "Mono keeps Luna calm under the moon",
    sceneType: "moon",
    language: "en",
  };
}

test("generate-illustration returns 422 for schema errors", async () => {
  const { POST } = await loadIllustrationRoute();
  const response = await POST(
    new Request("http://localhost/api/generate-illustration", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: "",
      }),
    }),
  );
  const payload = (await response.json()) as { code?: string };

  assert.equal(response.status, 422);
  assert.equal(payload.code, "INVALID_ILLUSTRATION_REQUEST");
});

test("generate-illustration enforces free image limit", async () => {
  const { POST } = await loadIllustrationRoute();
  const dayKey = "2026-04-18";
  const sessionId = `test-image-session-${Date.now()}`;

  for (let index = 0; index < 3; index += 1) {
    const allowedResponse = await POST(
      new Request("http://localhost/api/generate-illustration", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-monobedtime-day-key": dayKey,
          "x-monobedtime-session-id": sessionId,
        },
        body: JSON.stringify(validIllustrationRequestBody()),
      }),
    );

    assert.equal(allowedResponse.status, 200);
  }

  const blockedResponse = await POST(
    new Request("http://localhost/api/generate-illustration", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-monobedtime-day-key": dayKey,
        "x-monobedtime-session-id": sessionId,
      },
      body: JSON.stringify(validIllustrationRequestBody()),
    }),
  );
  const payload = (await blockedResponse.json()) as { code?: string };

  assert.equal(blockedResponse.status, 402);
  assert.equal(payload.code, "FREE_IMAGE_LIMIT_REACHED");
});
