/**
 * Unit tests for participant helpers.
 */

import { describe, expect, it } from "vitest";
import { anonymousLabelForIndex } from "./participants";

describe("anonymousLabelForIndex", () => {
  it("maps 0..25 to participantA..participantZ", () => {
    expect(anonymousLabelForIndex(0)).toBe("participantA");
    expect(anonymousLabelForIndex(1)).toBe("participantB");
    expect(anonymousLabelForIndex(25)).toBe("participantZ");
  });

  it("rolls over to participantAA at index 26", () => {
    expect(anonymousLabelForIndex(26)).toBe("participantAA");
    expect(anonymousLabelForIndex(27)).toBe("participantAB");
    expect(anonymousLabelForIndex(51)).toBe("participantAZ");
    expect(anonymousLabelForIndex(52)).toBe("participantBA");
  });

  it("produces unique labels across the first 200 indices", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 200; i++) {
      seen.add(anonymousLabelForIndex(i));
    }
    expect(seen.size).toBe(200);
  });
});
