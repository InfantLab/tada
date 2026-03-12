import { test, expect } from "@playwright/test";

test.describe("Register Page", () => {
  test("renders registration form with expected fields", async ({ page }) => {
    await page.goto("/register");

    await expect(
      page.getByRole("heading", { name: /Join Ta-Da/i }),
    ).toBeVisible();
    await expect(page.getByLabel("Username")).toBeVisible();
    await expect(page.getByLabel("Email", { exact: false })).toBeVisible();
    await expect(page.getByLabel("Password", { exact: true })).toBeVisible();
    await expect(page.getByLabel("Confirm Password")).toBeVisible();
  });

  test("has a submit button", async ({ page }) => {
    await page.goto("/register");

    await expect(
      page.getByRole("button", { name: /Create Account/i }),
    ).toBeVisible();
  });

  test("has a link back to login", async ({ page }) => {
    await page.goto("/register");

    await expect(
      page.getByRole("button", { name: /Already have an account/i }),
    ).toBeVisible();
  });
});
