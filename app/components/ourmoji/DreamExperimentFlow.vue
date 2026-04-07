<script setup lang="ts">
/**
 * DreamExperimentFlow (US3, T068)
 *
 * Wraps the morning ritual: banner → dream capture → guess → reveal.
 * Resumes from the server's submissionState so a refresh after the
 * dream is locked drops the user straight into the guess step.
 *
 * Note: requires `experimentId` to be passed in. The parent (typically
 * /pages/index.vue or a future morning banner) is responsible for
 * detecting the active run and mounting this component.
 */

import DreamCapturePanel from "./DreamCapturePanel.vue";
import SacredSetPicker from "./SacredSetPicker.vue";
import DreamRevealPanel from "./DreamRevealPanel.vue";

interface Props {
  experimentId: string;
}

const props = defineProps<Props>();

type Step = "loading" | "no-prompt" | "dream" | "guess" | "reveal" | "done";

interface MorningPrompt {
  assignmentId: string;
  experimentRunId: string;
  nightDate: string;
  state: "none" | "dream_locked" | "complete";
  hasDream: boolean;
  hasGuess: boolean;
}

interface RevealPayload {
  submission: { id: string };
  isHit: boolean | null;
  targetEmoji: string | null;
  condition: "send" | "control" | "rest";
}

const step = ref<Step>("loading");
const prompt = ref<MorningPrompt | null>(null);
const submitting = ref(false);
const error = ref<string | null>(null);

const guess = ref<{ emoji: string; confidence: number } | null>(null);
const reveal = ref<RevealPayload | null>(null);

async function loadPrompt() {
  step.value = "loading";
  error.value = null;
  try {
    const res = await $fetch<{ prompt: MorningPrompt | null }>(
      `/api/ourmoji/experiments/${props.experimentId}/morning-prompt`,
    );
    prompt.value = res.prompt;
    if (!res.prompt) {
      step.value = "no-prompt";
      return;
    }
    if (res.prompt.state === "dream_locked") step.value = "guess";
    else step.value = "dream";
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : "Failed to load prompt";
    step.value = "no-prompt";
  }
}

async function handleDreamSubmit(text: string, capturedVia: "voice" | "text") {
  if (!prompt.value || submitting.value) return;
  submitting.value = true;
  error.value = null;
  try {
    await $fetch(`/api/ourmoji/submissions/${prompt.value.assignmentId}/dream`, {
      method: "POST",
      body: { dreamText: text, capturedVia },
    });
    step.value = "guess";
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : "Failed to submit dream";
  } finally {
    submitting.value = false;
  }
}

async function handleGuessSubmit(value: { emoji: string; confidence: number }) {
  if (!prompt.value || submitting.value) return;
  submitting.value = true;
  error.value = null;
  guess.value = value;
  try {
    const res = await $fetch<RevealPayload>(
      `/api/ourmoji/submissions/${prompt.value.assignmentId}/guess`,
      {
        method: "POST",
        body: {
          guessEmoji: value.emoji,
          guessConfidence: value.confidence,
        },
      },
    );
    reveal.value = res;
    step.value = "reveal";
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : "Failed to submit guess";
  } finally {
    submitting.value = false;
  }
}

function handleRevealDone() {
  step.value = "done";
}

onMounted(() => {
  void loadPrompt();
});
</script>

<template>
  <div class="space-y-6">
    <div v-if="error" class="rounded-md bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-700 dark:text-red-300">
      {{ error }}
    </div>

    <div v-if="step === 'loading'" class="text-sm text-gray-500">Loading…</div>

    <div
      v-else-if="step === 'no-prompt'"
      class="rounded-xl border border-gray-200 dark:border-gray-800 p-6 text-center text-sm text-gray-500"
    >
      Nothing to do for this experiment right now.
    </div>

    <DreamCapturePanel
      v-else-if="step === 'dream'"
      :disabled="submitting"
      @submit="handleDreamSubmit"
    />

    <SacredSetPicker
      v-else-if="step === 'guess'"
      :disabled="submitting"
      @submit="handleGuessSubmit"
    />

    <DreamRevealPanel
      v-else-if="step === 'reveal' && reveal && guess"
      :reveal="reveal"
      :guess-emoji="guess.emoji"
      @done="handleRevealDone"
    />

    <div
      v-else-if="step === 'done'"
      class="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 p-6 text-center text-sm text-emerald-700 dark:text-emerald-300"
    >
      All set for tonight. ✨
    </div>
  </div>
</template>
