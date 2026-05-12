import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Capacitor configuration for the Ta-Da! Android app.
 *
 * `webDir` points at the `nuxi generate` output. Build the static bundle
 * with `npm run build:capacitor`, then sync to the native project with
 * `npx cap sync android` before opening Android Studio.
 *
 * Phase 3 of v0.7.0 — see docs/plans/native-android.md.
 */
const config: CapacitorConfig = {
  appId: "living.tada.app",
  appName: "Ta-Da!",
  webDir: ".output/public",
  bundledWebRuntime: false,

  server: {
    // The WebView's origin for relative paths inside the static bundle. We
    // use a real https origin (not capacitor://) so cookies set by
    // tada.living are honoured for first-party API calls — see Phase 3.2.
    androidScheme: "https",
    // Hostname inside the WebView; the static bundle is served from here.
    hostname: "app.tada.living",
    // Domains the WebView is allowed to load resources from. Cloud
    // self-hosters add their own at first-run via the API server picker
    // (Phase 2.4); we whitelist tada.living up-front for the default flow.
    allowNavigation: ["tada.living", "*.tada.living"],
  },

  android: {
    // Persist cookies across app restarts via WebView's built-in cookie
    // store. Capacitor 8 wires this automatically; flag is here as a
    // signal for future reviewers.
    allowMixedContent: false,
    // We're going to ship a foreground service in Phase 4 for active
    // sessions; expose it explicitly when the time comes.
  },

  plugins: {
    SplashScreen: {
      launchShowDuration: 1000,
      backgroundColor: "#10b981",
      showSpinner: false,
      androidScaleType: "CENTER_CROP",
      splashFullScreen: true,
      splashImmersive: false,
    },
    LocalNotifications: {
      // Phase 4.1 wires session bells; defaults are fine for now.
      iconColor: "#10b981",
      smallIcon: "ic_stat_icon_config_sample",
    },
  },
};

export default config;
