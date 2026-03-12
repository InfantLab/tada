import { test, expect } from "@playwright/test";

test.describe("Login Page", () => {
  test("renders login form with expected fields", async ({ page }) => {
    await page.goto("/login");

    // Should show the login form
    await expect(page.getByLabel("Username")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expect(page.getByRole("button", { name: /Sign In/i })).toBeVisible();
  });

  test("shows forgot password link", async ({ page }) => {
    await page.goto("/login");

    await expect(page.getByRole("link", { name: /Forgot password/i })).toBeVisible();
  });

  test("has a link to switch to register mode", async ({ page }) => {
    await page.goto("/login");

    // The login page has a toggle to switch to registration
    const registerToggle = page.getByRole("button", {
      name: /Need an account\? Register/i,
    });
    await expect(registerToggle).toBeVisible();
  });

  test("shows confirm password field when switching to register mode", async ({
    page,
  }) => {
    await page.goto("/login");

    // Click the register toggle
    await page.getByRole("button", { name: /Need an account\? Register/i }).click();

    // Confirm password field should now be visible
    await expect(page.getByLabel("Confirm Password")).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Create Account/i }),
    ).toBeVisible();
  });
});
