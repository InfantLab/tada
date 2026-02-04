// @ts-check
import { createConfigForNuxt } from "@nuxt/eslint-config/flat";

export default createConfigForNuxt({
  // Features configuration
})
  .append({
    rules: {
      // Disable the void element check entirely - self-closing is fine in Vue
      "vue/html-self-closing": "off",
    },
  })
  // Relaxed rules for test files
  .append({
    files: ["**/*.test.ts", "**/*.spec.ts", "tests/**/*.ts"],
    rules: {
      // Tests often need flexible typing
      "@typescript-eslint/no-explicit-any": "off",
      // Unused vars in tests are often intentional (setup, fixtures)
      "@typescript-eslint/no-unused-vars": "warn",
    },
  })
  // Relaxed rules for type definition files
  .append({
    files: ["**/*.d.ts", "types/**/*.ts"],
    rules: {
      // Type definitions sometimes need 'any' for external APIs
      "@typescript-eslint/no-explicit-any": "off",
    },
  });
