<script setup lang="ts">
definePageMeta({
  layout: "default",
});

const email = ref("");
const isLoading = ref(false);
const error = ref<string | null>(null);
const success = ref(false);

async function handleSubmit() {
  error.value = null;

  if (!email.value) {
    error.value = "Please enter your email address";
    return;
  }

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.value)) {
    error.value = "Please enter a valid email address";
    return;
  }

  isLoading.value = true;

  try {
    await $fetch<unknown>("/api/auth/forgot-password", {
      method: "POST",
      body: { email: email.value },
    });

    success.value = true;
  } catch (err: unknown) {
    console.error("Forgot password failed:", err);
    if (err && typeof err === "object" && "data" in err) {
      const errorData = err.data as { statusMessage?: string };
      error.value = errorData.statusMessage || "Request failed";
    } else {
      error.value = "Request failed. Please try again.";
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
          Reset your password
        </p>
      </div>

      <!-- Success State -->
      <div
        v-if="success"
        class="bg-white dark:bg-cosmic-violet/50 rounded-2xl shadow-lg p-8"
      >
        <div class="text-center">
          <div class="text-5xl mb-4">📧</div>
          <h2
            class="text-xl font-semibold text-cosmic-violet dark:text-pearl-base mb-2"
          >
            Check your email
          </h2>
          <p class="text-cosmic-violet/70 dark:text-pearl-base/70 mb-6">
            If an account exists with that email address, we've sent password
            reset instructions.
          </p>
          <p class="text-sm text-cosmic-violet/50 dark:text-pearl-base/50 mb-4">
            Didn't receive an email? Check your spam folder or try again with a
            different address.
          </p>
          <NuxtLink
            to="/login"
            class="text-cosmic-violet dark:text-gold hover:underline"
          >
            ← Back to login
          </NuxtLink>
        </div>
      </div>

      <!-- Form -->
      <form
        v-else
        class="bg-white dark:bg-cosmic-violet/50 rounded-2xl shadow-lg p-8 space-y-6"
        @submit.prevent="handleSubmit"
      >
        <div>
          <label
            for="email"
            class="block text-sm font-medium text-cosmic-violet dark:text-pearl-base mb-2"
          >
            Email Address
          </label>
          <input
            id="email"
            v-model="email"
            type="email"
            placeholder="Enter your email"
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
          <span v-if="isLoading">Sending...</span>
          <span v-else>Send Reset Link</span>
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
