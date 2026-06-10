<script setup lang="ts">
import { Capacitor } from "@capacitor/core";
definePageMeta({ layout: "default", auth: false });

// --- Login round-trip test ---
const loginUsername = ref("");
const loginPassword = ref("");
const loginTestResult = ref("");
const loginTestStatus = ref<"idle" | "running" | "ok" | "fail">("idle");

function resolveBase(): string {
  const cfg = useRuntimeConfig();
  const baked = String(cfg.public.apiBaseUrl ?? "");
  const nativeFallback = Capacitor.isNativePlatform() ? "https://tada.living" : "";
  return baked || nativeFallback || "";
}

async function testLoginRoundTrip() {
  loginTestStatus.value = "running";
  loginTestResult.value = "Logging in…";
  const base = resolveBase();

  try {
    const loginRes = await fetch(base ? `${base}/api/auth/login` : "/api/auth/login", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: loginUsername.value, password: loginPassword.value }),
    });
    if (!loginRes.ok) {
      loginTestStatus.value = "fail";
      loginTestResult.value = `Login failed — HTTP ${loginRes.status}`;
      return;
    }
    loginTestResult.value = `Login HTTP ${loginRes.status} ✓ — now checking session…`;
    const sessionRes = await fetch(base ? `${base}/api/auth/session` : "/api/auth/session", {
      credentials: "include",
    });
    const sessionJson = await sessionRes.json() as { user?: { username: string } | null };
    if (sessionJson?.user?.username) {
      loginTestStatus.value = "ok";
      loginTestResult.value = `Session found — logged in as ${sessionJson.user.username} ✓`;
    } else {
      loginTestStatus.value = "fail";
      loginTestResult.value = `Session NOT found after login — cookie was not stored (HTTP ${sessionRes.status})`;
    }
  } catch (e: unknown) {
    loginTestStatus.value = "fail";
    loginTestResult.value = `Error: ${e instanceof Error ? e.message : String(e)}`;
  }
}

interface Check {
  label: string;
  status: "pending" | "ok" | "warn" | "fail";
  detail: string;
}

const checks = ref<Check[]>([]);
const running = ref(false);

function add(label: string): Check {
  const c: Check = { label, status: "pending", detail: "…" };
  checks.value.push(c);
  return c;
}

function set(c: Check, status: Check["status"], detail: string) {
  c.status = status;
  c.detail = detail;
}

async function run() {
  checks.value = [];
  running.value = true;

  // 1. Effective API base URL (baked-in OR Capacitor native fallback)
  const cfg = useRuntimeConfig();
  const apiBase = String(cfg.public.apiBaseUrl ?? "");
  const effectiveBase = resolveBase();
  const c1 = add("Effective API base URL");
  if (effectiveBase) {
    const source = apiBase ? "baked-in" : "Capacitor native fallback";
    set(c1, "ok", `${effectiveBase} (${source})`);
  } else {
    set(c1, "fail", "(empty) — all fetch calls will hit the local WebView bundle, not the server");
  }

  // 2. WebView origin
  const c2 = add("WebView origin");
  set(c2, "ok", window.location.origin);

  // 3. Session check via plugin $fetch (uses apiBase prefix)
  const c3 = add("GET /api/auth/session via $fetch");
  try {
    const res = await $fetch<{ user: { username: string } | null }>("/api/auth/session");
    if (res.user) {
      set(c3, "ok", `authenticated as ${res.user.username}`);
    } else {
      set(c3, "warn", "reached server — not logged in");
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    set(c3, "fail", msg);
  }

  // 4. Explicit fetch to known server URL (bypasses apiBase config)
  const c4 = add("GET https://tada.living/api/auth/session (explicit)");
  try {
    const res = await fetch("https://tada.living/api/auth/session", {
      credentials: "include",
    });
    const json = await res.json() as { user: { username: string } | null };
    set(c4, res.ok ? "ok" : "warn", `HTTP ${res.status} — user: ${json?.user?.username ?? "none"}`);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    set(c4, "fail", msg);
  }

  // 5. CORS preflight to server
  const c5 = add("CORS — OPTIONS to https://tada.living/api/auth/session");
  try {
    const res = await fetch("https://tada.living/api/auth/session", {
      method: "OPTIONS",
      headers: { Origin: window.location.origin },
    });
    const acao = res.headers.get("access-control-allow-origin");
    const acac = res.headers.get("access-control-allow-credentials");
    set(c5, acao ? "ok" : "warn", `allow-origin: ${acao ?? "missing"} | allow-credentials: ${acac ?? "missing"}`);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    set(c5, "fail", msg);
  }

  // 6. Cookies visible to JS (HttpOnly ones won't show)
  const c6 = add("document.cookie (non-HttpOnly only)");
  const cookies = document.cookie;
  set(c6, "ok", cookies || "(none visible — HttpOnly cookies are hidden, which is normal)");

  // 7. POST /api/auth/login — check CORS on actual request (not preflight)
  // set-cookie is always null from JS (forbidden header), so we don't show it.
  // allow-origin will be null too if CapacitorHttp native routing is active
  // (native HTTP bypasses CORS headers entirely — that is correct behaviour).
  const c7 = add("POST /api/auth/login (probe with bad credentials)");
  try {
    const res = await fetch(
      effectiveBase ? `${effectiveBase}/api/auth/login` : "/api/auth/login",
      {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: "__debug_probe__", password: "__debug_probe__" }),
      }
    );
    const acao = res.headers.get("access-control-allow-origin");
    const contentType = res.headers.get("content-type") ?? "?";
    // 401 = server reached and auth checked (correct). 200 = unexpected.
    const ok = res.status === 400 || res.status === 401;
    set(
      c7,
      ok ? "ok" : "warn",
      `HTTP ${res.status} | allow-origin: ${acao ?? "(native HTTP or CORS missing)"} | content-type: ${contentType}`
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    set(c7, "fail", `CORS blocked or network error: ${msg}`);
  }



  running.value = false;
}

const statusColor: Record<Check["status"], string> = {
  pending: "text-stone-400",
  ok:      "text-emerald-600 dark:text-emerald-400",
  warn:    "text-amber-600  dark:text-amber-400",
  fail:    "text-red-600    dark:text-red-400",
};
const statusIcon: Record<Check["status"], string> = {
  pending: "⏳", ok: "✓", warn: "⚠", fail: "✗",
};

onMounted(run);
</script>

<template>
  <div class="max-w-2xl mx-auto px-4 py-8">
    <h1 class="text-xl font-bold mb-1 text-stone-800 dark:text-stone-100">Auth diagnostics</h1>
    <p class="text-sm text-stone-500 mb-6">Runs automatically on load. Shows what the app can actually reach.</p>

    <button
      class="mb-6 px-4 py-2 bg-tada-600 text-white rounded-lg text-sm font-medium"
      :disabled="running"
      @click="run"
    >
      {{ running ? "Running…" : "Run again" }}
    </button>

    <div class="space-y-3">
      <div
        v-for="c in checks"
        :key="c.label"
        class="rounded-lg border border-stone-200 dark:border-stone-700 p-4"
      >
        <div class="flex items-start gap-2">
          <span :class="statusColor[c.status]" class="text-lg leading-tight mt-0.5">{{ statusIcon[c.status] }}</span>
          <div class="min-w-0">
            <p class="text-sm font-medium text-stone-700 dark:text-stone-300">{{ c.label }}</p>
            <p class="text-xs mt-1 break-all" :class="statusColor[c.status]">{{ c.detail }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Login round-trip test -->
    <div class="mt-8 rounded-lg border border-stone-300 dark:border-stone-600 p-4">
      <h2 class="text-sm font-bold text-stone-700 dark:text-stone-300 mb-3">Login round-trip test</h2>
      <p class="text-xs text-stone-500 mb-3">Enter real credentials — logs in then immediately checks if the session cookie was stored.</p>
      <div class="space-y-2 mb-3">
        <input v-model="loginUsername" type="text" placeholder="Username"
          class="w-full px-3 py-2 text-sm rounded border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-200" />
        <input v-model="loginPassword" type="password" placeholder="Password"
          class="w-full px-3 py-2 text-sm rounded border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-200" />
      </div>
      <button
        class="px-4 py-2 bg-tada-600 text-white rounded text-sm font-medium disabled:opacity-50"
        :disabled="loginTestStatus === 'running' || !loginUsername || !loginPassword"
        @click="testLoginRoundTrip"
      >
        {{ loginTestStatus === 'running' ? 'Testing…' : 'Test Login + Session' }}
      </button>
      <p v-if="loginTestResult" class="mt-3 text-xs break-all"
        :class="{
          'text-emerald-600 dark:text-emerald-400': loginTestStatus === 'ok',
          'text-red-600 dark:text-red-400': loginTestStatus === 'fail',
          'text-stone-500': loginTestStatus === 'running',
        }">
        {{ loginTestResult }}
      </p>
    </div>
  </div>
</template>
