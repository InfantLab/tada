// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  devtools: {
    enabled: true,
    timeline: {
      enabled: true,
    },
  },

  // Global CSS
  // @ts-expect-error - css is valid config but InputConfig type misses it
  css: ["~/assets/css/main.css"],

  modules: ["@nuxtjs/tailwindcss", "@vite-pwa/nuxt", "@nuxt/eslint"],

  // TypeScript strict mode
  typescript: {
    strict: true,
    // Disable typecheck in dev - vue-tsc doesn't respect skipLibCheck for node_modules
    // Run `bun run typecheck` manually to check types
    typeCheck: false,
    tsConfig: {
      compilerOptions: {
        // Reduce noise in error panel
        skipLibCheck: true,
        // These are already in tsconfig.json but ensure they're applied
        noUncheckedIndexedAccess: true,
        noPropertyAccessFromIndexSignature: true,
      },
    },
  },

  // Runtime config
  //
  // Server-only values (API keys, DB, Stripe, SMTP) are NOT here.
  // Server code reads process.env directly — no runtimeConfig needed.
  //
  // Only "public" values go here because they must be sent to the browser.
  // In Docker, override these with NUXT_PUBLIC_* env vars at container start.
  // e.g. NUXT_PUBLIC_APP_URL=https://tada.living
  runtimeConfig: {
    public: {
      appName: "Tada",
      appVersion: "0.6.0",
      appUrl: process.env["APP_URL"] || "http://localhost:3000",
      isCloudMode:
        process.env["TADA_CLOUD_MODE"] === "true" ||
        !!process.env["STRIPE_SECRET_KEY"],
      voiceEnabled: process.env["VOICE_ENABLED"] !== "false",
      voiceFreeLimit: parseInt(process.env["VOICE_FREE_LIMIT"] || "50", 10),
      umamiHost: process.env["UMAMI_HOST"] || "",
      umamiWebsiteId: process.env["UMAMI_WEBSITE_ID"] || "",
    },
  },

  // PWA configuration
  pwa: {
    strategies: "injectManifest",
    srcDir: "workers",
    filename: "sw.ts",
    registerType: "autoUpdate",
    manifest: {
      id: "/",
      name: "Tada - Life Tracker",
      short_name: "Tada",
      description:
        "Personal lifelogger - Track Activities, Discover Achievements",
      theme_color: "#10b981",
      background_color: "#ffffff",
      display: "standalone",
      orientation: "portrait",
      icons: [
        {
          src: "/icons/icon-192.png",
          sizes: "192x192",
          type: "image/png",
        },
        {
          src: "/icons/icon-512.png",
          sizes: "512x512",
          type: "image/png",
        },
        {
          src: "/icons/maskable-icon.png",
          sizes: "512x512",
          type: "image/png",
          purpose: "maskable",
        },
      ],
      shortcuts: [
        {
          name: "New Entry",
          short_name: "Entry",
          description: "Add a new activity or moment",
          url: "/create/moment",
          icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
        },
        {
          name: "Record Dream",
          short_name: "Record",
          description: "Record a voice entry",
          url: "/voice",
          icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
        },
        {
          name: "New Tally",
          short_name: "Tally",
          description: "Add a tally count",
          url: "/tally",
          icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
        },
      ],
      share_target: {
        action: "/share",
        method: "GET",
        params: {
          title: "title",
          text: "text",
          url: "url",
        },
      },
    },
    // workbox config for injectManifest — caching strategies live in workers/sw.ts
    workbox: {
      globPatterns: ["**/*.{js,css,html,ico,png,svg,webp,woff,woff2}"],
    },
    client: {
      installPrompt: true,
    },
  },

  // App configuration
  app: {
    head: {
      title: "Tada",
      meta: [
        {
          name: "description",
          content:
            "Personal lifelogger - Track Activities, Discover Achievements",
        },
        { name: "theme-color", content: "#10b981" },
        { name: "apple-mobile-web-app-capable", content: "yes" },
        { name: "apple-mobile-web-app-status-bar-style", content: "default" },
      ],
      link: [
        { rel: "icon", type: "image/png", href: "/favicon.png" },
        { rel: "apple-touch-icon", href: "/icons/icon-192.png" },
      ],
    },
  },

  // Nitro server configuration
  nitro: {
    // Enable SQLite in production
    experimental: {
      database: true,
    },
    // Externalize native bindings - they can't be bundled, must use node_modules at runtime
    externals: {
      external: [
        "@libsql/client",
        "@libsql/linux-x64-gnu",
        "@libsql/linux-x64-musl",
        "@libsql/darwin-arm64",
        "@libsql/darwin-x64",
        "@libsql/win32-x64-msvc",
        "libsql",
      ],
    },
    // Development server watch configuration - also ignore SQLite files
    devServer: {
      watch: [
        // Don't watch data directory or SQLite files
        "!data/**",
        "!**/*.sqlite*",
        "!**/*.db*",
        "!**/*-journal",
        "!**/*-wal",
        "!**/*-shm",
      ],
    },
  },

  // Vite optimizations for faster dev
  vite: {
    // Pre-bundle heavy dependencies
    optimizeDeps: {
      include: ["vue", "vue-router", "drizzle-orm", "emoji-picker-element"],
    },
    // Faster builds
    build: {
      // Use esbuild for minification (faster than terser)
      minify: "esbuild",
      rollupOptions: {
        // Externalize the Whisper WASM dependency - it's optional and loaded dynamically
        // The package is huge (~2GB with models) and only used if user opts into local transcription
        external: ["@xenova/transformers"],
      },
    },
    // Worker bundling - externalize heavy optional deps
    worker: {
      rollupOptions: {
        external: ["@xenova/transformers"],
      },
    },
    // Reduce logging noise
    server: {
      warmup: {
        clientFiles: [
          "./pages/index.vue",
          "./pages/sessions.vue",
          "./layouts/default.vue",
        ],
      },
      watch: {
        // Simpler ignore patterns - mainly to catch any accidental DB files in app/
        ignored: [
          "**/data/**",
          "**/*.sqlite*",
          "**/*.db*",
          "**/*-journal",
          "**/*-wal",
          "**/*-shm",
        ],
        usePolling: false,
        ignoreInitial: true,
      },
      // Improve dev server stability
      hmr: {
        // Increase timeout for HMR updates
        timeout: 30000,
        // Use WebSocket overlay for errors instead of crashing
        overlay: true,
      },
    },
  },

  // Auto-import components from module directories
  components: [
    { path: "~/components" },
    { path: "~/modules/entry-types", pathPrefix: false, pattern: "**/*.vue" },
  ],

  // Auto-import composables/utils from module directories
  imports: {
    dirs: ["~/registry"],
  },

  // Experimental features for performance
  experimental: {
    // Payload extraction for smaller client bundle
    payloadExtraction: true,
    // Component islands for partial hydration (optional)
    componentIslands: true,
    // Use serial builds until Vite Environment API manifest issue is resolved
    viteEnvironmentApi: false,
  },

  compatibilityDate: "2026-01-10",
});
