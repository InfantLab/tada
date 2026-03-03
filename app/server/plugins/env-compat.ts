/**
 * Environment Variable Compatibility Plugin
 *
 * Nuxt auto-maps NUXT_* prefixed env vars to runtimeConfig at runtime,
 * but many deployments use unprefixed names (GROQ_API_KEY, OPENAI_API_KEY, etc.).
 * This plugin applies those legacy env var names at server startup so they
 * work without requiring a rebuild.
 */
export default defineNitroPlugin(() => {
  const config = useRuntimeConfig();

  // Map legacy env var names to runtimeConfig keys.
  // Only apply if the config value is empty (not already set by NUXT_* override).
  const mappings: [envVar: string, configKey: string][] = [
    ["GROQ_API_KEY", "groqApiKey"],
    ["OPENAI_API_KEY", "openaiApiKey"],
    ["ANTHROPIC_API_KEY", "anthropicApiKey"],
    ["DEEPGRAM_API_KEY", "deepgramApiKey"],
  ];

  for (const [envVar, configKey] of mappings) {
    const currentValue = (config as Record<string, unknown>)[configKey];
    const envValue = process.env[envVar];
    if (!currentValue && envValue) {
      (config as Record<string, unknown>)[configKey] = envValue;
    }
  }
});
