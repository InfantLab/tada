import { defineVitestConfig } from "@nuxt/test-utils/config";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const testDir = fileURLToPath(new URL(".", import.meta.url));

export default defineVitestConfig({
  test: {
    environment: "nuxt",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    pool: "forks",
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    env: {
      DATABASE_URL: `file:${join(testDir, "data", "test.db")}`,
      NUXT_PUBLIC_SITE_URL: "http://localhost:3000",
    },
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.{idea,git,cache,output,temp}/**",
      "**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*",
      "**/tests/stubs/**", // Exclude stub tests from main run
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/",
        ".nuxt/",
        "dist/",
        "**/*.d.ts",
        "**/*.config.{js,ts}",
        "**/tests/e2e/**",
        "**/tests/stubs/**",
      ],
    },
  },
});
