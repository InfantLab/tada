/**
 * Voice Capture Composable
 * Wraps MediaRecorder API for audio recording with level visualization
 * @module composables/useVoiceCapture
 */

import type { VoiceRecordingState, VoiceRecordingStatus } from "~/types/voice";

/** Maximum recording duration in milliseconds (5 minutes) */
const MAX_RECORDING_DURATION = 5 * 60 * 1000;

export function useVoiceCapture() {
  // State
  const status = ref<VoiceRecordingStatus>("idle");
  const audioBlob = ref<Blob | null>(null);
  const audioLevel = ref(0);
  const duration = ref(0);
  const error = ref<string | null>(null);
  const permissionStatus = ref<PermissionState | null>(null);

  // Internal refs
  let mediaRecorder: MediaRecorder | null = null;
  let audioContext: AudioContext | null = null;
  let analyser: AnalyserNode | null = null;
  let stream: MediaStream | null = null;
  let chunks: Blob[] = [];
  let levelAnimationFrame: number | null = null;
  let durationInterval: ReturnType<typeof setInterval> | null = null;
  let maxDurationTimeout: ReturnType<typeof setTimeout> | null = null;

  /**
   * Check and request microphone permission
   */
  async function requestPermission(): Promise<boolean> {
    try {
      // Check current permission status if available
      if ("permissions" in navigator) {
        const permissionResult = await navigator.permissions.query({
          name: "microphone" as PermissionName,
        });
        permissionStatus.value = permissionResult.state;

        if (permissionResult.state === "denied") {
          error.value =
            "Microphone permission denied. Please enable it in your browser settings.";
          return false;
        }
      }

      // Request access to trigger permission prompt if needed
      const testStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      testStream.getTracks().forEach((track) => track.stop());
      permissionStatus.value = "granted";
      return true;
    } catch (err) {
      const e = err as Error;
      if (e.name === "NotAllowedError") {
        error.value =
          "Microphone permission denied. Please enable it in your browser settings.";
        permissionStatus.value = "denied";
      } else if (e.name === "NotFoundError") {
        error.value =
          "No microphone found. Please connect a microphone and try again.";
      } else {
        error.value = `Microphone error: ${e.message}`;
      }
      return false;
    }
  }

  /**
   * Get preferred MIME type based on browser support
   */
  function getPreferredMimeType(): string {
    const types = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/mp4",
      "audio/ogg;codecs=opus",
    ];

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }

    // Fallback - let browser decide
    return "";
  }

  /**
   * Update audio level from analyser node
   */
  function updateAudioLevel() {
    if (!analyser) return;

    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(dataArray);

    // Calculate RMS (root mean square) for more accurate level
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      const value = dataArray[i] ?? 0;
      sum += value * value;
    }
    const rms = Math.sqrt(sum / dataArray.length);

    // Normalize to 0-1 range
    audioLevel.value = Math.min(rms / 128, 1);

    if (status.value === "recording") {
      levelAnimationFrame = requestAnimationFrame(updateAudioLevel);
    }
  }

  /**
   * Start recording audio
   */
  async function startRecording(): Promise<boolean> {
    // Reset state
    error.value = null;
    audioBlob.value = null;
    chunks = [];
    duration.value = 0;

    try {
      // Get microphone stream
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // Setup audio context for level visualization
      audioContext = new AudioContext();
      analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      // Create MediaRecorder
      const mimeType = getPreferredMimeType();
      mediaRecorder = new MediaRecorder(stream, {
        mimeType: mimeType || undefined,
      });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const mimeType = mediaRecorder?.mimeType || "audio/webm";
        audioBlob.value = new Blob(chunks, { type: mimeType });
        cleanup();
      };

      mediaRecorder.onerror = (event) => {
        error.value = `Recording error: ${(event as ErrorEvent).message || "Unknown error"}`;
        status.value = "error";
        cleanup();
      };

      // Start recording
      mediaRecorder.start(100); // Collect data every 100ms
      status.value = "recording";
      permissionStatus.value = "granted";

      // Start audio level updates
      updateAudioLevel();

      // Start duration tracking
      const startTime = Date.now();
      durationInterval = setInterval(() => {
        duration.value = Date.now() - startTime;
      }, 100);

      // Set max duration timeout
      maxDurationTimeout = setTimeout(() => {
        if (status.value === "recording") {
          stopRecording();
        }
      }, MAX_RECORDING_DURATION);

      return true;
    } catch (err) {
      const e = err as Error;
      if (e.name === "NotAllowedError") {
        error.value = "Microphone permission denied";
        permissionStatus.value = "denied";
      } else {
        error.value = `Failed to start recording: ${e.message}`;
      }
      status.value = "error";
      return false;
    }
  }

  /**
   * Stop recording and get audio blob
   */
  function stopRecording(): void {
    if (mediaRecorder && mediaRecorder.state === "recording") {
      mediaRecorder.stop();
      status.value = "processing";
    }
  }

  /**
   * Cancel recording without saving
   */
  function cancelRecording(): void {
    cleanup();
    audioBlob.value = null;
    status.value = "idle";
    error.value = null;
  }

  /**
   * Reset to idle state
   */
  function reset(): void {
    cleanup();
    audioBlob.value = null;
    status.value = "idle";
    error.value = null;
    duration.value = 0;
    audioLevel.value = 0;
  }

  /**
   * Cleanup resources
   */
  function cleanup(): void {
    // Stop animation frame
    if (levelAnimationFrame) {
      cancelAnimationFrame(levelAnimationFrame);
      levelAnimationFrame = null;
    }

    // Clear intervals/timeouts
    if (durationInterval) {
      clearInterval(durationInterval);
      durationInterval = null;
    }
    if (maxDurationTimeout) {
      clearTimeout(maxDurationTimeout);
      maxDurationTimeout = null;
    }

    // Stop media stream tracks
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      stream = null;
    }

    // Close audio context
    if (audioContext && audioContext.state !== "closed") {
      audioContext.close();
      audioContext = null;
    }

    analyser = null;
    mediaRecorder = null;
    audioLevel.value = 0;
  }

  // Cleanup on unmount
  onUnmounted(() => {
    cleanup();
  });

  // Computed state
  const state = computed<VoiceRecordingState>(() => ({
    status: status.value,
    audioBlob: audioBlob.value,
    audioLevel: audioLevel.value,
    duration: duration.value,
    error: error.value,
  }));

  const isRecording = computed(() => status.value === "recording");
  const hasRecording = computed(() => audioBlob.value !== null);
  const formattedDuration = computed(() => {
    const seconds = Math.floor(duration.value / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
  });

  return {
    // State
    status: readonly(status),
    audioBlob: readonly(audioBlob),
    audioLevel: readonly(audioLevel),
    duration: readonly(duration),
    error: readonly(error),
    permissionStatus: readonly(permissionStatus),
    state,

    // Computed
    isRecording,
    hasRecording,
    formattedDuration,

    // Actions
    requestPermission,
    startRecording,
    stopRecording,
    cancelRecording,
    reset,
  };
}
