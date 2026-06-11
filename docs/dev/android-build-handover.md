# Android build handover

**Status:** Phase 3 scaffolding committed. Toolchain decision locked in 2026-05-12: **devcontainer stays lean, Windows host gets cmdline-tools only, releases build via GitHub Actions.** No Android Studio. No emulator.

Read this once. The same workflow handles Phase 4 (native session reliability) and Phase 5 (polish + device testing) without further setup.

---

## The Plan C workflow at a glance

```
┌──────────────────────────────────────────────────────────────────┐
│  WSL devcontainer                                                │
│  └─ bun run dev          ← Nuxt HMR server on :3000              │
│  └─ bun run android:dev  ← prints the LAN URL + Windows commands │
└─────────────────┬────────────────────────────────────────────────┘
                  │  HMR over LAN
                  ▼
┌──────────────────────────────────────────────────────────────────┐
│  Real Android phone (Android 12+, on the same Wi-Fi)             │
│  └─ Ta-Da! debug APK, WebView pointed at http://<wsl-ip>:3000    │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│  Windows host (one-time installer only)                          │
│  └─ JDK 17 + Android cmdline-tools                               │
│  └─ ./gradlew installDebug                                       │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│  GitHub Actions (release builds)                                 │
│  └─ Tag v*-android → builds signed AAB + debug APK               │
└──────────────────────────────────────────────────────────────────┘
```

---

## One-time Windows host setup (~15 min)

You only need this so you can run `gradlew installDebug` once to put a debug build on your phone. After that, the devcontainer does almost all the work.

### Install JDK 17

Powershell as admin:

```powershell
winget install Microsoft.OpenJDK.17
```

Restart your shell, then verify:

```powershell
java -version    # should show "openjdk version 17.x.x"
```

### Install Android command-line tools

1. Download from `https://developer.android.com/studio#command-line-tools-only` — the "Command line tools only" zip (Windows).
2. Extract somewhere temporary first — the zip contains a single `cmdline-tools/` folder. You need to end up with this **exact** layout (Google's hard-coded convention):

   ```
   C:\android-sdk\
     cmdline-tools\
       latest\
         bin\
           sdkmanager.bat
           avdmanager.bat
         lib\
         NOTICE.txt
         source.properties
   ```

   The most common mistake is dragging the whole `cmdline-tools/` folder into `latest/`, which gives you `C:\android-sdk\cmdline-tools\latest\cmdline-tools\bin\...` — one level too deep. `sdkmanager.bat` must be at `cmdline-tools\latest\bin\sdkmanager.bat` exactly.

   If you've already done that, fix in place:
   ```powershell
   Move-Item C:\android-sdk\cmdline-tools\latest\cmdline-tools\* C:\android-sdk\cmdline-tools\latest\
   Remove-Item C:\android-sdk\cmdline-tools\latest\cmdline-tools
   ```

3. Set environment variables (System Properties → Environment Variables):
   - `ANDROID_HOME` = `C:\android-sdk`
   - Add to `PATH`: `%ANDROID_HOME%\cmdline-tools\latest\bin`, `%ANDROID_HOME%\platform-tools`
4. **Close every Powershell window and open a fresh one** so the new env vars are picked up. Then verify:

   ```powershell
   where.exe sdkmanager.bat       # should print C:\android-sdk\cmdline-tools\latest\bin\sdkmanager.bat
   ```

5. Install the SDK pieces we need:

   ```powershell
   sdkmanager --licenses                                  # accept all
   sdkmanager "platform-tools" "platforms;android-34" "build-tools;34.0.0"
   ```

That's the entire native toolchain. ~1GB total.

### Enable phone for USB debugging

1. On your phone: Settings → About phone → tap *Build number* 7 times.
2. Settings → Developer options → toggle *USB debugging*.
3. Plug phone into laptop via USB. On Windows Powershell:

```powershell
adb devices    # should list your phone
```

Approve the RSA fingerprint prompt on the phone the first time.

---

## First debug install (one-time, from Windows)

After pulling `main` to your Windows checkout:

```powershell
cd path\to\tada\app
bun install                          # picks up Capacitor devDeps
bun run android:sync                 # build:capacitor + cap sync
cd android
./gradlew installDebug
```

Ta-Da! shows up on the phone's app drawer. The bundled build hits `https://tada.living/api/*` for now (good for smoke-testing login + offline cache).

---

## Debug iteration loop (login / CORS / cookies / native WebView behaviour)

Use this when the bug requires the phone to talk to the **real** `https://tada.living` server — authentication, session cookies, CORS headers, IndexedDB behaviour in the Android WebView. Live Reload won't reproduce these issues because it routes API calls through the local dev server, not production.

### Step 1 — devcontainer: rebuild + sync

```sh
cd app
bun run android:sync    # nuxt generate (bakes https://tada.living as API base) + cap sync
```

Takes ~30–45 s. This writes the updated web bundle into `app/android/app/src/main/assets/public/`.

### Step 2 — Windows Powershell: compile + install

```powershell
cd path\to\tada\app\android
.\gradlew installDebug
```

Takes ~30–60 s first time (Gradle downloads caches), ~15 s after that.

> **Do NOT use `android-reinstall.ps1` for debug iteration.** That script runs its own `bun run android:sync` from the Windows checkout, overwriting whatever the devcontainer just built with only committed code. Always go straight to `gradlew installDebug` from `app\android\`.

That's it — total round-trip per code change is about 1 minute. No GitHub Actions needed. No Android Studio.

---

## Day-to-day: Capacitor Live Reload

This is the workflow you'll use 95% of the time.

### Terminal 1 — devcontainer

```sh
cd app
bun run dev          # starts Nuxt dev server on :3000 with HMR
```

### Terminal 2 — devcontainer (one-off)

```sh
cd app
bun run android:dev  # prints the LAN URL the phone needs + the exact commands
```

Sample output:

```
Dev-server URL the phone WebView should load:  http://172.17.0.4:3000

Step 2. On Windows (Powershell, in the app/ directory):

    $env:CAP_SERVER_URL = "http://172.17.0.4:3000"
    bunx cap sync android
    cd android
    ./gradlew installDebug
```

### Terminal 3 — Windows Powershell

Paste the commands the helper printed. The phone reinstalls with the dev URL baked in.

Open Ta-Da! on the phone. Save a file in the devcontainer. The phone updates in <1s.

### When the LAN URL stops working

Two common causes:

- **Phone left Wi-Fi.** Reconnect.
- **Windows firewall woke up.** The helper script prints the exact `netsh interface portproxy` + `New-NetFirewallRule` commands to run in elevated Powershell. One-off.

### Switching back to a self-contained debug APK

```powershell
$env:CAP_SERVER_URL = ""             # or just `Remove-Item Env:CAP_SERVER_URL`
bunx cap sync android
cd android
./gradlew installDebug
```

Same flow, no live reload. Useful when you're not actively iterating and want the phone to keep working when the laptop's off.

---

## Release builds — GitHub Actions

The workflow at [`.github/workflows/android-release.yml`](../../.github/workflows/android-release.yml) does the work. Two flavours:

### Debug APK on every tag (no secrets needed)

Push any `v*-android` tag and CI builds a debug APK as an artifact. Useful for closed-tester distribution before signing is set up:

```sh
git tag v0.7.0-alpha1-android
git push origin v0.7.0-alpha1-android
```

Wait ~5 min. Download `tada-debug-apk` from the workflow run's Artifacts. Send to testers via any channel.

### Signed release AAB (needs secrets)

For Play Store uploads. You'll do this once you've generated the signing keystore — **not yet**.

Repo secrets needed:

- `ANDROID_SIGNING_KEY` — base64-encoded contents of `release.keystore`
- `ANDROID_KEY_ALIAS` — the alias name (e.g. `tada`)
- `ANDROID_KEY_PASSWORD` — key password
- `ANDROID_STORE_PASSWORD` — keystore password

Generate the keystore once on Windows:

```powershell
keytool -genkey -v -keystore tada-release.keystore -alias tada -keyalg RSA -keysize 2048 -validity 10000
```

**Back the keystore up to two places off your laptop before doing anything else** (password manager + encrypted cloud backup). Losing it means a new Play Store app listing forever — no recovery.

Base64-encode it for the GitHub secret:

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("tada-release.keystore")) | Set-Clipboard
```

Paste into the repo secret. Add the alias/password secrets. Push a `v0.7.0-android` tag → CI builds the signed AAB and attaches it to the GitHub release. Upload that AAB to Play Console.

### Triggering a manual build with a custom API base

The workflow has a `workflow_dispatch` input for `apiBaseUrl` — handy if you want to build an APK that points at a self-host backend (or staging). Actions tab → Android Release → Run workflow → fill in the URL.

---

## Play Store + F-Droid status

### Google Play Console — your action items

- ✅ Signup + identity verification (already done by you).
- ⏳ **Recruit 12 closed-testers.** New individual accounts must run a closed-testing track with ≥12 opted-in testers for 14 continuous days before promoting to production. Family + IRL friends + anyone who'll press buttons on a beta. Doesn't block anything yet, but you want the list ready before the first AAB upload.
- ⏳ App listing — created after the first AAB upload. Bundle ID `living.tada.app` reserves the name.
- ⏳ App content questionnaire — privacy policy URL (`tada.living/privacy` ✅), data-collection declarations (we collect entries, account email, optional payment via Stripe), target audience (17+, no third-party tracking).

### F-Droid — your action items

- No paid signup; community-run.
- Submission flow: fork `https://gitlab.com/fdroid/fdroiddata`, add `metadata/living.tada.app.yml` pointing at a GitHub release, open an MR. Reviews take **weeks to months**.
- Action when you have a v1.0 GitHub release: skim a few existing recipes in fdroiddata (`Capacitor` or `Cordova` projects), draft the metadata YAML, sit on it until after the Play Store version is out.
- F-Droid only accepts reproducible builds. Our GitHub Actions workflow is the reproducible-build trail — same toolchain pinning, same source. Stripe and other proprietary deps load only in cloud mode, so we should be clean.

---

## What changes in later phases

- **Phase 4** (native session reliability). The `useSessionNotifications` composable will detect Capacitor at runtime (via `Capacitor.isNativePlatform()`) and switch from SW-scheduled bells to `@capacitor/local-notifications`. A small Kotlin `Service` gets registered for the foreground service.
- **Phase 5** (polish + device matrix). Real-device testing on a few OEMs — Samsung A-series and Xiaomi are the battery-killers we most need to confirm. You'll lend / borrow / Buy-Used the test fleet.
- **Phase 6** (distribution). Signing keystore generation, assetlinks.json on tada.living for App Link verification, Play Console upload, F-Droid MR.

None of these require Android Studio.

---

## Debugging WebView JavaScript

### The critical gotcha: `adb logcat` does NOT show JavaScript

Android logcat only captures Java/native output. WebView JavaScript `console.log`, `console.error`, etc. go through the Chrome DevTools Protocol and are completely silent to logcat by default — no amount of `adb logcat | findstr` or `Select-String` will show them.

There are two ways to see JS output:

---

### Option A — Chrome Remote Debugging (interactive, no rebuild needed)

Use this for exploratory debugging, inspecting the DOM, Network tab, etc. Works with any build.

1. Phone connected via USB, app open.
2. Open **Chrome** on Windows (not Edge, not Firefox — Chrome).
3. Go to `chrome://inspect/#devices`.
4. Under **Remote Targets** you should see `living.tada.app` with your WebView listed.  
   If you see nothing: check the phone isn't locked, and that USB debugging is still enabled.
5. Click **inspect** — full DevTools opens (Console, Network, Sources, etc.).
6. **Console tab** shows all `console.log/warn/error` output in real time.

> **What to look for for login failures:** Open DevTools, reload the app, and watch the Console. Any uncaught exception during plugin initialisation will be shown here and will explain why buttons don't respond (Vue event handlers are not attached when hydration throws).
>
> Key `[TADA]` log lines to confirm the app is working:
> ```
> [TADA] api-client plugin init, baseURL: https://tada.living
> [TADA] api-client plugin ready
> [TADA] login mounted, api base: https://tada.living
> [TADA] login: submit login
> [TADA] login: POST → https://tada.living/api/auth/login
> [TADA] login: response 200
> [TADA] login: success, navigating
> ```
> If the sequence stops early, the line it stops at is the root cause.

---

### Option B — `TadaJS` logcat tag (streaming to devcontainer, no Chrome required)

`MainActivity.java` contains a `BridgeWebChromeClient` subclass that overrides `onConsoleMessage` and forwards every JS console line to Android's `Log` system under the tag `TadaJS`. This lets you stream JS output through `adb logcat` and into the devcontainer.

**Windows Powershell — start streaming:**

```powershell
cd path\to\tada\app\scripts
.\android-log.ps1 -Clear
```

The script:
- Clears the logcat ring buffer
- Streams `TadaJS` (all JS) + `Capacitor:E` (native bridge hard errors) to the terminal
- Simultaneously writes to `android-js.log` in the repo root

**Devcontainer — read the same stream:**

```sh
tail -f /workspaces/tada/android-js.log
```

Both windows see the same output. No copy-paste. The log file is gitignored.

---

### Option C — Chrome DevTools Protocol from devcontainer (advanced)

If you want to pipe CDP output through a script:

**Windows Powershell — forward the debugger port:**

```powershell
adb forward tcp:9222 localabstract:chrome_devtools_remote
```

**Devcontainer — query inspectable pages:**

```sh
curl http://localhost:9222/json
```

This lists the inspectable WebView targets. Each entry has a `webSocketDebuggerUrl` you can connect to with any CDP client to stream `Runtime.consoleAPICalled` events programmatically.

---

## If something's off

- **Phone can't reach `http://<wsl-ip>:3000`** — run the `netsh interface portproxy` + `New-NetFirewallRule` snippet the helper prints. Test from Windows Powershell with `curl http://<wsl-ip>:3000` first.
- **`adb devices` shows nothing** — USB cable might be charge-only. Swap. Or check that USB debugging is still enabled (Android sometimes auto-disables it after a system update).
- **Login works on Live Reload but breaks in self-contained debug APK** — the credentials/CORS fix from Phase 3.2 only takes effect after `cap sync` runs. Re-run `bun run android:sync` from inside the devcontainer if you've changed `nuxt.config.ts` or the api-client plugin.
- **Buttons respond to touch (grey on press) but navigation never fires** — Nuxt's router is stalled waiting for a manifest/payload check that never resolves. Root cause: `$fetch.create()` has a global `baseURL` pointing to `tada.living`, which routes Nuxt-internal `/_nuxt/` fetches to the wrong server. Once CORS on those paths is fixed, the manifest fetch returns a different build ID than the baked bundle and Nuxt enters a reload loop. Fix: `baseURL` must only be applied to `/api/` paths (via `onRequest`), never set globally. See `api-client.client.ts` and `CLAUDE.md § Capacitor fetch architecture`.
- **Buttons on the login screen don't respond / app is visually frozen** — Vue hydration failed. An uncaught JavaScript exception during plugin initialisation prevented Vue from attaching event handlers to the pre-rendered HTML. Use Chrome Remote Debugging (Option A above) and look at the Console tab for the exception. The `[TADA] api-client plugin` and `[TADA] login mounted` lines tell you how far initialisation got.
- **Spinner on index page never clears (`✨` stays indefinitely)** — `$fetch("/api/auth/session")` is hanging. The most common cause on Android WebView is an `await cachePut(...)` inside the `onResponse` interceptor: `IDBTransaction.oncomplete` silently hangs on some WebView versions. Cache writes must always be fire-and-forget (`void cachePut(...).catch(() => {})`). Check `api-client.client.ts`.
- **`android-log.ps1` streams nothing** — the build on the phone predates the `TadaJS` WebChromeClient override in `MainActivity.java`. Rebuild and reinstall with `bun run android:sync` (devcontainer) + `gradlew installDebug` (Windows). Then use Chrome Remote Debugging in the meantime.
- **Splash flashes white before brand colour** — Phase 5 polish; Capacitor's `androidScaleType: "CENTER_CROP"` should fix it. File it but don't block on it.
