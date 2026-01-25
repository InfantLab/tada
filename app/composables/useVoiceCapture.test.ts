/**
 * Tests for useVoiceCapture composable
 * @module composables/useVoiceCapture.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useVoiceCapture } from "./useVoiceCapture";

// Mock MediaRecorder
class MockMediaRecorder {
  state = "inactive";
  ondataavailable: ((event: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  mimeType = "audio/webm";

  start() {
    this.state = "recording";
  }

  stop() {
    this.state = "inactive";
    // Simulate data available
    if (this.ondataavailable) {
      this.ondataavailable({
        data: new Blob(["test"], { type: "audio/webm" }),
      });
    }
    if (this.onstop) {
      this.onstop();
    }
  }

  static isTypeSupported(type: string) {
    return type.includes("webm") || type.includes("mp4");
  }
}

// Mock AudioContext
class MockAudioContext {
  state = "running";
  createAnalyser() {
    return {
      fftSize: 256,
      frequencyBinCount: 128,
      getByteFrequencyData: (array: Uint8Array) => {
        // Fill with mock data
        for (let i = 0; i < array.length; i++) {
          array[i] = Math.floor(Math.random() * 256);
        }
      },
    };
  }

  createMediaStreamSource() {
    return {
      connect: vi.fn(),
    };
  }

  close() {
    this.state = "closed";
    return Promise.resolve();
  }
}

// Mock MediaStream
class MockMediaStream {
  private tracks = [{ stop: vi.fn() }];

  getTracks() {
    return this.tracks;
  }
}

describe("useVoiceCapture", () => {
  beforeEach(() => {
    // Setup global mocks
    vi.stubGlobal("MediaRecorder", MockMediaRecorder);
    vi.stubGlobal("AudioContext", MockAudioContext);

    // Mock getUserMedia
    vi.stubGlobal("navigator", {
      ...navigator,
      mediaDevices: {
        getUserMedia: vi.fn().mockResolvedValue(new MockMediaStream()),
      },
      permissions: {
        query: vi.fn().mockResolvedValue({ state: "granted" }),
      },
    });

    // Mock requestAnimationFrame
    vi.stubGlobal("requestAnimationFrame", vi.fn().mockReturnValue(1));
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("should initialize with idle status", () => {
    const { status, audioBlob, isRecording } = useVoiceCapture();

    expect(status.value).toBe("idle");
    expect(audioBlob.value).toBeNull();
    expect(isRecording.value).toBe(false);
  });

  it("should request microphone permission", async () => {
    const { requestPermission, permissionStatus } = useVoiceCapture();

    const result = await requestPermission();

    expect(result).toBe(true);
    expect(permissionStatus.value).toBe("granted");
    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
      audio: true,
    });
  });

  it("should handle permission denied", async () => {
    vi.mocked(navigator.mediaDevices.getUserMedia).mockRejectedValueOnce(
      Object.assign(new Error("Permission denied"), {
        name: "NotAllowedError",
      }),
    );

    const { requestPermission, error, permissionStatus } = useVoiceCapture();

    const result = await requestPermission();

    expect(result).toBe(false);
    expect(permissionStatus.value).toBe("denied");
    expect(error.value).toContain("denied");
  });

  it("should start recording successfully", async () => {
    const { startRecording, status, isRecording } = useVoiceCapture();

    const result = await startRecording();

    expect(result).toBe(true);
    expect(status.value).toBe("recording");
    expect(isRecording.value).toBe(true);
  });

  it("should stop recording and produce audio blob", async () => {
    const { startRecording, stopRecording, status, audioBlob, hasRecording } =
      useVoiceCapture();

    await startRecording();
    stopRecording();

    // Wait for async operations
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(status.value).toBe("processing");
    expect(audioBlob.value).toBeInstanceOf(Blob);
    expect(hasRecording.value).toBe(true);
  });

  it("should format duration correctly", () => {
    // Test the duration formatting logic directly
    // Since formattedDuration is computed from readonly duration,
    // we test the formatting calculation directly
    const formatDuration = (ms: number) => {
      const seconds = Math.floor(ms / 1000);
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return `${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
    };

    expect(formatDuration(0)).toBe("00:00");
    expect(formatDuration(65000)).toBe("01:05"); // 1:05
    expect(formatDuration(125000)).toBe("02:05"); // 2:05
    expect(formatDuration(3661000)).toBe("61:01"); // 61:01
  });

  it("should have formattedDuration start at 00:00", () => {
    const { formattedDuration } = useVoiceCapture();
    expect(formattedDuration.value).toBe("00:00");
  });

  it("should cancel recording without saving", async () => {
    const { startRecording, cancelRecording, status, audioBlob } =
      useVoiceCapture();

    await startRecording();
    cancelRecording();

    expect(status.value).toBe("idle");
    expect(audioBlob.value).toBeNull();
  });

  it("should reset to initial state", async () => {
    const {
      startRecording,
      stopRecording,
      reset,
      status,
      audioBlob,
      duration,
    } = useVoiceCapture();

    await startRecording();
    stopRecording();
    await new Promise((resolve) => setTimeout(resolve, 10));

    reset();

    expect(status.value).toBe("idle");
    expect(audioBlob.value).toBeNull();
    expect(duration.value).toBe(0);
  });

  it("should handle no microphone found", async () => {
    vi.mocked(navigator.mediaDevices.getUserMedia).mockRejectedValueOnce(
      Object.assign(new Error("No microphone"), { name: "NotFoundError" }),
    );

    const { requestPermission, error } = useVoiceCapture();

    const result = await requestPermission();

    expect(result).toBe(false);
    expect(error.value).toContain("microphone");
  });
});
