// @ts-check
import { createConfigForNuxt } from "@nuxt/eslint-config/flat";

export default createConfigForNuxt({
  // Features configuration
}).append({
  rules: {
    // Disable the void element check entirely - self-closing is fine in Vue
    "vue/html-self-closing": "off",
  },
});
