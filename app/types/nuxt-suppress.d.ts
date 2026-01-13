// Suppress Nuxt's excessive stack depth errors from $fetch type inference
// These are framework-level type issues beyond our control
declare module "@nuxt/schema" {
  interface RuntimeConfig {
    // Simplified to avoid deep type recursion
  }
}
