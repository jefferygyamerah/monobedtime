import * as fs from "node:fs";
import * as path from "node:path";
import { expect, test } from "@playwright/test";
import {
  mockAiStatus,
  mockBedtimeStory,
  mockIllustration,
  mockSubscriptionStatus,
} from "./fixtures/mock-api";

const outDir = path.join(process.cwd(), "docs", "ux-audit-screenshots");

test.describe.configure({ mode: "serial", timeout: 180_000 });

test.describe("UX audit baseline screenshots", () => {
  test.beforeAll(() => {
    fs.mkdirSync(outDir, { recursive: true });
  });

  test("capture setup, studio, reader, subscription surfaces", async ({ page }) => {
    test.setTimeout(180_000);

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
    await page.evaluate(() => {
      window.localStorage.clear();
    });
    await page.reload();

    await expect(page.getByPlaceholder("For example, Luna")).toBeVisible();
    await page.screenshot({
      path: path.join(outDir, "01-setup-step1-name.png"),
      fullPage: true,
    });

    await page.getByPlaceholder("For example, Luna").fill("Audit Child");
    await page.getByTestId("setup-continue").click();

    await expect(page.getByPlaceholder("2 months old")).toBeVisible();
    await page.screenshot({
      path: path.join(outDir, "02-setup-step2-age-language.png"),
      fullPage: true,
    });

    await page.getByPlaceholder("2 months old").fill("5 years");
    await page.getByPlaceholder("Spanish and English").fill("English");
    await page.getByTestId("setup-continue").click();

    await page.screenshot({
      path: path.join(outDir, "03-setup-step3-companion.png"),
      fullPage: true,
    });

    await page.getByTestId("setup-continue").click();

    await expect(
      page.getByText("Bedtime feels like a premiere again."),
    ).toBeVisible();
    await page.screenshot({
      path: path.join(outDir, "04-studio-prompt.png"),
      fullPage: true,
    });

    await page
      .getByLabel("Story prompt input")
      .fill("Mono helps Audit Child settle under the moon for the UX audit.");

    await page.getByTestId("generate-story").click();

    await expect(page.getByText("E2E Mock Bedtime Title")).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByTestId("reader-new-story")).toBeVisible();
    await page.screenshot({
      path: path.join(outDir, "05-reader-story.png"),
      fullPage: true,
    });

    await page.goto("/subscribe/cancel");
    await page.screenshot({
      path: path.join(outDir, "06-subscribe-cancel.png"),
      fullPage: true,
    });

    await page.goto("/subscribe/success");
    await page.screenshot({
      path: path.join(outDir, "07-subscribe-success-unconfirmed.png"),
      fullPage: true,
    });
  });
});
