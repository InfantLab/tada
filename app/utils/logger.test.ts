import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createLogger } from "./logger";

describe("logger (client-side)", () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleInfoSpy: ReturnType<typeof vi.spyOn>;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    consoleInfoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should create logger with custom prefix", () => {
    const logger = createLogger("test-module");
    logger.info("test message");

    expect(consoleInfoSpy).toHaveBeenCalledWith(
      expect.stringContaining("[tada:test-module]")
    );
  });

  it("should create logger with default prefix", () => {
    const logger = createLogger("test");
    logger.info("test message");

    expect(consoleInfoSpy).toHaveBeenCalledWith(
      expect.stringContaining("[tada:test]")
    );
  });

  it("should log debug messages", () => {
    const logger = createLogger("test");
    logger.debug("debug message", { foo: "bar" });

    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining("🔍"), {
      foo: "bar",
    });
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining("debug message"),
      expect.anything()
    );
  });

  it("should log info messages", () => {
    const logger = createLogger("test");
    logger.info("info message");

    expect(consoleInfoSpy).toHaveBeenCalledWith(expect.stringContaining("ℹ️"));
    expect(consoleInfoSpy).toHaveBeenCalledWith(
      expect.stringContaining("info message")
    );
  });

  it("should log warn messages", () => {
    const logger = createLogger("test");
    logger.warn("warning message");

    expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining("⚠️"));
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining("warning message")
    );
  });

  it("should log error messages with Error object", () => {
    const logger = createLogger("test");
    const error = new Error("test error");
    logger.error("error message", error, { context: "value" });

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining("❌"),
      error,
      { context: "value" }
    );
  });

  it("should log error messages with unknown error", () => {
    const logger = createLogger("test");
    logger.error("error message", "unknown error");

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining("❌"),
      "unknown error",
      undefined
    );
  });

  it("should include timestamp in log message", () => {
    const logger = createLogger("test");
    logger.info("test");

    expect(consoleInfoSpy).toHaveBeenCalledWith(
      expect.stringMatching(/\d{2}:\d{2}:\d{2}/)
    );
  });

  it("should handle messages with special characters", () => {
    const logger = createLogger("test");
    logger.info("message with 'quotes' and \"double quotes\"");

    expect(consoleInfoSpy).toHaveBeenCalledWith(
      expect.stringContaining("message with 'quotes' and \"double quotes\"")
    );
  });

  it("should handle multiple arguments in debug", () => {
    const logger = createLogger("test");
    logger.debug("message", { a: 1 }, { b: 2 }, "extra");

    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining("message"),
      { a: 1 },
      { b: 2 },
      "extra"
    );
  });
});
