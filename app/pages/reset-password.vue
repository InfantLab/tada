<script setup lang="ts">
definePageMeta({
  layout: "default",
});

const route = useRoute();
const token = computed(() => route.query["token"] as string | undefined);

const password = ref("");
const confirmPassword = ref("");
const isLoading = ref(false);
const isValidating = ref(true);
const error = ref<string | null>(null);
const tokenError = ref<string | null>(null);
const success = ref(false);
const username = ref<string | null>(null);

interface VerifyTokenResponse {
  valid: boolean;
  error?: string;
  email?: string;
  username?: string;
}

// Validate token on mount
onMounted(async () => {
  if (!token.value) {
    tokenError.value =
      "No reset token provided. Please request a new password reset link.";
    isValidating.value = false;
    return;
  }

  try {
    const result = await $fetch<VerifyTokenResponse>(
      "/api/auth/verify-reset-token",
      {
        query: { token: token.value },
      },
    );

    if (!result.valid) {
      tokenError.value = result.error || "Invalid or expired reset link.";
    } else {
      username.value = result.username || null;
    }
  } catch (err) {
    console.error("Token validation failed:", err);
    tokenError.value = "Unable to verify reset link. Please try again.";
  } finally {
    isValidating.value = false;
  }
});

async function handleSubmit() {
  error.value = null;

  if (!password.value) {
    error.value = "Please enter a new password";
    return;
  }

  if (password.value.length < 6) {
    error.value = "Password must be at least 6 characters";
    return;
  }

  if (password.value !== confirmPassword.value) {
    error.value = "Passwords do not match";
    return;
  }

  isLoading.value = true;

  try {
    await $fetch<unknown>("/api/auth/reset-password", {
      method: "POST",
      body: {
        token: token.value,
        password: password.value,
      },
    });

    success.value = true;
  } catch (err: unknown) {
    console.error("Password reset failed:", err);
    if (err && typeof err === "object" && "data" in err) {
      const errorData = err.data as { statusMessage?: string };
      error.value = errorData.statusMessage || "Password reset failed";
    } else {
      error.value = "Password reset failed. Please try again.";
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
        <h1 class="text-4xl font-bold text-cosmic-violet dark:text-gold mb-2">
          🎉 Ta-Da!
        </h1>
        <p class="text-cosmic-violet/70 dark:text-pearl-base/70">
          Create a new password
        </p>
      </div>

      <!-- Loading State -->
      <div
        v-if="isValidating"
        class="bg-white dark:bg-cosmic-violet/50 rounded-2xl shadow-lg p-8 text-center"
      >
        <div class="text-4xl mb-4 animate-pulse">🔐</div>
        <p class="text-cosmic-violet/70 dark:text-pearl-base/70">
          Validating reset link...
        </p>
      </div>

      <!-- Token Error State -->
      <div
        v-else-if="tokenError"
        class="bg-white dark:bg-cosmic-violet/50 rounded-2xl shadow-lg p-8"
      >
        <div class="text-center">
          <div class="text-5xl mb-4">⚠️</div>
          <h2
            class="text-xl font-semibold text-cosmic-violet dark:text-pearl-base mb-2"
          >
            Invalid Reset Link
          </h2>
          <p class="text-cosmic-violet/70 dark:text-pearl-base/70 mb-6">
            {{ tokenError }}
          </p>
          <NuxtLink
            to="/forgot-password"
            class="inline-block py-3 px-6 bg-cosmic-violet dark:bg-gold text-white dark:text-cosmic-violet font-semibold rounded-lg hover:opacity-90 transition-opacity"
          >
            Request New Link
          </NuxtLink>
        </div>
      </div>

      <!-- Success State -->
      <div
        v-else-if="success"
        class="bg-white dark:bg-cosmic-violet/50 rounded-2xl shadow-lg p-8"
      >
        <div class="text-center">
          <div class="text-5xl mb-4">✅</div>
          <h2
            class="text-xl font-semibold text-cosmic-violet dark:text-pearl-base mb-2"
          >
            Password Reset!
          </h2>
          <p class="text-cosmic-violet/70 dark:text-pearl-base/70 mb-6">
            Your password has been changed successfully. You can now log in with
            your new password.
          </p>
          <NuxtLink
            to="/login"
            class="inline-block py-3 px-6 bg-cosmic-violet dark:bg-gold text-white dark:text-cosmic-violet font-semibold rounded-lg hover:opacity-90 transition-opacity"
          >
            Go to Login
          </NuxtLink>
        </div>
      </div>

      <!-- Reset Form -->
      <form
        v-else
        class="bg-white dark:bg-cosmic-violet/50 rounded-2xl shadow-lg p-8 space-y-6"
        @submit.prevent="handleSubmit"
      >
        <div v-if="username" class="text-center mb-4">
          <p class="text-cosmic-violet/70 dark:text-pearl-base/70">
            Resetting password for
            <span class="font-semibold text-cosmic-violet dark:text-pearl-base">
              {{ username }}
            </span>
          </p>
        </div>

        <div>
          <label
            for="password"
            class="block text-sm font-medium text-cosmic-violet dark:text-pearl-base mb-2"
          >
            New Password
          </label>
          <input
            id="password"
            v-model="password"
            type="password"
            placeholder="Enter new password"
            class="w-full px-4 py-3 rounded-lg border border-cosmic-violet/20 dark:border-pearl-base/20 bg-white dark:bg-cosmic-violet/30 text-cosmic-violet dark:text-pearl-base placeholder-cosmic-violet/40 dark:placeholder-pearl-base/40 focus:outline-none focus:ring-2 focus:ring-gold transition-all"
            :disabled="isLoading"
          />
          <p class="mt-1 text-xs text-cosmic-violet/50 dark:text-pearl-base/50">
            Must be at least 6 characters
          </p>
        </div>

        <div>
          <label
            for="confirmPassword"
            class="block text-sm font-medium text-cosmic-violet dark:text-pearl-base mb-2"
          >
            Confirm Password
          </label>
          <input
            id="confirmPassword"
            v-model="confirmPassword"
            type="password"
            placeholder="Confirm new password"
            class="w-full px-4 py-3 rounded-lg border border-cosmic-violet/20 dark:border-pearl-base/20 bg-white dark:bg-cosmic-violet/30 text-cosmic-violet dark:text-pearl-base placeholder-cosmic-violet/40 dark:placeholder-pearl-base/40 focus:outline-none focus:ring-2 focus:ring-gold transition-all"
            :disabled="isLoading"
          />
        </div>

        <!-- Error message -->
        <div
          v-if="error"
          class="p-3 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg text-sm"
        >
          {{ error }}
        </div>

        <button
          type="submit"
          :disabled="isLoading"
          class="w-full py-3 px-4 bg-cosmic-violet dark:bg-gold text-white dark:text-cosmic-violet font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span v-if="isLoading">Resetting...</span>
          <span v-else>Reset Password</span>
        </button>

        <p
          class="text-center text-sm text-cosmic-violet/60 dark:text-pearl-base/60"
        >
          Remember your password?
          <NuxtLink
            to="/login"
            class="text-cosmic-violet dark:text-gold hover:underline"
          >
            Sign in
          </NuxtLink>
        </p>
      </form>
    </div>
  </div>
</template>
