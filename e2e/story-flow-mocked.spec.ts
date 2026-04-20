import { expect, test } from "@playwright/test";
import {
  mockAiStatus,
  mockBedtimeStory,
  mockIllustration,
  mockSubscriptionStatus,
} from "./fixtures/mock-api";

test.describe("Story flow (mocked APIs)", () => {
  test("completes setup, generates story, and opens reader", async ({ page }) => {
    await page.route("**/api/ai-status", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockAiStatus),
      });
    });

    await page.route("**/api/subscription/status", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockSubscriptionStatus),
      });
    });

    await page.route("**/api/generate-story", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockBedtimeStory),
      });
    });

    await page.route("**/api/generate-illustration", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ...mockIllustration,
          usage: mockSubscriptionStatus.usage,
        }),
      });
    });

    await page.goto("/");

    await page.getByPlaceholder("For example, Luna").fill("E2E Child");
    await page.getByTestId("setup-continue").click();

    await page.getByPlaceholder("2 months old").fill("5 years");
    await page.getByPlaceholder("Spanish and English").fill("English");
    await page.getByTestId("setup-continue").click();

    await page.getByTestId("setup-continue").click();

    await expect(page.getByText("Bedtime feels like a premiere again.")).toBeVisible();

    await page.getByLabel("Story prompt input").fill("Mono helps E2E Child settle under the moon.");

    await page.getByTestId("generate-story").click();

    await expect(page.getByText("E2E Mock Bedtime Title")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId("reader-new-story")).toBeVisible();
  });
});
