# Ta-Da! v0.7.0 — Native Android

_Target: Q2 2026_

The headline release for Android. Ta-Da! is now a proper native Android app via Capacitor, with reliable background session bells, native push notifications, and the in-app controls that a mobile-first experience needs.

---

## What's New

### Native Android App

Ta-Da! ships as a native Android APK wrapping the existing Nuxt frontend. The same codebase runs everywhere — web, PWA, and native Android — with the native layer adding the capabilities that a browser tab simply cannot provide.

- Install from Google Play (closed testing) or sideload the debug APK
- Full offline read access with IndexedDB cache
- Session auth via `SameSite=None; Secure` cookies, working cross-origin between the WebView (`app.tada.living`) and the API server (`tada.living`)

### Session Bells in the Background

**This was the primary reason for building the native app.** When a meditation or focus session is running and you lock your phone or switch apps, the interval bells now fire reliably.

- On native Android: bells are scheduled as OS-level local notifications via `@capacitor/local-notifications` with `allowWhileIdle: true`, which fires them even during Android Doze mode
- Bell sounds (bell, chime, cymbal, gong, gong2, twinkle) are bundled in the APK
- On web/PWA: the existing service worker scheduling is unchanged

### Native Push Notifications (FCM)

Weekly rhythm celebrations and mid-week encouragements now reach you as native Android notifications, not just in-app banners or email.

- Firebase Cloud Messaging (FCM) integration via a zero-dependency JWT implementation — no `firebase-admin` bundle bloat
- Settings → Push notifications toggle on Android requests FCM permission and registers your device token
- Server delivers to both FCM (native) and VAPID (web PWA) subscribers in parallel
- Token lifecycle managed: expired/unregistered tokens are auto-disabled after 410 responses

### In-App Text Size Control

Settings → Appearance now has a text size picker with four steps: Compact, Normal, Large, X-Large. Applies immediately, persists across sessions. The WebView system font setting is pinned to 100% so your in-app preference is the only thing that counts.

---

## Under the Hood

### Android WebView Architecture

A series of fixes required to make the Capacitor WebView talk correctly to the production API:

- **`$fetch` scoped baseURL**: the global `baseURL` on `$fetch.create()` was routing Nuxt-internal `/_nuxt/` manifest fetches to `tada.living`, which caused build-ID mismatches and put Nuxt into a reload loop that froze the UI. Fixed by scoping `baseURL` + `credentials: "include"` to `/api/` paths only via `onRequest`.
- **`appManifest: false`**: the Nuxt app manifest check is meaningless for a baked Capacitor bundle and was the trigger for the reload loop. Disabled permanently.
- **IndexedDB fire-and-forget**: `IDBTransaction.oncomplete` silently hangs on some Android WebView versions. All IndexedDB writes are now fire-and-forget (`void cachePut(...).catch(() => {})`).
- **CORS hardening**: `app.tada.living` is always in the allowed origins regardless of `CORS_ALLOWED_ORIGINS` env var, and `SameSite=None; Secure` session cookies work cross-origin.
- **JS console → logcat**: `BridgeWebChromeClient` override in `MainActivity.java` forwards all WebView `console.log/warn/error` to logcat under the `TadaJS` tag for live debugging without Chrome Remote Debugging.

### New DB Table

`fcm_tokens` — stores FCM device tokens per user, separate from the VAPID `push_subscriptions` table. Migration `0025`.

### New API Endpoints

- `POST /api/push/fcm-token` — register/refresh a device token
- `DELETE /api/push/fcm-token` — unregister on opt-out

---

## Build & Deploy

### Android build cycle (debug)

```bash
# devcontainer
cd app && bun run android:sync    # nuxt generate + cap sync

# Windows PowerShell
cd app\android && .\gradlew installDebug
```

### Server env var required for FCM

```
FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":"tada-living",...}
```

Full single-line JSON of the Firebase service account private key. Add to CapRover before deploying.

---

## What's Next (v0.7.x / v0.8.0)

- **Random-interval pings** (Reporter-style) — now unblocked by reliable native notifications
- **Apple Health / Health Connect** — meditation minutes, both directions
- **Google Play open beta** — once 12 closed testers have run for 14 days
- **iOS** — pending Apple Developer account ($99/yr); architecture is already in place
- **Full offline entry queue** — IndexedDB-backed write queue, background sync, conflict handling

---

## Known Limitations

- iOS not yet supported (same Capacitor codebase; blocked on Apple Developer cost)
- Bell sounds in background notifications use the FCM default sound channel on first install; a dedicated `tada_push` notification channel will be created on next release
- Text size preference does not sync across devices (stored in device localStorage only)
