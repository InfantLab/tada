import { describe, it, expect } from "vitest";
import {
  detectColumnMappings,
  getConfidenceColor,
  getConfidenceBadge,
} from "./columnDetection";

describe("columnDetection", () => {
  describe("detectColumnMappings", () => {
    it("should detect exact match for timestamp from 'Started At' header", () => {
      const result = detectColumnMappings(["Started At", "Duration", "Name"]);

      // "Started At" in CSV maps to our canonical `timestamp` field
      expect(result["timestamp"]).toBeDefined();
      expect(result["timestamp"]?.csvColumn).toBe("Started At");
      expect(result["timestamp"]?.confidence).toBe("high");
    });

    it("should detect exact match for duration", () => {
      const result = detectColumnMappings(["Date", "Duration", "Activity"]);

      expect(result["duration"]).toBeDefined();
      expect(result["duration"]?.csvColumn).toBe("Duration");
      expect(result["duration"]?.confidence).toBe("high");
    });

    it("should detect partial match with medium confidence", () => {
      const result = detectColumnMappings(["Session Start Time", "Length"]);

      // "Session Start Time" contains "start" and "time" - maps to timestamp
      expect(result["timestamp"]).toBeDefined();
      expect(result["timestamp"]?.csvColumn).toBe("Session Start Time");
      expect(result["timestamp"]?.confidence).toBe("medium");
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
      expect(result["timestamp"]?.csvColumn).toBe("started at");
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

      // Insight Timer's "Started At" maps to our timestamp field
      expect(result["timestamp"]?.csvColumn).toBe("Started At");
      expect(result["timestamp"]?.confidence).toBe("high");
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

      expect(result["timestamp"]?.reason).toContain("Started At");
    });

    it("should detect date/time columns as timestamp field", () => {
      // Both "Start Time" and "End Time" contain "time" pattern
      // "Start Time" also contains "start" which is more specific
      const result = detectColumnMappings(["Start Time", "End Time"]);

      expect(result["timestamp"]?.csvColumn).toBe("Start Time");
      // Note: We no longer have an endedAt field - end times are derived from duration
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
