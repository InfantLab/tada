import { describe, expect, it } from "vitest";
import { isNetworkError } from "~/utils/networkError";

describe("isNetworkError", () => {
  it("treats a plain Error with no .response as a network error", () => {
    expect(isNetworkError(new Error("Failed to fetch"))).toBe(true);
  });

  it("treats an error with a .response of null/undefined as a network error", () => {
    const err = new Error("offline") as Error & { response?: unknown };
    err.response = undefined;
    expect(isNetworkError(err)).toBe(true);
  });

  it("does not treat an error with a real .response as a network error", () => {
    const err = new Error("Not Found") as Error & { response?: unknown };
    err.response = { status: 404 };
    expect(isNetworkError(err)).toBe(false);
  });

  it("returns false for non-Error values", () => {
    expect(isNetworkError("offline")).toBe(false);
    expect(isNetworkError(null)).toBe(false);
    expect(isNetworkError(undefined)).toBe(false);
  });
});
