<script setup lang="ts">
definePageMeta({
  layout: "default",
});

const username = ref("");
const password = ref("");
const confirmPassword = ref("");
const isLoading = ref(false);
const error = ref<string | null>(null);
const mode = ref<"login" | "register">("login");
const debugApiUrl = ref("");

// Always show the toggle.
const hasUsers = ref(true);

// Resolve the API base URL the same way debug-auth does — bypasses the
// $fetch plugin so this works regardless of plugin initialisation state.
function resolveApiBase(): string {
  const cfg = useRuntimeConfig();
  const raw = String(cfg.public.apiBaseUrl ?? "");
  const baked = /^https?:\/\//.test(raw) ? raw.replace(/\/+$/, "") : "";
  const isCapacitorWebView =
    typeof window !== "undefined" &&
    window.location.hostname === "app.tada.living";
  const nativeFallback = isCapacitorWebView ? "https://tada.living" : "";
  return baked || nativeFallback || "";
}

onMounted(async () => {
  const base = resolveApiBase();
  debugApiUrl.value = base || "(same-origin)";
  console.log("[TADA] login mounted, api base:", base);

  // Check if already authenticated - redirect to home.
  // Use raw fetch to avoid $fetch plugin issues.
  try {
    const url = base ? `${base}/api/auth/session` : "/api/auth/session";
    const res = await fetch(url, { credentials: "include" });
    if (res.ok) {
      const session = await res.json() as { user?: { id: string } | null };
      if (session.user) {
        navigateTo("/");
        return;
      }
    }
  } catch {
    // Not authenticated, continue
  }
});

async function handleSubmit() {
  error.value = null;

  if (!username.value || !password.value) {
    error.value = "Please fill in all fields";
    return;
  }

  if (mode.value === "register") {
    if (password.value !== confirmPassword.value) {
      error.value = "Passwords do not match";
      return;
    }
    if (password.value.length < 8) {
      error.value = "Password must be at least 8 characters";
      return;
    }
  }

  isLoading.value = true;
  console.log("[TADA] login: submit", mode.value);

  try {
    const base = resolveApiBase();
    const endpoint = mode.value === "login" ? "/api/auth/login" : "/api/auth/register";
    const url = base ? `${base}${endpoint}` : endpoint;
    console.log("[TADA] login: POST →", url);

    // Use raw fetch — bypasses the $fetch plugin entirely, same approach as
    // debug-auth's round-trip test which is known to work in Capacitor.
    const res = await fetch(url, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: username.value,
        password: password.value,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      }),
    });

    console.log("[TADA] login: response", res.status);

    if (!res.ok) {
      let msg = "Authentication failed";
      try {
        const data = await res.json() as { statusMessage?: string; message?: string };
        msg = data.statusMessage || data.message || msg;
      } catch { /* non-JSON error body */ }
      throw new Error(msg);
    }

    console.log("[TADA] login: success, navigating");
    const redirect = useRoute().query["redirect"] as string | undefined;
    navigateTo(redirect || "/");
  } catch (err: unknown) {
    console.error("[TADA] login: error", err);
    error.value = err instanceof Error ? err.message : "Authentication failed";
  } finally {
    console.log("[TADA] login: finally");
    isLoading.value = false;
  }
}
</script>

<template>
  <div
    class="min-h-screen flex items-center justify-center bg-pearl-base dark:bg-cosmic-violet px-4"
  >
    <div class="max-w-md w-full">
      <!-- Logo/Title -->
      <div class="text-center mb-8">
        <img
          src="/icons/tada-logotype.png"
          alt="TA-DA"
          class="h-24 w-auto mx-auto mb-4"
        />
        <p class="text-text-light-secondary dark:text-text-dark-secondary">
          {{ mode === "login" ? "Welcome back" : "Create your account" }}
        </p>
      </div>

      <!-- Auth Form -->
      <div
        class="bg-pearl-mist dark:bg-cosmic-indigo rounded-xl shadow-lg p-8 border border-text-light-muted/20 dark:border-text-dark-muted/20"
      >
        <form class="space-y-6" @submit.prevent="handleSubmit">
          <!-- Username -->
          <div>
            <label
              for="username"
              class="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-2"
            >
              Username
            </label>
            <input
              id="username"
              v-model="username"
              type="text"
              autocomplete="username"
              required
              class="w-full px-4 py-3 rounded-lg border border-text-light-muted/30 dark:border-text-dark-muted/30 bg-pearl-base dark:bg-cosmic-void text-text-light-primary dark:text-text-dark-primary focus:outline-none focus:ring-2 focus:ring-tada-500 dark:focus:ring-tada-500 focus:border-transparent"
              :placeholder="
                mode === 'register'
                  ? 'Choose a username'
                  : 'Enter your username'
              "
            />
          </div>

          <!-- Password -->
          <div>
            <label
              for="password"
              class="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-2"
            >
              Password
            </label>
            <input
              id="password"
              v-model="password"
              type="password"
              autocomplete="current-password"
              required
              class="w-full px-4 py-3 rounded-lg border border-text-light-muted/30 dark:border-text-dark-muted/30 bg-pearl-base dark:bg-cosmic-void text-text-light-primary dark:text-text-dark-primary focus:outline-none focus:ring-2 focus:ring-tada-500 dark:focus:ring-tada-500 focus:border-transparent"
              :placeholder="
                mode === 'register'
                  ? 'Choose a password (min 8 characters)'
                  : 'Enter your password'
              "
            />
            <div v-if="mode === 'login'" class="mt-2 text-right">
              <NuxtLink
                to="/forgot-password"
                class="text-sm text-tada-700 hover:text-gold-line dark:text-tada-300 dark:hover:text-gold-amber transition-colors"
              >
                Forgot password?
              </NuxtLink>
            </div>
          </div>

          <!-- Confirm Password (register only) -->
          <div v-if="mode === 'register'">
            <label
              for="confirmPassword"
              class="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-2"
            >
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              v-model="confirmPassword"
              type="password"
              autocomplete="new-password"
              required
              class="w-full px-4 py-3 rounded-lg border border-text-light-muted/30 dark:border-text-dark-muted/30 bg-pearl-base dark:bg-cosmic-void text-text-light-primary dark:text-text-dark-primary focus:outline-none focus:ring-2 focus:ring-tada-500 dark:focus:ring-tada-500 focus:border-transparent"
              placeholder="Confirm your password"
            />
          </div>

          <!-- Error Message -->
          <div
            v-if="error"
            class="p-3 rounded-lg bg-gold-line/20 dark:bg-gold-amber/20 border border-gold-line dark:border-gold-amber"
          >
            <p
              class="text-sm text-text-light-primary dark:text-text-dark-primary"
            >
              {{ error }}
            </p>
          </div>

          <!-- Submit Button -->
          <button
            type="submit"
            :disabled="isLoading"
            class="w-full py-3 px-4 bg-tada-600 hover:bg-gold-line disabled:bg-text-light-muted dark:bg-tada-600 dark:hover:bg-gold-amber dark:disabled:bg-text-dark-muted text-text-light-primary dark:text-cosmic-void font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <span v-if="!isLoading">{{
              mode === "login" ? "Sign In" : "Create Account"
            }}</span>
            <span v-else>
              <div
                class="animate-spin rounded-full h-5 w-5 border-2 border-text-light-primary dark:border-cosmic-void border-t-transparent"
              />
            </span>
          </button>
        </form>

        <!-- Toggle Mode -->
        <div v-if="hasUsers" class="mt-6 text-center">
          <button
            type="button"
            class="text-sm text-tada-700 hover:text-gold-line dark:text-tada-300 dark:hover:text-gold-amber transition-colors"
            @click="mode = mode === 'login' ? 'register' : 'login'"
          >
            {{
              mode === "login"
                ? "Need an account? Register"
                : "Already have an account? Sign in"
            }}
          </button>
        </div>

        <!-- First User Message -->
        <div
          v-if="!hasUsers"
          class="mt-6 p-3 rounded-lg bg-tada-100/20 dark:bg-tada-600/20 border border-gold-line dark:border-tada-600"
        >
          <p
            class="text-sm text-text-light-primary dark:text-text-dark-primary text-center"
          >
            👋 Welcome! Create your first account to get started.
          </p>
        </div>
      </div>
      <div class="text-center mt-4 space-y-1">
        <p class="text-xs text-stone-400">api: {{ debugApiUrl }}</p>
        <NuxtLink to="/debug-auth" class="text-xs text-stone-400 underline">debug</NuxtLink>
      </div>
    </div>
  </div>
</template>
