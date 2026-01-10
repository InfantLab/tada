// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  devtools: { enabled: true },

  // Global CSS
  css: ['~/assets/css/main.css'],

  modules: [
    '@nuxtjs/tailwindcss',
    '@vite-pwa/nuxt',
    '@nuxt/eslint',
  ],

  // TypeScript strict mode
  typescript: {
    strict: true,
    // Allow disabling typecheck via env in container builds
    typeCheck: process.env.NUXT_TYPESCRIPT_TYPECHECK !== "false",
  },

  // Runtime config (environment variables)
  runtimeConfig: {
    // Server-only (not exposed to client)
    databaseUrl: 'file:./data/db.sqlite',
    
    // Public (exposed to client)
    public: {
      appName: 'Tada',
      appVersion: '0.1.0',
    },
  },

  // PWA configuration
  pwa: {
    registerType: 'autoUpdate',
    manifest: {
      name: 'Tada - Life Tracker',
      short_name: 'Tada',
      description: 'Personal lifelogger - Track Activities, Discover Achievements',
      theme_color: '#10b981',
      background_color: '#ffffff',
      display: 'standalone',
      orientation: 'portrait',
      icons: [
        {
          src: '/icons/icon-192.png',
          sizes: '192x192',
          type: 'image/png',
        },
        {
          src: '/icons/icon-512.png',
          sizes: '512x512',
          type: 'image/png',
        },
        {
          src: '/icons/icon-512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'maskable',
        },
      ],
    },
    workbox: {
      // Cache strategies
      runtimeCaching: [
        {
          urlPattern: /^https:\/\/.*\.(mp3|wav|ogg|m4a)$/,
          handler: 'CacheFirst',
          options: {
            cacheName: 'audio-cache',
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
      title: 'Tada',
      meta: [
        { name: 'description', content: 'Personal lifelogger - Track Activities, Discover Achievements' },
        { name: 'theme-color', content: '#10b981' },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'default' },
      ],
      link: [
        { rel: 'icon', type: 'image/png', href: '/favicon.png' },
        { rel: 'apple-touch-icon', href: '/icons/icon-192.png' },
      ],
    },
  },

  // Nitro server configuration
  nitro: {
    // Enable SQLite in production
    experimental: {
      database: true,
    },
  },

  compatibilityDate: '2026-01-10',
})
