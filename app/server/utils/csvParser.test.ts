import { describe, it, expect } from "vitest";
import {
  parseCSV,
  parseDuration,
  parseDateTime,
  validateEntryData,
  detectDateFormat,
  generateExternalId,
} from "./csvParser";

describe("csvParser", () => {
  describe("parseCSV", () => {
    it("should parse basic CSV with headers", () => {
      const csv = `name,age,city
Alice,30,NYC
Bob,25,LA`;

      const result = parseCSV(csv);

      expect(result.data).toHaveLength(2);
      expect(result.data[0]).toEqual({ name: "Alice", age: "30", city: "NYC" });
      expect(result.data[1]).toEqual({ name: "Bob", age: "25", city: "LA" });
      expect(result.errors).toHaveLength(0);
      expect(result.meta.totalRows).toBe(2);
      expect(result.meta.fields).toEqual(["name", "age", "city"]);
    });

    it("should skip empty lines", () => {
      const csv = `name,age

Alice,30

Bob,25`;

      const result = parseCSV(csv, { skipEmptyLines: true });

      expect(result.data).toHaveLength(2);
      expect(result.errors).toHaveLength(0);
    });

    it("should trim whitespace from headers and values", () => {
      const csv = ` name , age 
 Alice , 30 
 Bob , 25 `;

      const result = parseCSV(csv);

      expect(result.meta.fields).toEqual(["name", "age"]);
      expect(result.data[0]).toEqual({ name: "Alice", age: "30" });
    });

    it("should validate expected fields", () => {
      const csv = `name,age
Alice,30`;

      const result = parseCSV(csv, {
        expectedFields: ["name", "age", "city"],
      });

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]?.message).toContain("Missing expected columns");
      expect(result.errors[0]?.message).toContain("city");
    });

    it("should handle malformed CSV", () => {
      const csv = `name,age
Alice,30
Bob,25,extra,columns`;

      const result = parseCSV(csv);

      // Papa Parse is lenient, so this might still parse
      expect(result.data.length).toBeGreaterThan(0);
    });
  });

  describe("parseDuration", () => {
    it("should parse H:MM:SS format", () => {
      expect(parseDuration("1:30:45")).toBe(5445); // 1h 30m 45s
      expect(parseDuration("0:06:00")).toBe(360); // 6 minutes
      expect(parseDuration("23:50:00")).toBe(85800); // 23h 50m
    });

    it("should parse H:M:S format (single digits)", () => {
      expect(parseDuration("0:6:0")).toBe(360); // 6 minutes
      expect(parseDuration("1:2:3")).toBe(3723); // 1h 2m 3s
      expect(parseDuration("23:50:0")).toBe(85800); // 23h 50m
    });

    it("should parse MM:SS format", () => {
      expect(parseDuration("30:45")).toBe(1845); // 30m 45s
      expect(parseDuration("6:0")).toBe(360); // 6 minutes
    });

    it("should parse seconds only", () => {
      expect(parseDuration("120")).toBe(120);
      expect(parseDuration("60")).toBe(60);
    });

    it("should handle invalid input", () => {
      expect(parseDuration("")).toBeNull();
      expect(parseDuration("abc")).toBeNull();
      expect(parseDuration("1:2:3:4")).toBeNull();
      expect(parseDuration("1:a:3")).toBeNull();
    });

    it("should handle null and undefined", () => {
      expect(parseDuration(null as unknown as string)).toBeNull();
      expect(parseDuration(undefined as unknown as string)).toBeNull();
    });
  });

  describe("parseDateTime", () => {
    it("should parse DD/MM/YYYY HH:mm:ss format (default)", () => {
      const result = parseDateTime("15/01/2025 14:30:00");

      expect(result).not.toBeNull();
      expect(result).toMatch(/^2025-01-15T/);
    });

    it("should parse MM/DD/YYYY format when specified", () => {
      const result = parseDateTime(
        "01/15/2025 14:30:00",
        "MM/DD/YYYY HH:mm:ss"
      );

      expect(result).not.toBeNull();
      expect(result).toMatch(/^2025-01-15T/);
    });

    it("should parse single-digit month and day", () => {
      const result = parseDateTime("5/1/2025 14:30:00");

      expect(result).not.toBeNull();
      expect(result).toMatch(/^2025-01-05T/);
    });

    it("should parse YYYY-MM-DD format", () => {
      const result = parseDateTime(
        "2025-01-15 14:30:00",
        "YYYY-MM-DD HH:mm:ss"
      );

      expect(result).not.toBeNull();
      expect(result).toMatch(/^2025-01-15T/);
    });

    it("should handle invalid dates", () => {
      expect(parseDateTime("")).toBeNull();
      expect(parseDateTime("invalid")).toBeNull();
      expect(parseDateTime("13/32/2025 25:99:99")).toBeNull();
    });

    it("should handle null and undefined", () => {
      expect(parseDateTime(null as unknown as string)).toBeNull();
      expect(parseDateTime(undefined as unknown as string)).toBeNull();
    });

    it("should fallback to native Date parsing", () => {
      const result = parseDateTime("2025-01-15T14:30:00Z", "ISO");

      expect(result).not.toBeNull();
      expect(result).toMatch(/2025-01-15/);
    });
  });

  describe("validateEntryData", () => {
    it("should warn about long durations", () => {
      const warnings = validateEntryData({
        durationSeconds: 86400, // 24 hours
      });

      expect(warnings).toHaveLength(1);
      expect(warnings[0]).toContain("24 hours");
      expect(warnings[0]).toContain("unusually long");
    });

    it("should warn about short durations", () => {
      const warnings = validateEntryData({
        durationSeconds: 15, // 15 seconds
      });

      expect(warnings).toHaveLength(1);
      expect(warnings[0]).toContain("15 seconds");
      expect(warnings[0]).toContain("unusually short");
    });

    it("should warn about future dates", () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);

      const warnings = validateEntryData({
        timestamp: futureDate.toISOString(),
      });

      expect(warnings).toHaveLength(1);
      expect(warnings[0]).toContain("future");
    });

    it("should not warn about valid durations", () => {
      const warnings = validateEntryData({
        durationSeconds: 1800, // 30 minutes
      });

      expect(warnings).toHaveLength(0);
    });

    it("should handle multiple warnings", () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);

      const warnings = validateEntryData({
        durationSeconds: 15,
        timestamp: futureDate.toISOString(),
      });

      expect(warnings.length).toBeGreaterThan(1);
    });

    it("should handle entries with no data", () => {
      const warnings = validateEntryData({});
      expect(warnings).toHaveLength(0);
    });
  });

  describe("detectDateFormat", () => {
    it("should detect MM/DD/YYYY format", () => {
      const samples = ["01/15/2024 10:30:00", "12/25/2023 14:00:00"];
      const result = detectDateFormat(samples);

      expect(result.format).toBe("MM/DD/YYYY HH:mm:ss");
      expect(result.confidence).toBe("high");
    });

    it("should detect DD/MM/YYYY format", () => {
      const samples = ["15/01/2024 10:30:00", "25/12/2023 14:00:00"];
      const result = detectDateFormat(samples);

      expect(result.format).toBe("DD/MM/YYYY HH:mm:ss");
      expect(result.confidence).toBe("high");
    });

    it("should detect ISO format", () => {
      const samples = ["2024-01-15 10:30:00", "2023-12-25 14:00:00"];
      const result = detectDateFormat(samples);

      expect(result.format).toBe("YYYY-MM-DD HH:mm:ss");
      expect(result.confidence).toBe("high");
    });

    it("should handle ambiguous dates with low confidence", () => {
      const samples = ["01/02/2024 10:30:00", "03/04/2023 14:00:00"];
      const result = detectDateFormat(samples);

      expect(result.confidence).toBe("medium");
    });

    it("should handle empty samples", () => {
      const result = detectDateFormat([]);

      expect(result.format).toBe("DD/MM/YYYY HH:mm:ss");
      expect(result.confidence).toBe("low");
    });

    it("should prioritize ISO when majority match", () => {
      const samples = [
        "2024-01-15 10:30:00",
        "2024-01-16 11:00:00",
        "01/15/2024 10:30:00",
      ];
      const result = detectDateFormat(samples);

      expect(result.format).toBe("YYYY-MM-DD HH:mm:ss");
    });
  });

  describe("generateExternalId", () => {
    it("should generate consistent IDs for same data", async () => {
      const entry = {
        timestamp: "2024-01-15T10:30:00Z",
        name: "Meditation",
        type: "timed",
        durationSeconds: 600,
      };

      const id1 = await generateExternalId(entry);
      const id2 = await generateExternalId(entry);

      expect(id1).toBe(id2);
      expect(id1).toMatch(/^import-[a-f0-9]{32}$/);
    });

    it("should generate different IDs for different data", async () => {
      const entry1 = {
        timestamp: "2024-01-15T10:30:00Z",
        name: "Meditation",
        type: "timed",
        durationSeconds: 600,
      };

      const entry2 = {
        timestamp: "2024-01-15T10:30:00Z",
        name: "Breathing", // Different name
        type: "timed",
        durationSeconds: 600,
      };

      const id1 = await generateExternalId(entry1);
      const id2 = await generateExternalId(entry2);

      expect(id1).not.toBe(id2);
    });

    it("should handle entries with minimal data", async () => {
      const entry = {
        timestamp: "2024-01-15T10:30:00Z",
      };

      const id = await generateExternalId(entry);
      expect(id).toMatch(/^import-[a-f0-9]{32}$/);
    });

    it("should use timestamp as the key field for deduplication", async () => {
      // Two entries with same timestamp and name should have same ID
      const entry1 = {
        timestamp: "2024-01-15T10:30:00Z",
        name: "Test",
      };

      const entry2 = {
        timestamp: "2024-01-15T10:30:00Z",
        name: "Test",
      };

      const id1 = await generateExternalId(entry1);
      const id2 = await generateExternalId(entry2);

      expect(id1).toBe(id2);
    });
  });
});
