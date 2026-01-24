/**
 * Type declarations for @xenova/transformers
 * Provides Whisper speech-to-text capabilities via ONNX in the browser
 */

declare module "@xenova/transformers" {
  interface ProgressCallback {
    status: string;
    loaded?: number;
    total?: number;
    file?: string;
    name?: string;
  }

  interface PipelineOptions {
    progress_callback?: (progress: ProgressCallback) => void;
    quantized?: boolean;
    revision?: string;
  }

  interface TranscriptionOptions {
    language?: string;
    task?: "transcribe" | "translate";
    return_timestamps?: boolean;
    chunk_length_s?: number;
    stride_length_s?: number;
  }

  interface TranscriptionResult {
    text: string;
    chunks?: Array<{
      text: string;
      timestamp: [number, number];
    }>;
  }

  export type Pipeline = (
    audio: Float32Array | string,
    options?: TranscriptionOptions,
  ) => Promise<TranscriptionResult>;

  export function pipeline(
    task: "automatic-speech-recognition" | "text-generation" | string,
    model: string,
    options?: PipelineOptions,
  ): Promise<Pipeline>;
}
