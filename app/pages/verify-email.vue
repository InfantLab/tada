<script setup lang="ts">
definePageMeta({
  layout: "default",
});

const route = useRoute();
const router = useRouter();
const token = computed(() => route.query["token"] as string | undefined);

const isVerifying = ref(true);
const error = ref<string | null>(null);
const success = ref(false);

interface VerifyEmailResponse {
  success: boolean;
  message: string;
  alreadyVerified?: boolean;
}

// Verify email on mount
onMounted(async () => {
  if (!token.value) {
    error.value = "No verification token provided. Please request a new verification email.";
    isVerifying.value = false;
    return;
  }

  try {
    const result = await $fetch<VerifyEmailResponse>("/api/auth/verify-email", {
      method: "POST",
      body: { token: token.value },
    });

    if (result.success) {
      success.value = true;
    } else {
      error.value = result.message || "Verification failed";
    }
  } catch (err: unknown) {
    console.error("Email verification failed:", err);
    if (err && typeof err === "object" && "data" in err) {
      const errorData = err.data as { statusMessage?: string };
      error.value = errorData.statusMessage || "Email verification failed";
    } else {
      error.value = "Unable to verify email. Please try again.";
    }
  } finally {
    isVerifying.value = false;
  }
});

function goToHome() {
  router.push("/");
}

function goToSettings() {
  router.push("/settings");
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
          Email Verification
        </p>
      </div>

      <!-- Loading State -->
      <div
        v-if="isVerifying"
        class="bg-white dark:bg-cosmic-violet/50 rounded-2xl shadow-lg p-8 text-center"
      >
        <div class="text-4xl mb-4 animate-pulse">📧</div>
        <p class="text-cosmic-violet/70 dark:text-pearl-base/70">
          Verifying your email...
        </p>
      </div>

      <!-- Error State -->
      <div
        v-else-if="error"
        class="bg-white dark:bg-cosmic-violet/50 rounded-2xl shadow-lg p-8"
      >
        <div class="text-center">
          <div class="text-5xl mb-4">⚠️</div>
          <h2
            class="text-xl font-semibold text-cosmic-violet dark:text-pearl-base mb-2"
          >
            Verification Failed
          </h2>
          <p class="text-cosmic-violet/70 dark:text-pearl-base/70 mb-6">
            {{ error }}
          </p>
          <button
            class="inline-block py-3 px-6 bg-cosmic-violet dark:bg-gold text-white dark:text-cosmic-violet font-semibold rounded-lg hover:opacity-90 transition-opacity"
            @click="goToSettings"
          >
            Go to Settings
          </button>
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
            Email Verified!
          </h2>
          <p class="text-cosmic-violet/70 dark:text-pearl-base/70 mb-6">
            Your email address has been verified successfully. You now have full
            access to your account.
          </p>
          <button
            class="inline-block py-3 px-6 bg-cosmic-violet dark:bg-gold text-white dark:text-cosmic-violet font-semibold rounded-lg hover:opacity-90 transition-opacity"
            @click="goToHome"
          >
            Continue to Ta-Da!
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
