import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";

vi.mock("node:fs");

describe("logger (server-side)", () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let createLogger: typeof import("./logger").createLogger;

  beforeEach(async () => {
    // Reset module cache to get fresh logger instance with mocks
    vi.resetModules();

    // Set up mocks BEFORE importing the logger module
    vi.mocked(fs.mkdirSync).mockImplementation(() => undefined);
    vi.mocked(fs.appendFileSync).mockImplementation(() => {});
    vi.mocked(fs.statSync).mockReturnValue({
      size: 1024,
      isFile: () => true,
    } as unknown as fs.Stats);

    consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    // Now import the logger module
    const loggerModule = await import("./logger");
    createLogger = loggerModule.createLogger;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("createLogger", () => {
    it("should create logger with custom prefix", () => {
      const logger = createLogger("test-module");
      logger.info("test message");

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('"prefix":"tada:test-module"'),
      );
    });

    it("should create logger with tada prefix", () => {
      const logger = createLogger("test");
      logger.info("test message");

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('"prefix":"tada:test"'),
      );
    });
  });

  describe("log levels", () => {
    it("should log debug messages", () => {
      const logger = createLogger("test");
      logger.debug("debug message", { foo: "bar" });

      expect(consoleLogSpy).toHaveBeenCalled();
      const logLine = consoleLogSpy.mock.calls[0]?.[0] as string;
      const logObj = JSON.parse(logLine);

      expect(logObj.level).toBe("debug");
      expect(logObj.message).toBe("debug message");
      expect(logObj.foo).toBe("bar");
    });

    it("should log info messages", () => {
      const logger = createLogger("test");
      logger.info("info message", { data: 123 });

      const logLine = consoleLogSpy.mock.calls[0]?.[0] as string;
      const logObj = JSON.parse(logLine);

      expect(logObj.level).toBe("info");
      expect(logObj.message).toBe("info message");
      expect(logObj.data).toBe(123);
    });

    it("should log warn messages", () => {
      const logger = createLogger("test");
      logger.warn("warning message");

      const logLine = consoleErrorSpy.mock.calls[0]?.[0] as string;
      const logObj = JSON.parse(logLine);

      expect(logObj.level).toBe("warn");
      expect(logObj.message).toBe("warning message");
    });

    it("should log error messages", () => {
      const logger = createLogger("test");
      const error = new Error("test error");
      logger.error("error message", error);

      const logLine = consoleErrorSpy.mock.calls[0]?.[0] as string;
      const logObj = JSON.parse(logLine);

      expect(logObj.level).toBe("error");
      expect(logObj.message).toBe("error message");
      expect(logObj.error).toContain("test error");
    });
  });

  describe("log format", () => {
    it("should output valid JSON", () => {
      const logger = createLogger("test");
      logger.info("test");

      const logLine = consoleLogSpy.mock.calls[0]?.[0] as string;
      expect(() => JSON.parse(logLine)).not.toThrow();
    });

    it("should include timestamp", () => {
      const logger = createLogger("test");
      logger.info("test");

      const logLine = consoleLogSpy.mock.calls[0]?.[0] as string;
      const logObj = JSON.parse(logLine);

      expect(logObj.timestamp).toBeTruthy();
      expect(new Date(logObj.timestamp).toISOString()).toBe(logObj.timestamp);
    });

    it("should include context", () => {
      const logger = createLogger("test");
      logger.info("test", { userId: "123", action: "create" });

      const logLine = consoleLogSpy.mock.calls[0]?.[0] as string;
      const logObj = JSON.parse(logLine);

      expect(logObj.userId).toBe("123");
      expect(logObj.action).toBe("create");
    });

    it("should handle Error objects in context", () => {
      const logger = createLogger("test");
      const error = new Error("test error");
      logger.error("failed", error);

      const logLine = consoleErrorSpy.mock.calls[0]?.[0] as string;
      const logObj = JSON.parse(logLine);

      expect(logObj.error).toBe("test error");
      expect(logObj.stack).toBeDefined();
      expect(logObj.name).toBe("Error");
    });

    it("should handle unknown error types", () => {
      const logger = createLogger("test");
      logger.error("failed", { message: "custom error" });

      const logLine = consoleErrorSpy.mock.calls[0]?.[0] as string;
      const logObj = JSON.parse(logLine);

      expect(logObj.error).toBe("[object Object]");
    });
  });

  describe("file logging", () => {
    it("should create log directory", () => {
      createLogger("test");

      expect(fs.mkdirSync).toHaveBeenCalledWith(
        expect.stringContaining("data/logs"),
        { recursive: true },
      );
    });

    it("should write logs to file", () => {
      const logger = createLogger("test");
      logger.info("test message");

      expect(fs.appendFileSync).toHaveBeenCalledWith(
        expect.stringContaining("combined.log"),
        expect.stringContaining("test message"),
        "utf8",
      );
    });

    it("should handle file write errors gracefully", () => {
      vi.mocked(fs.appendFileSync).mockImplementation(() => {
        throw new Error("Write failed");
      });

      const logger = createLogger("test");
      expect(() => logger.info("test")).not.toThrow();
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });
});
