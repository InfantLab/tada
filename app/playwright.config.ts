import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright E2E test configuration for Ta-Da!
 *
 * Run all tests:    bunx playwright test
 * Run with UI:      bunx playwright test --ui
 * Run specific:     bunx playwright test tests/e2e/homepage.spec.ts
 *
 * First-time setup: bunx playwright install chromium
 */
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",

  /* Shared settings for all tests */
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  /* Timeout settings */
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  /* Start dev server before tests if not already running */
  webServer: {
    command: "bun run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
