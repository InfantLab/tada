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

// Check if any users exist - if not, force register mode
const hasUsers = ref(true);

onMounted(async () => {
  // Check if already authenticated - redirect to home
  try {
    const session = await $fetch<{ user?: { id: string } }>("/api/auth/session");
    if (session.user) {
      navigateTo("/");
      return;
    }
  } catch {
    // Not authenticated, continue
  }

  // Check if any users exist
  try {
    const response = await $fetch<{ hasUsers: boolean }>("/api/auth/has-users");
    hasUsers.value = response.hasUsers;
    if (!hasUsers.value) {
      mode.value = "register";
    }
  } catch {
    // Assume no users exist if endpoint fails
    mode.value = "register";
    hasUsers.value = false;
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

    if (password.value.length < 6) {
      error.value = "Password must be at least 6 characters";
      return;
    }
  }

  isLoading.value = true;

  try {
    const endpoint =
      mode.value === "login" ? "/api/auth/login" : "/api/auth/register";

    await $fetch<unknown>(endpoint, {
      method: "POST",
      body: {
        username: username.value,
        password: password.value,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
    });

    // Redirect to intended page or home
    const redirect = useRoute().query["redirect"] as string | undefined;
    navigateTo(redirect || "/");
  } catch (err: unknown) {
    console.error("Auth failed:", err);
    if (err && typeof err === "object" && "data" in err) {
      const errorData = err.data as { statusMessage?: string };
      error.value = errorData.statusMessage || "Authentication failed";
    } else {
      error.value = "Authentication failed";
    }
  } finally {
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
                  ? 'Choose a password (min 6 characters)'
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
    </div>
  </div>
</template>
