import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { useErrorTracker } from "./useErrorTracker";

describe("useErrorTracker", () => {
  // Store original clipboard
  const _originalClipboard = navigator.clipboard;

  beforeEach(() => {
    // Clear errors between tests
    const tracker = useErrorTracker();
    tracker.clearErrors();

    // Mock clipboard using vi.stubGlobal
    vi.stubGlobal("navigator", {
      ...navigator,
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("addError", () => {
    it("should add an error with default type", () => {
      const tracker = useErrorTracker();

      tracker.addError("Something went wrong");

      expect(tracker.errors.value).toHaveLength(1);
      expect(tracker.errors.value[0]?.type).toBe("error");
      expect(tracker.errors.value[0]?.message).toBe("Something went wrong");
    });

    it("should add a warning", () => {
      const tracker = useErrorTracker();

      tracker.addError("This is a warning", { type: "warning" });

      expect(tracker.errors.value[0]?.type).toBe("warning");
    });

    it("should add info", () => {
      const tracker = useErrorTracker();

      tracker.addError("This is info", { type: "info" });

      expect(tracker.errors.value[0]?.type).toBe("info");
    });

    it("should include optional details", () => {
      const tracker = useErrorTracker();

      tracker.addError("Error", { details: "More details here" });

      expect(tracker.errors.value[0]?.details).toBe("More details here");
    });

    it("should include source", () => {
      const tracker = useErrorTracker();

      tracker.addError("Error", { source: "api/entries" });

      expect(tracker.errors.value[0]?.source).toBe("api/entries");
    });

    it("should include stack trace", () => {
      const tracker = useErrorTracker();

      tracker.addError("Error", { stack: "Error\n  at foo()" });

      expect(tracker.errors.value[0]?.stack).toBe("Error\n  at foo()");
    });

    it("should add timestamp", () => {
      const tracker = useErrorTracker();
      const before = new Date();

      tracker.addError("Error");

      const timestamp = tracker.errors.value[0]?.timestamp;
      expect(timestamp).toBeInstanceOf(Date);
      expect(timestamp!.getTime()).toBeGreaterThanOrEqual(before.getTime());
    });

    it("should add unique id", () => {
      const tracker = useErrorTracker();

      tracker.addError("Error 1");
      tracker.addError("Error 2");

      const id1 = tracker.errors.value[0]?.id;
      const id2 = tracker.errors.value[1]?.id;
      expect(id1).not.toBe(id2);
    });

    it("should add new errors at the beginning (newest first)", () => {
      const tracker = useErrorTracker();

      tracker.addError("First");
      tracker.addError("Second");

      expect(tracker.errors.value[0]?.message).toBe("Second");
      expect(tracker.errors.value[1]?.message).toBe("First");
    });

    it("should limit to 50 errors", () => {
      const tracker = useErrorTracker();

      // Add 55 errors
      for (let i = 0; i < 55; i++) {
        tracker.addError(`Error ${i}`);
      }

      expect(tracker.errors.value).toHaveLength(50);
    });

    it("should auto-expand on first error", () => {
      const tracker = useErrorTracker();

      expect(tracker.isExpanded.value).toBe(false);
      tracker.addError("Error");
      expect(tracker.isExpanded.value).toBe(true);
    });
  });

  describe("removeError", () => {
    it("should remove error by id", () => {
      const tracker = useErrorTracker();
      tracker.addError("To remove");
      tracker.addError("To keep");

      const idToRemove = tracker.errors.value[1]?.id;
      tracker.removeError(idToRemove!);

      expect(tracker.errors.value).toHaveLength(1);
      expect(tracker.errors.value[0]?.message).toBe("To keep");
    });

    it("should do nothing if id not found", () => {
      const tracker = useErrorTracker();
      tracker.addError("Error");

      tracker.removeError("nonexistent-id");

      expect(tracker.errors.value).toHaveLength(1);
    });
  });

  describe("clearErrors", () => {
    it("should clear all errors", () => {
      const tracker = useErrorTracker();
      tracker.addError("Error 1");
      tracker.addError("Error 2");

      tracker.clearErrors();

      expect(tracker.errors.value).toHaveLength(0);
    });

    it("should collapse the panel", () => {
      const tracker = useErrorTracker();
      tracker.addError("Error");
      expect(tracker.isExpanded.value).toBe(true);

      tracker.clearErrors();

      expect(tracker.isExpanded.value).toBe(false);
    });
  });

  describe("clearByType", () => {
    it("should clear only errors", () => {
      const tracker = useErrorTracker();
      tracker.addError("Error", { type: "error" });
      tracker.addError("Warning", { type: "warning" });
      tracker.addError("Info", { type: "info" });

      tracker.clearByType("error");

      expect(tracker.errors.value).toHaveLength(2);
      expect(tracker.errors.value.some((e) => e.type === "error")).toBe(false);
    });

    it("should clear only warnings", () => {
      const tracker = useErrorTracker();
      tracker.addError("Error", { type: "error" });
      tracker.addError("Warning", { type: "warning" });

      tracker.clearByType("warning");

      expect(tracker.errors.value).toHaveLength(1);
      expect(tracker.errors.value[0]?.type).toBe("error");
    });
  });

  describe("copyAllErrors", () => {
    it("should copy all errors to clipboard", async () => {
      const tracker = useErrorTracker();
      tracker.addError("Error 1", { type: "error" });
      tracker.addError("Error 2", { type: "warning" });

      const result = await tracker.copyAllErrors();

      expect(result).toBe(true);
      expect(navigator.clipboard.writeText).toHaveBeenCalledTimes(1);
      const copiedText = vi.mocked(navigator.clipboard.writeText).mock
        .calls[0]?.[0] as string;
      expect(copiedText).toContain("[ERROR]");
      expect(copiedText).toContain("[WARNING]");
      expect(copiedText).toContain("Error 1");
      expect(copiedText).toContain("Error 2");
    });

    it("should return false if clipboard fails", async () => {
      const tracker = useErrorTracker();
      tracker.addError("Error");
      vi.mocked(navigator.clipboard.writeText).mockRejectedValueOnce(
        new Error("Permission denied")
      );

      const result = await tracker.copyAllErrors();

      expect(result).toBe(false);
    });
  });

  describe("copyError", () => {
    it("should copy single error to clipboard", async () => {
      const tracker = useErrorTracker();
      tracker.addError("Specific error", { type: "error" });

      const id = tracker.errors.value[0]?.id;
      const result = await tracker.copyError(id!);

      expect(result).toBe(true);
      expect(navigator.clipboard.writeText).toHaveBeenCalledTimes(1);
      const copiedText = vi.mocked(navigator.clipboard.writeText).mock
        .calls[0]?.[0] as string;
      expect(copiedText).toContain("[ERROR]");
      expect(copiedText).toContain("Specific error");
    });

    it("should return false if id not found", async () => {
      const tracker = useErrorTracker();

      const result = await tracker.copyError("nonexistent");

      expect(result).toBe(false);
    });
  });

  describe("computed counts", () => {
    it("should count errors correctly", () => {
      const tracker = useErrorTracker();
      tracker.addError("Error 1", { type: "error" });
      tracker.addError("Error 2", { type: "error" });
      tracker.addError("Warning", { type: "warning" });

      expect(tracker.errorCount.value).toBe(2);
    });

    it("should count warnings correctly", () => {
      const tracker = useErrorTracker();
      tracker.addError("Error", { type: "error" });
      tracker.addError("Warning 1", { type: "warning" });
      tracker.addError("Warning 2", { type: "warning" });

      expect(tracker.warningCount.value).toBe(2);
    });

    it("should count info correctly", () => {
      const tracker = useErrorTracker();
      tracker.addError("Info 1", { type: "info" });
      tracker.addError("Info 2", { type: "info" });

      expect(tracker.infoCount.value).toBe(2);
    });

    it("should count total correctly", () => {
      const tracker = useErrorTracker();
      tracker.addError("Error", { type: "error" });
      tracker.addError("Warning", { type: "warning" });
      tracker.addError("Info", { type: "info" });

      expect(tracker.totalCount.value).toBe(3);
    });

    it("should update counts when errors change", () => {
      const tracker = useErrorTracker();
      tracker.addError("Error", { type: "error" });
      expect(tracker.errorCount.value).toBe(1);

      tracker.clearErrors();
      expect(tracker.errorCount.value).toBe(0);
      expect(tracker.totalCount.value).toBe(0);
    });
  });
});
