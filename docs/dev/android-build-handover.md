# Android build handover

**Status:** Phase 3 scaffolding committed in the devcontainer. This is the part the user has to run locally to take the Android shell from "scaffolded" to "running on an emulator." Don't merge marketing assets, signing keys, or anything device-specific from this doc back into the public repo without sanitising.

---

## What's already done (committed to `main`)

- `@capacitor/core`, `/cli`, `/android`, `/preferences`, `/app`, `/splash-screen`, `/local-notifications`, `/assets` installed as devDeps (Capacitor 8.3.3).
- `app/capacitor.config.ts` — appId `living.tada.app`, appName "Ta-Da!", webDir `.output/public`, WebView origin `https://app.tada.living`, navigation allow-list for `tada.living` and `*.tada.living`.
- `app/android/` Gradle project scaffolded via `npx cap add android` (Capacitor's standard layout).
- AndroidManifest configured with: App Links intent filter for `https://tada.living/*` (`autoVerify="true"`), a Web Share Target `SEND` filter for shared text, and permissions for `INTERNET`, `ACCESS_NETWORK_STATE`, `POST_NOTIFICATIONS` (Android 13+), `WAKE_LOCK`, `FOREGROUND_SERVICE` (+ media playback + special use sub-permissions for Phase 4.2).
- 92 icon + splash assets generated via `@capacitor/assets` from `app/public/icons/tada-fullicon.png`. Background colour `#10b981` (brand green); dark splash `#0c8e6f`.
- CORS middleware allow-list updated to include `https://app.tada.living` so the WebView's cross-origin `fetch` to `tada.living/api/*` succeeds with `Access-Control-Allow-Credentials: true`.
- `plugins/api-client.client.ts` switched to `credentials: "include"` when an `apiBaseUrl` is configured, so the session cookie rides along on cross-origin API calls.

## What you have to do locally (Windows / Mac)

The devcontainer has bun + Node but no Java, no Android SDK, no Android Studio, so the actual build steps run on your machine.

### 1. One-time toolchain install

- **Android Studio Hedgehog or later** (free) — installs the Android SDK and AVD manager. `https://developer.android.com/studio`.
  - After install, open the SDK Manager and tick at least: Android 14 (API 34) platform, Android SDK Build-Tools 34, Android SDK Command-line Tools, Android Emulator, an x86_64 system image (Pixel 6 + API 34 is a good default).
- **Java 17** — Android Studio bundles a JBR (Java Runtime) that's fine; if you want a system Java, install OpenJDK 17 and set `JAVA_HOME`.
- **Gradle** — comes with the project via the `gradlew` wrapper; no separate install needed.

### 2. First emulator build (Phase 3.1 finish line)

From the repo root on your machine, after pulling `main`:

```sh
cd app
bun install                         # picks up the new Capacitor devDeps
bun run android:sync                # build:capacitor + cap sync android
bun run android:open                # opens Android Studio at app/android
```

In Android Studio:

- Wait for the Gradle sync to finish (first run will download dependencies — can take 10+ min).
- Tools → Device Manager → Create a Pixel 6 / API 34 AVD if you don't have one.
- Hit **Run ▷**. The emulator should boot, install the app, and load `app.tada.living` inside the WebView talking to `https://tada.living/api/*`.

### 3. Things to verify on the first run

- Login flow works (`cap sync` already includes the credentials fix).
- `https://tada.living/...` deep links open in the app (test by tapping a tada.living link in Gmail/another browser on the emulator).
- Bell notification rings on a 1-minute test session with the phone screen off (Phase 4 hasn't replaced SW bells with native local-notifications yet, so this is best-effort and will fail when the WebView is killed — expected; Phase 4.1 fixes it).
- Verify the icon and splash look right at boot.

### 4. Things that need extra config before you can ship

- **Signing key.** Generate via `keytool -genkey -v -keystore tada-release.keystore -alias tada -keyalg RSA -keysize 2048 -validity 10000`. Store the keystore and password in your password manager *and* back the keystore up off-machine — losing it means a new app listing forever. Wire it into `app/android/app/build.gradle` `signingConfigs` before `./gradlew bundleRelease`.
- **App Links verification.** The `autoVerify="true"` intent filter in AndroidManifest only takes effect once `https://tada.living/.well-known/assetlinks.json` lists the SHA-256 fingerprint of your signing key. After generating the key, run `keytool -list -v -keystore tada-release.keystore -alias tada` to get the fingerprint, then drop the `assetlinks.json` into tada.living's web root. Verify with `adb shell pm get-app-links living.tada.app`.
- **Server CORS allow-list.** The middleware default now includes `https://app.tada.living`, but the production env should set `CORS_ALLOWED_ORIGINS=https://tada.living,https://app.tada.living` explicitly so we don't drift.

## Play Store + F-Droid registration timeline

These take calendar time — start them now even though code's still in progress.

### Google Play Console (start this week)

1. Sign up at `https://play.google.com/console`. Pay the $25 one-time developer fee.
2. **Identity verification** is required for new individual developers since 2024. They ask for government ID + address proof. **Allow 2–7 days** for verification, sometimes longer. This blocks listing creation.
3. Pick **individual** account type (hobby + AGPL). Organisation accounts need a D-U-N-S number which is its own delay.
4. **12 closed-testers / 14 days rule.** New individual accounts must run a closed-testing track with at least 12 opted-in testers for 14 continuous days before promoting an app to production. Worth recruiting that list now — family, IRL friends, anyone who'll press buttons on a beta.
5. The bundle ID `living.tada.app` will reserve your app name when you create the listing — do this after you have an APK to upload.

### F-Droid (lower urgency)

- No paid signup. F-Droid is community-run.
- Submission flow: fork `https://gitlab.com/fdroid/fdroiddata`, add `metadata/living.tada.app.yml` pointing at a GitHub release, open an MR. Reviews take **weeks to months**.
- F-Droid only accepts builds they can reproduce from source. Stripe SDK and other proprietary deps are only pulled in via cloud mode, so we should be clean — flag this in the recipe.
- Action this week: skim a few existing recipes in fdroiddata (search for "Nuxt" or "Capacitor" projects), draft the metadata YAML, sit on it until v1.0 release.

## Open follow-ups parked for later phases

- **Phase 4** — `@capacitor/local-notifications` wiring to replace SW bells on Android (`useSessionNotifications` already detects the runtime via Capacitor's `Capacitor.isNativePlatform()`).
- **Phase 4.2** — foreground service for active sessions; the AndroidManifest permissions are reserved but no `Service` is registered yet.
- **Phase 5** — battery-optimisation exemption prompt and real-device testing matrix.
- **Phase 6** — assetlinks.json + signing config + Play Console upload + F-Droid MR.
