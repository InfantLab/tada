import { test, expect } from "@playwright/test";

test.describe("Navigation", () => {
  test("homepage 'Get Started Free' links to register page", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("link", { name: /Get Started Free/i }).click();

    await expect(page).toHaveURL(/\/register/);
    await expect(
      page.getByRole("heading", { name: /Join Ta-Da/i }),
    ).toBeVisible();
  });

  test("homepage 'Sign In' links to login page", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("link", { name: /Sign In/i }).click();

    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByLabel("Username")).toBeVisible();
  });

  test("register page links back to login", async ({ page }) => {
    await page.goto("/register");

    await page.getByRole("button", { name: /Already have an account/i }).click();

    await expect(page).toHaveURL(/\/login/);
  });

  test("about page is accessible", async ({ page }) => {
    await page.goto("/about");

    // Page should load without error (not a 404)
    await expect(page.locator("body")).not.toContainText("404");
  });
});
