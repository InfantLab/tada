<script setup lang="ts">
definePageMeta({ layout: "default", auth: false });

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

  // 1. Runtime config
  const cfg = useRuntimeConfig();
  const apiBase = String(cfg.public.apiBaseUrl ?? "");
  const c1 = add("apiBaseUrl (baked into bundle)");
  if (apiBase) {
    set(c1, "ok", apiBase);
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

  // 7. Try login POST and inspect Set-Cookie
  const c7 = add("POST /api/auth/login response headers");
  try {
    const res = await fetch(
      apiBase ? `${apiBase}/api/auth/login` : "/api/auth/login",
      {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: "__debug_probe__", password: "__debug_probe__" }),
      }
    );
    const setCookie = res.headers.get("set-cookie");
    const acao = res.headers.get("access-control-allow-origin");
    set(
      c7,
      res.status === 400 || res.status === 401 ? "ok" : "warn",
      `HTTP ${res.status} | set-cookie: ${setCookie ?? "none"} | allow-origin: ${acao ?? "none"}`
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    set(c7, "fail", msg);
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
  </div>
</template>
