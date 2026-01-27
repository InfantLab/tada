import { describe, it, expect, vi } from "vitest";
import {
  getErrorMessage,
  logError,
  safeExecute,
  getHttpErrorDetails,
  isFetchError,
} from "./errorHandling";

describe("errorHandling", () => {
  describe("getErrorMessage", () => {
    it("extracts message from Error instance", () => {
      const error = new Error("Test error");
      expect(getErrorMessage(error)).toBe("Test error");
    });

    it("handles string errors", () => {
      expect(getErrorMessage("String error")).toBe("String error");
    });

    it("extracts message from object with message property", () => {
      const error = { message: "Object error" };
      expect(getErrorMessage(error)).toBe("Object error");
    });

    it("extracts statusMessage from object", () => {
      const error = { statusMessage: "Status error" };
      expect(getErrorMessage(error)).toBe("Status error");
    });

    it("returns fallback for unknown error types", () => {
      expect(getErrorMessage(null)).toBe("An error occurred");
      expect(getErrorMessage(undefined)).toBe("An error occurred");
      expect(getErrorMessage(123)).toBe("An error occurred");
    });

    it("uses custom fallback message", () => {
      expect(getErrorMessage(null, "Custom fallback")).toBe("Custom fallback");
    });
  });

  describe("logError", () => {
    it("logs error with context", () => {
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      const error = new Error("Test error");

      logError("TestContext", error);

      expect(consoleSpy).toHaveBeenCalledWith(
        "[TestContext]",
        "Test error",
        expect.objectContaining({
          error,
        }),
      );

      consoleSpy.mockRestore();
    });

    it("includes additional info in logs", () => {
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      const error = new Error("Test error");

      logError("TestContext", error, { userId: 1, action: "save" });

      expect(consoleSpy).toHaveBeenCalledWith(
        "[TestContext]",
        "Test error",
        expect.objectContaining({
          error,
          userId: 1,
          action: "save",
        }),
      );

      consoleSpy.mockRestore();
    });
  });

  describe("safeExecute", () => {
    it("returns function result on success", () => {
      const result = safeExecute(() => 42, 0);
      expect(result).toBe(42);
    });

    it("returns fallback on error", () => {
      const result = safeExecute(() => {
        throw new Error("Test error");
      }, 0);
      expect(result).toBe(0);
    });

    it("calls onError callback on error", () => {
      const onError = vi.fn();
      safeExecute(
        () => {
          throw new Error("Test error");
        },
        0,
        onError,
      );
      expect(onError).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe("getHttpErrorDetails", () => {
    it("extracts status code and message from fetch error", () => {
      const error = { statusCode: 404, message: "Not found" };
      const details = getHttpErrorDetails(error);
      expect(details).toEqual({ statusCode: 404, message: "Not found" });
    });

    it("defaults to 500 for unknown errors", () => {
      const details = getHttpErrorDetails(new Error("Unknown"));
      expect(details.statusCode).toBe(500);
    });

    it("handles errors without statusCode", () => {
      const error = { message: "Some error" };
      const details = getHttpErrorDetails(error);
      expect(details).toEqual({ statusCode: 500, message: "Some error" });
    });
  });

  describe("isFetchError", () => {
    it("returns true for fetch error objects", () => {
      const error = { statusCode: 404, message: "Not found" };
      expect(isFetchError(error)).toBe(true);
    });

    it("returns false for Error instances", () => {
      expect(isFetchError(new Error("Test"))).toBe(false);
    });

    it("returns false for null/undefined", () => {
      expect(isFetchError(null)).toBe(false);
      expect(isFetchError(undefined)).toBe(false);
    });

    it("returns false for objects without statusCode", () => {
      expect(isFetchError({ message: "Test" })).toBe(false);
    });
  });
});
