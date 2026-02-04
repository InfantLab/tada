<script setup lang="ts">
import { useToast } from "~/composables/useToast";

definePageMeta({
  layout: "default",
  middleware: ["auth"],
});

const router = useRouter();
const { showError, showSuccess } = useToast();

const username = ref("");
const email = ref("");
const password = ref("");
const confirmPassword = ref("");
const isLoading = ref(false);

// Check if any users exist - if not, skip email requirement
const requireEmail = ref(true);
onMounted(async () => {
  try {
    const response = await $fetch<{ hasUsers: boolean }>("/api/auth/check");
    requireEmail.value = response.hasUsers;
  } catch {
    // Default to requiring email if check fails
    requireEmail.value = true;
  }
});

async function handleRegister() {
  // Validation
  if (!username.value || !password.value) {
    showError("Username and password are required");
    return;
  }

  if (requireEmail.value && !email.value) {
    showError("Email is required");
    return;
  }

  if (password.value !== confirmPassword.value) {
    showError("Passwords do not match");
    return;
  }

  isLoading.value = true;

  try {
    await $fetch("/api/auth/register", {
      method: "POST",
      body: {
        username: username.value,
        email: email.value || undefined,
        password: password.value,
      },
    });

    showSuccess("Account created! Redirecting...");
    setTimeout(() => {
      router.push("/");
    }, 500);
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Registration failed";
    showError(errorMessage);
  } finally {
    isLoading.value = false;
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center px-4 py-12">
    <div class="max-w-md w-full space-y-8">
      <!-- Header -->
      <div class="text-center">
        <h1 class="text-4xl font-bold text-stone-800 dark:text-stone-100 mb-2">
          Join Ta-Da! 🎉
        </h1>
        <p class="text-stone-600 dark:text-stone-400">
          Start celebrating what you do, not chasing what you don't.
        </p>
      </div>

      <!-- Registration Form -->
      <form
        class="mt-8 space-y-6 bg-white dark:bg-stone-800 p-8 rounded-xl border border-stone-200 dark:border-stone-700"
        @submit.prevent="handleRegister"
      >
        <div class="space-y-4">
          <!-- Username -->
          <div>
            <label
              for="username"
              class="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1"
            >
              Username
            </label>
            <input
              id="username"
              v-model="username"
              type="text"
              autocomplete="username"
              required
              class="w-full px-3 py-2 border border-stone-300 dark:border-stone-600 rounded-lg focus:ring-2 focus:ring-tada-500 focus:border-transparent bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100"
              placeholder="your-username"
            >
          </div>

          <!-- Email -->
          <div>
            <label
              for="email"
              class="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1"
            >
              Email {{ requireEmail ? '' : '(optional)' }}
            </label>
            <input
              id="email"
              v-model="email"
              type="email"
              autocomplete="email"
              :required="requireEmail"
              class="w-full px-3 py-2 border border-stone-300 dark:border-stone-600 rounded-lg focus:ring-2 focus:ring-tada-500 focus:border-transparent bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100"
              placeholder="you@example.com"
            >
          </div>

          <!-- Password -->
          <div>
            <label
              for="password"
              class="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1"
            >
              Password
            </label>
            <input
              id="password"
              v-model="password"
              type="password"
              autocomplete="new-password"
              required
              class="w-full px-3 py-2 border border-stone-300 dark:border-stone-600 rounded-lg focus:ring-2 focus:ring-tada-500 focus:border-transparent bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100"
              placeholder="••••••••"
            >
          </div>

          <!-- Confirm Password -->
          <div>
            <label
              for="confirmPassword"
              class="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1"
            >
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              v-model="confirmPassword"
              type="password"
              autocomplete="new-password"
              required
              class="w-full px-3 py-2 border border-stone-300 dark:border-stone-600 rounded-lg focus:ring-2 focus:ring-tada-500 focus:border-transparent bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100"
              placeholder="••••••••"
            >
          </div>
        </div>

        <!-- Submit Button -->
        <button
          type="submit"
          :disabled="isLoading"
          class="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-tada-600 hover:bg-tada-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-tada-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {{ isLoading ? "Creating account..." : "Create Account" }}
        </button>

        <!-- Login Link -->
        <div class="text-center">
          <button
            type="button"
            class="text-sm text-tada-600 hover:text-tada-700 dark:text-tada-400 dark:hover:text-tada-300"
            @click="router.push('/login')"
          >
            Already have an account? Log in
          </button>
        </div>
      </form>

      <!-- Info Footer -->
      <p class="text-center text-xs text-stone-500 dark:text-stone-400">
        By creating an account, you agree to our
        <NuxtLink to="/terms" class="text-tada-600 hover:text-tada-700">Terms</NuxtLink>
        and
        <NuxtLink to="/privacy" class="text-tada-600 hover:text-tada-700">Privacy Policy</NuxtLink>
      </p>
    </div>
  </div>
</template>
