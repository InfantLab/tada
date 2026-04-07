/**
 * Unit tests for useDreamExperimentFlow.
 *
 * Covers T051 (voice integration path — composable wiring) and T052
 * (transcription failure fallback) at the state-machine level. The
 * Vue render-level component tests for DreamCapturePanel.vue are
 * deferred to e2e (Playwright) since they require the full Nuxt
 * runtime to resolve `<VoiceRecorder>`.
 */

import { describe, expect, it } from "vitest";
import { useDreamExperimentFlow } from "./useDreamExperimentFlow";
import { MAX_TEXT_LENGTH } from "~/utils/ourmoji/constants";

describe("useDreamExperimentFlow", () => {
  it("starts empty in text mode and cannot submit", () => {
    const flow = useDreamExperimentFlow();
    expect(flow.dreamText.value).toBe("");
    expect(flow.captureMode.value).toBe("text");
    expect(flow.canSubmit.value).toBe(false);
  });

  it("setVoiceTranscription populates text and switches to voice mode", () => {
    const flow = useDreamExperimentFlow();
    flow.setVoiceTranscription("I was flying over a sea of mirrors.");
    expect(flow.dreamText.value).toBe("I was flying over a sea of mirrors.");
    expect(flow.captureMode.value).toBe("voice");
    expect(flow.canSubmit.value).toBe(true);
    expect(flow.transcriptionError.value).toBeNull();
  });

  it("setManualText switches mode back to text", () => {
    const flow = useDreamExperimentFlow();
    flow.setVoiceTranscription("voice text");
    flow.setManualText("typed text");
    expect(flow.dreamText.value).toBe("typed text");
    expect(flow.captureMode.value).toBe("text");
  });

  it("fallbackToText preserves existing text and surfaces the error", () => {
    const flow = useDreamExperimentFlow();
    flow.setManualText("partial dream so far");
    flow.fallbackToText("microphone permission denied");
    expect(flow.dreamText.value).toBe("partial dream so far");
    expect(flow.captureMode.value).toBe("text");
    expect(flow.transcriptionError.value).toBe("microphone permission denied");
  });

  it("nearLimit flips at 90% and overLimit at 100%", () => {
    const flow = useDreamExperimentFlow();
    flow.setManualText("a".repeat(Math.floor(MAX_TEXT_LENGTH * 0.9)));
    expect(flow.nearLimit.value).toBe(true);
    expect(flow.overLimit.value).toBe(false);
    expect(flow.canSubmit.value).toBe(true);

    flow.setManualText("a".repeat(MAX_TEXT_LENGTH + 1));
    expect(flow.overLimit.value).toBe(true);
    expect(flow.canSubmit.value).toBe(false);
  });

  it("reset clears state back to defaults", () => {
    const flow = useDreamExperimentFlow();
    flow.setVoiceTranscription("dream");
    flow.fallbackToText("err");
    flow.reset();
    expect(flow.dreamText.value).toBe("");
    expect(flow.captureMode.value).toBe("text");
    expect(flow.transcriptionError.value).toBeNull();
  });
});
