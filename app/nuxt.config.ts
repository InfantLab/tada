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

  // Runtime config (environment variables)
  // Nuxt auto-maps NUXT_* env vars, but we also support legacy names
  runtimeConfig: {
    // Server-only (not exposed to client)
    databaseUrl: process.env["DATABASE_URL"] || "file:./data/db.sqlite",

    // Voice feature API keys (server-only)
    // Nuxt will auto-read NUXT_GROQ_API_KEY, but we also support GROQ_API_KEY
    groqApiKey: process.env["GROQ_API_KEY"] || "",
    openaiApiKey: process.env["OPENAI_API_KEY"] || "",
    anthropicApiKey: process.env["ANTHROPIC_API_KEY"] || "",
    deepgramApiKey: process.env["DEEPGRAM_API_KEY"] || "",

    // Public (exposed to client)
    public: {
      appName: "Tada",
      appVersion: "0.3.0",
      // Voice feature flags
      voiceEnabled: process.env["VOICE_ENABLED"] !== "false",
      voiceFreeLimit: parseInt(process.env["VOICE_FREE_LIMIT"] || "50", 10),
    },
  },

  // PWA configuration
  pwa: {
    registerType: "autoUpdate",
    manifest: {
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
          src: "/icons/icon-512.png",
          sizes: "512x512",
          type: "image/png",
          purpose: "maskable",
        },
      ],
    },
    workbox: {
      // Cache strategies
      runtimeCaching: [
        {
          urlPattern: /^https:\/\/.*\.(mp3|wav|ogg|m4a)$/,
          handler: "CacheFirst",
          options: {
            cacheName: "audio-cache",
            expiration: {
              maxEntries: 20,
              maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
            },
          },
        },
      ],
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

  // Experimental features for performance
  experimental: {
    // Payload extraction for smaller client bundle
    payloadExtraction: true,
    // Component islands for partial hydration (optional)
    componentIslands: true,
  },

  compatibilityDate: "2026-01-10",
});
