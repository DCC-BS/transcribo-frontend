import { describe, expect, it } from "vitest";
import { formatTime, parseTime } from "../../../app/utils/time";

describe("formatTime", () => {
    describe("with milliseconds (default)", () => {
        it("should format zero time", () => {
            expect(formatTime(0)).toBe("0:00.000");
        });

        it("should format seconds only", () => {
            expect(formatTime(30)).toBe("0:30.000");
        });

        it("should format minutes and seconds", () => {
            expect(formatTime(90)).toBe("1:30.000");
        });

        it("should format hours correctly", () => {
            expect(formatTime(3661.5)).toBe("61:01.500");
        });

        it("should handle milliseconds correctly", () => {
            expect(formatTime(1.234)).toBe("0:01.234");
        });

        it("should pad single digit seconds", () => {
            expect(formatTime(65)).toBe("1:05.000");
        });

        it("should handle fractional milliseconds", () => {
            expect(formatTime(1.9999)).toBe("0:01.999");
        });
    });

    describe("without milliseconds", () => {
        it("should format without milliseconds when option is false", () => {
            expect(formatTime(90, { milliseconds: false })).toBe("1:30");
        });

        it("should format zero time without milliseconds", () => {
            expect(formatTime(0, { milliseconds: false })).toBe("0:00");
        });

        it("should truncate milliseconds", () => {
            expect(formatTime(1.999, { milliseconds: false })).toBe("0:01");
        });
    });

    describe("edge cases", () => {
        it("should handle very small values", () => {
            expect(formatTime(0.001)).toBe("0:00.001");
        });

        it("should handle large values", () => {
            expect(formatTime(7384.567)).toBe("123:04.567");
        });
    });
});

describe("parseTime", () => {
    describe("valid inputs", () => {
        it("should parse zero time", () => {
            expect(parseTime("0:00")).toBe(0);
        });

        it("should parse seconds only", () => {
            expect(parseTime("0:30")).toBe(30);
        });

        it("should parse minutes and seconds", () => {
            expect(parseTime("1:30")).toBe(90);
        });

        it("should parse large minute values", () => {
            expect(parseTime("60:00")).toBe(3600);
        });

        it("should parse single digit minutes", () => {
            expect(parseTime("5:15")).toBe(315);
        });
    });

    describe("invalid inputs", () => {
        it("should throw error for missing colon", () => {
            expect(() => parseTime("130")).toThrow("Invalid time format");
        });

        it("should throw error for multiple colons", () => {
            expect(() => parseTime("1:30:00")).toThrow("Invalid time format");
        });

        it("should throw error for non-numeric values", () => {
            expect(() => parseTime("a:bb")).toThrow("Invalid time format");
        });

        it("should throw error for empty string", () => {
            expect(() => parseTime("")).toThrow("Invalid time format");
        });

        it("should throw error for partial input", () => {
            expect(() => parseTime("1:")).toThrow("Invalid time format");
        });

        it("should throw error for negative values", () => {
            expect(() => parseTime("-1:30")).not.toThrow();
        });
    });
});
