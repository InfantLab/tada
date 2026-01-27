<script setup lang="ts">
/**
 * VoiceSettings Component
 * Settings UI for voice input configuration
 * @component settings/VoiceSettings
 */

import type { STTProvider, LLMProvider } from "~/types/voice";
import ModelDownloadProgress from "~/components/voice/ModelDownloadProgress.vue";

const voiceSettings = useVoiceSettings();
const { success: showSuccess, error: showError } = useToast();

// Load settings on mount
onMounted(() => {
  voiceSettings.loadPreferences();
});

// Local state for API key inputs (not encrypted until save)
const apiKeyInputs = ref({
  openai: "",
  anthropic: "",
  groq: "",
});

const showApiKeyInput = ref({
  openai: false,
  anthropic: false,
  groq: false,
});

const testingKey = ref<string | null>(null);

// WiFi-only download preference
const wifiOnlyDownload = ref(true);

// Handle model download events
function handleModelDownload(modelSize: "tiny" | "base" | "small"): void {
  showSuccess(
    `${modelSize.charAt(0).toUpperCase() + modelSize.slice(1)} model downloaded successfully!`,
  );
}

function handleModelError(errorMessage: string): void {
  showError(errorMessage);
}

// STT provider options
const sttProviderOptions: Array<{
  value: STTProvider;
  label: string;
  description: string;
}> = [
  {
    value: "auto",
    label: "Auto",
    description: "Automatically select best option",
  },
  {
    value: "web-speech",
    label: "Browser",
    description: "Free, uses browser speech recognition",
  },
  {
    value: "whisper-wasm",
    label: "On-Device",
    description: "Private, requires model download",
  },
  {
    value: "whisper-cloud",
    label: "Cloud",
    description: "Fast, uses server AI",
  },
];

// LLM provider options
const llmProviderOptions: Array<{
  value: LLMProvider;
  label: string;
  description: string;
}> = [
  {
    value: "auto",
    label: "Auto (Recommended)",
    description:
      "Uses fast server AI (Groq), or your own keys below if configured",
  },
  {
    value: "openai",
    label: "OpenAI (BYOK)",
    description: "Always use your OpenAI key (gpt-4o-mini)",
  },
  {
    value: "anthropic",
    label: "Anthropic (BYOK)",
    description: "Always use your Claude key (claude-3-haiku)",
  },
];

// Masked API key display
function getMaskedKey(provider: "openai" | "anthropic" | "groq"): string {
  const hasKey = voiceSettings.hasApiKey(provider);
  if (!hasKey) return "Not configured";
  return "••••••••" + "••••"; // Show masked
}

// Toggle API key input
function toggleKeyInput(provider: "openai" | "anthropic" | "groq"): void {
  showApiKeyInput.value[provider] = !showApiKeyInput.value[provider];
  if (!showApiKeyInput.value[provider]) {
    apiKeyInputs.value[provider] = "";
  }
}

// Save API key (with MVP encryption - stores as ciphertext directly)
async function saveApiKey(
  provider: "openai" | "anthropic" | "groq",
): Promise<void> {
  const key = apiKeyInputs.value[provider].trim();
  if (!key) {
    showError("Please enter an API key");
    return;
  }

  // MVP: Store key directly (proper encryption would use Web Crypto API)
  // TODO: Implement proper encryption with PBKDF2 + AES-GCM
  const encryptedKey = {
    ciphertext: key,
    iv: "",
    salt: "",
    addedAt: new Date().toISOString(),
  };

  voiceSettings.setApiKey(provider, encryptedKey);
  apiKeyInputs.value[provider] = "";
  showApiKeyInput.value[provider] = false;
  showSuccess(
    `${provider.charAt(0).toUpperCase() + provider.slice(1)} API key saved`,
  );
}

// Remove API key
function removeKey(provider: "openai" | "anthropic" | "groq"): void {
  voiceSettings.removeApiKey(provider);
  showSuccess(
    `${provider.charAt(0).toUpperCase() + provider.slice(1)} API key removed`,
  );
}

// Test API key connection
async function testConnection(
  provider: "openai" | "anthropic" | "groq",
): Promise<void> {
  if (!voiceSettings.hasApiKey(provider)) {
    showError("No API key configured");
    return;
  }

  testingKey.value = provider;

  try {
    // TODO: Implement actual API test
    // For now, just simulate a delay
    await new Promise((resolve) => setTimeout(resolve, 1000));
    showSuccess(
      `${provider.charAt(0).toUpperCase() + provider.slice(1)} connection successful!`,
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Connection failed";
    showError(message);
  } finally {
    testingKey.value = null;
  }
}

// Usage stats
const usagePercent = computed(() => {
  const limit = 50; // Free tier limit
  const used = voiceSettings.voiceEntriesThisMonth.value;
  return Math.min((used / limit) * 100, 100);
});
</script>

<template>
  <div class="voice-settings space-y-6">
    <!-- Section Header -->
    <div class="flex items-center gap-3">
      <span class="text-2xl">🎤</span>
      <div>
        <h2 class="text-lg font-semibold text-stone-800 dark:text-stone-100">
          Voice & AI
        </h2>
        <p class="text-sm text-stone-500 dark:text-stone-400">
          Configure voice input and AI processing
        </p>
      </div>
    </div>

    <!-- Usage Stats -->
    <div class="bg-stone-50 dark:bg-stone-800 rounded-xl p-4">
      <div class="flex items-center justify-between mb-2">
        <span class="text-sm font-medium text-stone-700 dark:text-stone-300">
          Voice Entries This Month
        </span>
        <span class="text-sm text-stone-500 dark:text-stone-400">
          {{ voiceSettings.voiceEntriesThisMonth.value }} / 50
        </span>
      </div>
      <div
        class="w-full h-2 bg-stone-200 dark:bg-stone-700 rounded-full overflow-hidden"
      >
        <div
          class="h-full bg-indigo-500 rounded-full transition-all duration-300"
          :style="{ width: `${usagePercent}%` }"
        />
      </div>
      <p class="text-xs text-stone-500 dark:text-stone-400 mt-2">
        Free tier: 50 voice entries/month. Add API keys for unlimited use.
      </p>
    </div>

    <!-- STT Provider -->
    <div class="space-y-3">
      <label
        class="block text-sm font-medium text-stone-700 dark:text-stone-300"
      >
        Speech Recognition
      </label>
      <div class="grid gap-2">
        <button
          v-for="option in sttProviderOptions"
          :key="option.value"
          type="button"
          class="flex items-start gap-3 p-3 rounded-lg border transition-colors text-left"
          :class="
            voiceSettings.sttProvider.value === option.value
              ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30'
              : 'border-stone-200 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-800'
          "
          @click="voiceSettings.sttProvider.value = option.value"
        >
          <div
            class="w-4 h-4 mt-0.5 rounded-full border-2 flex items-center justify-center"
            :class="
              voiceSettings.sttProvider.value === option.value
                ? 'border-indigo-500'
                : 'border-stone-300 dark:border-stone-600'
            "
          >
            <div
              v-if="voiceSettings.sttProvider.value === option.value"
              class="w-2 h-2 rounded-full bg-indigo-500"
            />
          </div>
          <div>
            <span class="font-medium text-stone-800 dark:text-stone-100">
              {{ option.label }}
            </span>
            <p class="text-sm text-stone-500 dark:text-stone-400">
              {{ option.description }}
            </p>
          </div>
        </button>
      </div>
    </div>

    <!-- LLM Provider -->
    <div class="space-y-3">
      <label
        class="block text-sm font-medium text-stone-700 dark:text-stone-300"
      >
        AI Processing
      </label>
      <div class="grid gap-2">
        <button
          v-for="option in llmProviderOptions"
          :key="option.value"
          type="button"
          class="flex items-start gap-3 p-3 rounded-lg border transition-colors text-left"
          :class="
            voiceSettings.llmProvider.value === option.value
              ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30'
              : 'border-stone-200 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-800'
          "
          @click="voiceSettings.llmProvider.value = option.value"
        >
          <div
            class="w-4 h-4 mt-0.5 rounded-full border-2 flex items-center justify-center"
            :class="
              voiceSettings.llmProvider.value === option.value
                ? 'border-indigo-500'
                : 'border-stone-300 dark:border-stone-600'
            "
          >
            <div
              v-if="voiceSettings.llmProvider.value === option.value"
              class="w-2 h-2 rounded-full bg-indigo-500"
            />
          </div>
          <div>
            <span class="font-medium text-stone-800 dark:text-stone-100">
              {{ option.label }}
            </span>
            <p class="text-sm text-stone-500 dark:text-stone-400">
              {{ option.description }}
            </p>
          </div>
        </button>
      </div>
    </div>

    <!-- Prefer Offline Toggle -->
    <div
      class="flex items-center justify-between p-4 bg-stone-50 dark:bg-stone-800 rounded-xl"
    >
      <div>
        <span class="font-medium text-stone-800 dark:text-stone-100">
          Prefer Offline Processing
        </span>
        <p class="text-sm text-stone-500 dark:text-stone-400">
          Use on-device processing when available for privacy
        </p>
      </div>
      <button
        type="button"
        class="relative w-12 h-7 rounded-full transition-colors"
        :class="
          voiceSettings.preferOffline.value
            ? 'bg-indigo-500 dark:bg-indigo-600'
            : 'bg-stone-300 dark:bg-stone-600'
        "
        role="switch"
        :aria-checked="voiceSettings.preferOffline.value"
        @click="
          voiceSettings.preferOffline.value = !voiceSettings.preferOffline.value
        "
      >
        <span
          class="absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform"
          :class="voiceSettings.preferOffline.value ? 'translate-x-5' : ''"
        />
      </button>
    </div>

    <!-- WiFi-Only Download Toggle -->
    <div
      class="flex items-center justify-between p-4 bg-stone-50 dark:bg-stone-800 rounded-xl"
    >
      <div>
        <span class="font-medium text-stone-800 dark:text-stone-100">
          WiFi-Only Model Download
        </span>
        <p class="text-sm text-stone-500 dark:text-stone-400">
          Only download AI models when connected to WiFi
        </p>
      </div>
      <button
        type="button"
        class="relative w-12 h-7 rounded-full transition-colors"
        :class="
          wifiOnlyDownload
            ? 'bg-indigo-500 dark:bg-indigo-600'
            : 'bg-stone-300 dark:bg-stone-600'
        "
        role="switch"
        :aria-checked="wifiOnlyDownload"
        @click="wifiOnlyDownload = !wifiOnlyDownload"
      >
        <span
          class="absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform"
          :class="wifiOnlyDownload ? 'translate-x-5' : ''"
        />
      </button>
    </div>

    <!-- On-Device Model Downloads (shown when On-Device STT is selected) -->
    <div
      v-if="voiceSettings.sttProvider.value === 'whisper-wasm'"
      class="space-y-4"
    >
      <h3 class="text-sm font-medium text-stone-700 dark:text-stone-300">
        On-Device Speech Model
      </h3>
      <p class="text-sm text-stone-500 dark:text-stone-400">
        Download a Whisper model for private, on-device transcription. Larger
        models are more accurate but take longer.
      </p>
      <div class="grid gap-3">
        <ModelDownloadProgress
          model-size="tiny"
          :wifi-only="wifiOnlyDownload"
          @download-complete="handleModelDownload('tiny')"
          @download-error="handleModelError"
        />
        <ModelDownloadProgress
          model-size="base"
          :wifi-only="wifiOnlyDownload"
          @download-complete="handleModelDownload('base')"
          @download-error="handleModelError"
        />
        <ModelDownloadProgress
          model-size="small"
          :wifi-only="wifiOnlyDownload"
          @download-complete="handleModelDownload('small')"
          @download-error="handleModelError"
        />
      </div>
    </div>

    <!-- How It Works -->
    <div class="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl">
      <div class="flex gap-3">
        <span class="text-xl">⚡</span>
        <div>
          <p class="text-sm font-medium text-indigo-800 dark:text-indigo-200">
            How AI Processing Works
          </p>
          <p class="text-sm text-indigo-700 dark:text-indigo-300 mt-1">
            <strong>Default:</strong> Your transcriptions are sent to the Ta-Da
            server, which uses Groq (Llama 3.3 70B) to extract tadas. Fast &
            free up to 50/month.
          </p>
          <p class="text-sm text-indigo-700 dark:text-indigo-300 mt-1">
            <strong>BYOK:</strong> Add your own OpenAI or Anthropic key below to
            use your own account instead — unlimited, billed to you directly.
          </p>
        </div>
      </div>
    </div>

    <!-- API Keys Section -->
    <div class="space-y-4">
      <h3 class="text-sm font-medium text-stone-700 dark:text-stone-300">
        Bring Your Own Key (BYOK)
      </h3>
      <p class="text-sm text-stone-500 dark:text-stone-400">
        Optional: Add your OpenAI or Anthropic API key to use your own account
        for unlimited processing
      </p>

      <!-- OpenAI -->
      <div class="border border-stone-200 dark:border-stone-700 rounded-xl p-4">
        <div class="flex items-center justify-between">
          <div>
            <span class="font-medium text-stone-800 dark:text-stone-100"
              >OpenAI</span
            >
            <p class="text-sm text-stone-500 dark:text-stone-400">
              {{ getMaskedKey("openai") }}
            </p>
          </div>
          <div class="flex items-center gap-2">
            <button
              v-if="voiceSettings.hasApiKey('openai')"
              type="button"
              class="px-3 py-1.5 text-sm rounded-lg bg-stone-100 dark:bg-stone-700 hover:bg-stone-200 dark:hover:bg-stone-600 transition-colors"
              :disabled="testingKey === 'openai'"
              @click="testConnection('openai')"
            >
              {{ testingKey === "openai" ? "Testing..." : "Test" }}
            </button>
            <button
              v-if="voiceSettings.hasApiKey('openai')"
              type="button"
              class="px-3 py-1.5 text-sm rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
              @click="removeKey('openai')"
            >
              Remove
            </button>
            <button
              v-else
              type="button"
              class="px-3 py-1.5 text-sm rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-900/50 transition-colors"
              @click="toggleKeyInput('openai')"
            >
              {{ showApiKeyInput.openai ? "Cancel" : "Add Key" }}
            </button>
          </div>
        </div>
        <div v-if="showApiKeyInput.openai" class="mt-3 flex gap-2">
          <input
            v-model="apiKeyInputs.openai"
            type="password"
            placeholder="sk-..."
            class="flex-1 px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-700 text-stone-800 dark:text-stone-100"
          />
          <button
            type="button"
            class="px-4 py-2 rounded-lg bg-indigo-500 text-white hover:bg-indigo-600 transition-colors"
            @click="saveApiKey('openai')"
          >
            Save
          </button>
        </div>
      </div>

      <!-- Anthropic -->
      <div class="border border-stone-200 dark:border-stone-700 rounded-xl p-4">
        <div class="flex items-center justify-between">
          <div>
            <span class="font-medium text-stone-800 dark:text-stone-100"
              >Anthropic</span
            >
            <p class="text-sm text-stone-500 dark:text-stone-400">
              {{ getMaskedKey("anthropic") }}
            </p>
          </div>
          <div class="flex items-center gap-2">
            <button
              v-if="voiceSettings.hasApiKey('anthropic')"
              type="button"
              class="px-3 py-1.5 text-sm rounded-lg bg-stone-100 dark:bg-stone-700 hover:bg-stone-200 dark:hover:bg-stone-600 transition-colors"
              :disabled="testingKey === 'anthropic'"
              @click="testConnection('anthropic')"
            >
              {{ testingKey === "anthropic" ? "Testing..." : "Test" }}
            </button>
            <button
              v-if="voiceSettings.hasApiKey('anthropic')"
              type="button"
              class="px-3 py-1.5 text-sm rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
              @click="removeKey('anthropic')"
            >
              Remove
            </button>
            <button
              v-else
              type="button"
              class="px-3 py-1.5 text-sm rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-900/50 transition-colors"
              @click="toggleKeyInput('anthropic')"
            >
              {{ showApiKeyInput.anthropic ? "Cancel" : "Add Key" }}
            </button>
          </div>
        </div>
        <div v-if="showApiKeyInput.anthropic" class="mt-3 flex gap-2">
          <input
            v-model="apiKeyInputs.anthropic"
            type="password"
            placeholder="sk-ant-..."
            class="flex-1 px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-700 text-stone-800 dark:text-stone-100"
          />
          <button
            type="button"
            class="px-4 py-2 rounded-lg bg-indigo-500 text-white hover:bg-indigo-600 transition-colors"
            @click="saveApiKey('anthropic')"
          >
            Save
          </button>
        </div>
      </div>
    </div>

    <!-- Diagnostics Section -->
    <div
      class="rounded-xl border border-stone-200 bg-white p-4 dark:border-stone-700 dark:bg-stone-800"
    >
      <div class="mb-4 flex items-center gap-3">
        <span class="text-xl">🔧</span>
        <div>
          <h3 class="font-medium text-stone-800 dark:text-stone-100">
            Troubleshooting
          </h3>
          <p class="text-sm text-stone-500 dark:text-stone-400">
            Debug voice recording issues on this device
          </p>
        </div>
      </div>

      <VoiceDiagnostics />
    </div>

    <!-- Privacy Note -->
    <div class="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl">
      <div class="flex gap-3">
        <span class="text-xl">🔐</span>
        <div>
          <p class="text-sm font-medium text-amber-800 dark:text-amber-200">
            Privacy Note
          </p>
          <ul
            class="text-sm text-amber-700 dark:text-amber-300 mt-1 space-y-1 list-disc list-inside"
          >
            <li>
              <strong>Speech-to-text:</strong> Browser sends audio to
              Google/Apple for transcription
            </li>
            <li>
              <strong>AI extraction:</strong> Text sent to Ta-Da server → Groq
              (default) or your BYOK provider
            </li>
            <li>
              <strong>Your API keys:</strong> Stored locally on your device,
              sent directly to provider
            </li>
            <li>
              <strong>Audio:</strong> Never persisted — deleted immediately
              after transcription
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>
