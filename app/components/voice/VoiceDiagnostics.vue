<script setup lang="ts">
/**
 * VoiceDiagnostics Component
 * Debug panel to help diagnose microphone/voice issues on mobile PWA
 * @component voice/VoiceDiagnostics
 */

import {
  supportsWebSpeech,
  supportsMediaRecorder,
  getBrowserName,
  getSpeechRecognition,
} from "~/utils/voiceBrowserSupport";

const isOpen = ref(false);
const testResults = ref<
  Array<{
    test: string;
    result: string;
    status: "pass" | "fail" | "warn" | "info";
  }>
>([]);
const isRunningTests = ref(false);

// Diagnostic info
const browserInfo = computed(() => ({
  userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "N/A",
  platform: typeof navigator !== "undefined" ? navigator.platform : "N/A",
  browserName: getBrowserName(),
  isPWA:
    typeof window !== "undefined" &&
    window.matchMedia("(display-mode: standalone)").matches,
  isSecureContext: typeof window !== "undefined" && window.isSecureContext,
  protocol: typeof window !== "undefined" ? window.location.protocol : "N/A",
}));

const supportsInfo = computed(() => ({
  mediaRecorder: supportsMediaRecorder(),
  webSpeech: supportsWebSpeech(),
  mediaDevices: typeof navigator !== "undefined" && "mediaDevices" in navigator,
  getUserMedia:
    typeof navigator !== "undefined" &&
    navigator.mediaDevices &&
    "getUserMedia" in navigator.mediaDevices,
  permissions: typeof navigator !== "undefined" && "permissions" in navigator,
}));

async function runDiagnostics() {
  isRunningTests.value = true;
  testResults.value = [];

  // Test 1: Secure context
  addResult(
    "Secure Context",
    browserInfo.value.isSecureContext ? "Yes" : "No",
    browserInfo.value.isSecureContext ? "pass" : "fail",
  );

  // Test 2: Protocol
  addResult(
    "Protocol",
    browserInfo.value.protocol,
    browserInfo.value.protocol === "https:" ? "pass" : "warn",
  );

  // Test 3: MediaDevices API
  addResult(
    "MediaDevices API",
    supportsInfo.value.mediaDevices ? "Available" : "Not available",
    supportsInfo.value.mediaDevices ? "pass" : "fail",
  );

  // Test 4: getUserMedia
  addResult(
    "getUserMedia",
    supportsInfo.value.getUserMedia ? "Available" : "Not available",
    supportsInfo.value.getUserMedia ? "pass" : "fail",
  );

  // Test 5: MediaRecorder
  addResult(
    "MediaRecorder",
    supportsInfo.value.mediaRecorder ? "Available" : "Not available",
    supportsInfo.value.mediaRecorder ? "pass" : "fail",
  );

  // Test 6: Web Speech API
  addResult(
    "Web Speech API",
    supportsInfo.value.webSpeech ? "Available" : "Not available",
    supportsInfo.value.webSpeech ? "pass" : "warn",
  );

  // Test 7: Check permissions API
  if (supportsInfo.value.permissions) {
    try {
      const permission = await navigator.permissions.query({
        name: "microphone" as PermissionName,
      });
      addResult(
        "Microphone Permission",
        permission.state,
        permission.state === "granted"
          ? "pass"
          : permission.state === "prompt"
            ? "info"
            : "fail",
      );
    } catch (err) {
      addResult(
        "Microphone Permission",
        `Error: ${err instanceof Error ? err.message : "Unknown"}`,
        "fail",
      );
    }
  } else {
    addResult("Microphone Permission", "Permissions API not available", "warn");
  }

  // Test 8: Enumerate devices
  if (
    supportsInfo.value.mediaDevices &&
    navigator.mediaDevices.enumerateDevices
  ) {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices.filter((d) => d.kind === "audioinput");
      addResult(
        "Audio Input Devices",
        `${audioInputs.length} found`,
        audioInputs.length > 0 ? "pass" : "fail",
      );

      // List device labels (may be empty before permission granted)
      audioInputs.forEach((device, i) => {
        addResult(
          `  Device ${i + 1}`,
          device.label || "(no label - permission needed)",
          "info",
        );
      });
    } catch (err) {
      addResult(
        "Enumerate Devices",
        `Error: ${err instanceof Error ? err.message : "Unknown"}`,
        "fail",
      );
    }
  }

  // Test 9: Try to get stream
  if (supportsInfo.value.getUserMedia) {
    try {
      addResult("Requesting Mic Access", "Testing...", "info");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const tracks = stream.getAudioTracks();
      addResult("Mic Stream", `Success - ${tracks.length} track(s)`, "pass");
      tracks.forEach((track, i) => {
        addResult(
          `  Track ${i + 1}`,
          `${track.label} (${track.readyState})`,
          track.readyState === "live" ? "pass" : "warn",
        );
        addResult(`  Settings`, JSON.stringify(track.getSettings()), "info");
      });

      // Test MediaRecorder with this stream
      try {
        const mimeTypes = [
          "audio/webm;codecs=opus",
          "audio/webm",
          "audio/mp4",
          "audio/ogg",
        ];
        const supportedTypes = mimeTypes.filter((t) =>
          MediaRecorder.isTypeSupported(t),
        );
        addResult(
          "Supported MIME Types",
          supportedTypes.join(", ") || "None",
          supportedTypes.length > 0 ? "pass" : "fail",
        );

        const recorder = new MediaRecorder(stream);
        addResult(
          "MediaRecorder Created",
          `Using ${recorder.mimeType}`,
          "pass",
        );
        recorder.stop();
      } catch (err) {
        addResult(
          "MediaRecorder Test",
          `Error: ${err instanceof Error ? err.message : "Unknown"}`,
          "fail",
        );
      }

      // Clean up
      stream.getTracks().forEach((track) => track.stop());
    } catch (err) {
      const error = err as Error;
      addResult(
        "Mic Stream",
        `Error: ${error.name} - ${error.message}`,
        "fail",
      );

      // Provide helpful messages for common errors
      if (error.name === "NotAllowedError") {
        addResult(
          "  Fix",
          "Grant microphone permission in browser/system settings",
          "info",
        );
      } else if (error.name === "NotFoundError") {
        addResult(
          "  Fix",
          "Connect a microphone or check device settings",
          "info",
        );
      } else if (error.name === "NotReadableError") {
        addResult("  Fix", "Microphone may be in use by another app", "info");
      } else if (error.name === "OverconstrainedError") {
        addResult("  Fix", "Audio constraints not supported by device", "info");
      }
    }
  }

  // Test 10: Web Speech Recognition test
  if (supportsInfo.value.webSpeech) {
    try {
      const SpeechRecognition = getSpeechRecognition();
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        addResult("SpeechRecognition", "Created successfully", "pass");
        addResult("  continuous", String(recognition.continuous), "info");
        addResult(
          "  interimResults",
          String(recognition.interimResults),
          "info",
        );
      }
    } catch (err) {
      addResult(
        "SpeechRecognition",
        `Error: ${err instanceof Error ? err.message : "Unknown"}`,
        "fail",
      );
    }
  }

  isRunningTests.value = false;
}

function addResult(
  test: string,
  result: string,
  status: "pass" | "fail" | "warn" | "info",
) {
  testResults.value.push({ test, result, status });
}

function copyDiagnostics() {
  const text = [
    "=== Ta-Da Voice Diagnostics ===",
    `Date: ${new Date().toISOString()}`,
    "",
    "Browser Info:",
    `  User Agent: ${browserInfo.value.userAgent}`,
    `  Platform: ${browserInfo.value.platform}`,
    `  Browser: ${browserInfo.value.browserName}`,
    `  PWA Mode: ${browserInfo.value.isPWA}`,
    `  Secure Context: ${browserInfo.value.isSecureContext}`,
    `  Protocol: ${browserInfo.value.protocol}`,
    "",
    "Test Results:",
    ...testResults.value.map(
      (r) => `  [${r.status.toUpperCase()}] ${r.test}: ${r.result}`,
    ),
  ].join("\n");

  navigator.clipboard.writeText(text);
}
</script>

<template>
  <div class="voice-diagnostics">
    <!-- Toggle button -->
    <button
      class="text-xs text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 underline"
      @click="isOpen = !isOpen"
    >
      {{ isOpen ? "Hide" : "Show" }} Voice Diagnostics
    </button>

    <!-- Diagnostic panel -->
    <div
      v-if="isOpen"
      class="mt-2 p-3 bg-stone-100 dark:bg-stone-800 rounded-lg text-xs font-mono space-y-3"
    >
      <!-- Browser info -->
      <div>
        <div class="font-bold text-stone-600 dark:text-stone-300 mb-1">
          Browser Info
        </div>
        <div class="text-stone-500 dark:text-stone-400 space-y-0.5">
          <div>Browser: {{ browserInfo.browserName }}</div>
          <div>PWA: {{ browserInfo.isPWA ? "Yes" : "No" }}</div>
          <div>Secure: {{ browserInfo.isSecureContext ? "Yes" : "No" }}</div>
          <div>Protocol: {{ browserInfo.protocol }}</div>
        </div>
      </div>

      <!-- API Support -->
      <div>
        <div class="font-bold text-stone-600 dark:text-stone-300 mb-1">
          API Support
        </div>
        <div class="text-stone-500 dark:text-stone-400 space-y-0.5">
          <div
            :class="
              supportsInfo.mediaDevices ? 'text-green-600' : 'text-red-600'
            "
          >
            MediaDevices: {{ supportsInfo.mediaDevices ? "✓" : "✗" }}
          </div>
          <div
            :class="
              supportsInfo.getUserMedia ? 'text-green-600' : 'text-red-600'
            "
          >
            getUserMedia: {{ supportsInfo.getUserMedia ? "✓" : "✗" }}
          </div>
          <div
            :class="
              supportsInfo.mediaRecorder ? 'text-green-600' : 'text-red-600'
            "
          >
            MediaRecorder: {{ supportsInfo.mediaRecorder ? "✓" : "✗" }}
          </div>
          <div
            :class="
              supportsInfo.webSpeech ? 'text-green-600' : 'text-amber-600'
            "
          >
            Web Speech: {{ supportsInfo.webSpeech ? "✓" : "✗ (optional)" }}
          </div>
        </div>
      </div>

      <!-- Run tests button -->
      <button
        class="w-full px-3 py-2 bg-indigo-600 text-white rounded-lg font-medium text-sm hover:bg-indigo-700 disabled:opacity-50"
        :disabled="isRunningTests"
        @click="runDiagnostics"
      >
        {{ isRunningTests ? "Running Tests..." : "Run Full Diagnostics" }}
      </button>

      <!-- Test results -->
      <div v-if="testResults.length > 0" class="space-y-1">
        <div class="font-bold text-stone-600 dark:text-stone-300 mb-1">
          Test Results
        </div>
        <div
          v-for="(result, i) in testResults"
          :key="i"
          class="flex items-start gap-2"
          :class="{
            'text-green-600 dark:text-green-400': result.status === 'pass',
            'text-red-600 dark:text-red-400': result.status === 'fail',
            'text-amber-600 dark:text-amber-400': result.status === 'warn',
            'text-stone-500 dark:text-stone-400': result.status === 'info',
          }"
        >
          <span class="flex-shrink-0">
            {{
              result.status === "pass"
                ? "✓"
                : result.status === "fail"
                  ? "✗"
                  : result.status === "warn"
                    ? "⚠"
                    : "ℹ"
            }}
          </span>
          <span class="flex-1">
            <span class="font-medium">{{ result.test }}:</span>
            {{ result.result }}
          </span>
        </div>
      </div>

      <!-- Copy button -->
      <button
        v-if="testResults.length > 0"
        class="w-full px-3 py-1.5 bg-stone-200 dark:bg-stone-700 text-stone-600 dark:text-stone-300 rounded text-sm hover:bg-stone-300 dark:hover:bg-stone-600"
        @click="copyDiagnostics"
      >
        📋 Copy to Clipboard
      </button>
    </div>
  </div>
</template>
