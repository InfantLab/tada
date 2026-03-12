import { test, expect } from "@playwright/test";

test.describe("Homepage / Landing Page", () => {
  test("loads and shows the app heading", async ({ page }) => {
    await page.goto("/");

    // The landing page (shown to unauthenticated users) has a prominent heading
    await expect(
      page.getByRole("heading", { name: /Notice Your Life/i }),
    ).toBeVisible();
  });

  test("shows call-to-action buttons", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("link", { name: /Get Started Free/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Sign In/i })).toBeVisible();
  });

  test("displays feature cards", async ({ page }) => {
    await page.goto("/");

    // The landing page lists key features
    await expect(page.getByText("Sessions")).toBeVisible();
    await expect(page.getByText("Ta-Da!")).toBeVisible();
    await expect(page.getByText("Moments")).toBeVisible();
    await expect(page.getByText("Rhythms")).toBeVisible();
  });
});
