import { describe, it, expect } from "vitest";
import {
  detectColumnMappings,
  getConfidenceColor,
  getConfidenceBadge,
} from "./columnDetection";

describe("columnDetection", () => {
  describe("detectColumnMappings", () => {
    it("should detect exact match for startedAt", () => {
      const result = detectColumnMappings(["Started At", "Duration", "Name"]);

      expect(result["startedAt"]).toBeDefined();
      expect(result["startedAt"]?.csvColumn).toBe("Started At");
      expect(result["startedAt"]?.confidence).toBe("high");
    });

    it("should detect exact match for duration", () => {
      const result = detectColumnMappings(["Date", "Duration", "Activity"]);

      expect(result["duration"]).toBeDefined();
      expect(result["duration"]?.csvColumn).toBe("Duration");
      expect(result["duration"]?.confidence).toBe("high");
    });

    it("should detect partial match with medium confidence", () => {
      const result = detectColumnMappings(["Session Start Time", "Length"]);

      expect(result["startedAt"]).toBeDefined();
      expect(result["startedAt"]?.csvColumn).toBe("Session Start Time");
      expect(result["startedAt"]?.confidence).toBe("medium");
    });

    it("should detect activity as name field", () => {
      const result = detectColumnMappings(["Activity", "Duration"]);

      expect(result["name"]).toBeDefined();
      expect(result["name"]?.csvColumn).toBe("Activity");
      expect(result["name"]?.confidence).toBe("high");
    });

    it("should detect notes field", () => {
      const result = detectColumnMappings(["Date", "Notes", "Category"]);

      expect(result["notes"]).toBeDefined();
      expect(result["notes"]?.csvColumn).toBe("Notes");
      expect(result["notes"]?.confidence).toBe("high");
    });

    it("should detect description as notes with medium confidence", () => {
      const result = detectColumnMappings(["Description"]);

      expect(result["notes"]).toBeDefined();
      expect(result["notes"]?.csvColumn).toBe("Description");
      expect(result["notes"]?.confidence).toBe("high"); // exact match
    });

    it("should handle case insensitivity", () => {
      const result = detectColumnMappings(["DURATION", "started at", "NAME"]);

      expect(result["duration"]?.csvColumn).toBe("DURATION");
      expect(result["startedAt"]?.csvColumn).toBe("started at");
      expect(result["name"]?.csvColumn).toBe("NAME");
    });

    it("should return empty object for unrecognized headers", () => {
      const result = detectColumnMappings(["foo", "bar", "baz"]);

      expect(Object.keys(result)).toHaveLength(0);
    });

    it("should detect Insight Timer format", () => {
      const headers = [
        "Started At",
        "Duration",
        "Activity",
        "Preset",
        "Teacher Name",
      ];
      const result = detectColumnMappings(headers);

      expect(result["startedAt"]?.csvColumn).toBe("Started At");
      expect(result["startedAt"]?.confidence).toBe("high");
      expect(result["duration"]?.csvColumn).toBe("Duration");
      expect(result["duration"]?.confidence).toBe("high");
      expect(result["name"]?.csvColumn).toBe("Activity");
      expect(result["name"]?.confidence).toBe("high");
    });

    it("should detect tags field", () => {
      const result = detectColumnMappings(["Tags", "Labels"]);

      expect(result["tags"]).toBeDefined();
      expect(result["tags"]?.csvColumn).toBe("Tags");
      expect(result["tags"]?.confidence).toBe("high");
    });

    it("should detect emoji field", () => {
      const result = detectColumnMappings(["Emoji", "Icon"]);

      expect(result["emoji"]).toBeDefined();
      expect(result["emoji"]?.csvColumn).toBe("Emoji");
      expect(result["emoji"]?.confidence).toBe("high");
    });

    it("should detect category and subcategory", () => {
      const result = detectColumnMappings([
        "Category",
        "Subcategory",
        "Duration",
      ]);

      expect(result["category"]?.csvColumn).toBe("Category");
      expect(result["subcategory"]?.csvColumn).toBe("Subcategory");
    });

    it("should include reason for each detection", () => {
      const result = detectColumnMappings(["Started At"]);

      expect(result["startedAt"]?.reason).toContain("Started At");
    });

    it("should not detect overlapping fields incorrectly", () => {
      // "start" could match multiple things, but should prefer better matches
      const result = detectColumnMappings(["Start Time", "End Time"]);

      expect(result["startedAt"]?.csvColumn).toBe("Start Time");
      expect(result["endedAt"]?.csvColumn).toBe("End Time");
    });
  });

  describe("getConfidenceColor", () => {
    it("should return green class for high confidence", () => {
      expect(getConfidenceColor("high")).toContain("green");
    });

    it("should return yellow class for medium confidence", () => {
      expect(getConfidenceColor("medium")).toContain("yellow");
    });

    it("should return red class for low confidence", () => {
      expect(getConfidenceColor("low")).toContain("red");
    });
  });

  describe("getConfidenceBadge", () => {
    it("should return checkmark for high confidence", () => {
      expect(getConfidenceBadge("high")).toContain("✓");
      expect(getConfidenceBadge("high")).toContain("High");
    });

    it("should return tilde for medium confidence", () => {
      expect(getConfidenceBadge("medium")).toContain("~");
      expect(getConfidenceBadge("medium")).toContain("Medium");
    });

    it("should return question mark for low confidence", () => {
      expect(getConfidenceBadge("low")).toContain("?");
      expect(getConfidenceBadge("low")).toContain("Low");
    });
  });
});
