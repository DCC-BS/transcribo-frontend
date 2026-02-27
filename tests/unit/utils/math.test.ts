import { describe, expect, it } from "vitest";
import { clamp, clamp01, mapRange } from "../../../app/utils/math";

describe("clamp", () => {
    it("should return value when within range", () => {
        expect(clamp(5, 0, 10)).toBe(5);
    });

    it("should return min when value is below range", () => {
        expect(clamp(-5, 0, 10)).toBe(0);
    });

    it("should return max when value is above range", () => {
        expect(clamp(15, 0, 10)).toBe(10);
    });

    it("should handle negative ranges", () => {
        expect(clamp(-5, -10, -1)).toBe(-5);
    });

    it("should handle value equal to min", () => {
        expect(clamp(0, 0, 10)).toBe(0);
    });

    it("should handle value equal to max", () => {
        expect(clamp(10, 0, 10)).toBe(10);
    });

    it("should handle decimal values", () => {
        expect(clamp(0.5, 0, 1)).toBe(0.5);
    });

    it("should handle inverted min/max", () => {
        expect(clamp(5, 10, 0)).toBe(10);
    });
});

describe("clamp01", () => {
    it("should return value when within 0-1 range", () => {
        expect(clamp01(0.5)).toBe(0.5);
    });

    it("should return 0 when value is negative", () => {
        expect(clamp01(-0.5)).toBe(0);
    });

    it("should return 1 when value is above 1", () => {
        expect(clamp01(1.5)).toBe(1);
    });

    it("should handle 0", () => {
        expect(clamp01(0)).toBe(0);
    });

    it("should handle 1", () => {
        expect(clamp01(1)).toBe(1);
    });

    it("should handle very small positive values", () => {
        expect(clamp01(0.001)).toBe(0.001);
    });
});

describe("mapRange", () => {
    it("should map from one range to another", () => {
        expect(mapRange(5, 0, 10, 0, 100)).toBe(50);
    });

    it("should map negative to positive range", () => {
        expect(mapRange(0, -10, 10, 0, 100)).toBe(50);
    });

    it("should map inMin value to outMin", () => {
        expect(mapRange(0, 0, 10, 100, 200)).toBe(100);
    });

    it("should map inMax value to outMax", () => {
        expect(mapRange(10, 0, 10, 100, 200)).toBe(200);
    });

    it("should handle values outside input range", () => {
        expect(mapRange(15, 0, 10, 0, 100)).toBe(150);
    });

    it("should handle same input min and max", () => {
        expect(mapRange(5, 0, 0, 0, 100)).toBe(Infinity);
    });

    it("should handle decimal values", () => {
        expect(mapRange(2.5, 0, 10, 0, 1)).toBeCloseTo(0.25);
    });

    it("should handle reversed output range", () => {
        expect(mapRange(0, 0, 10, 100, 0)).toBe(100);
        expect(mapRange(10, 0, 10, 100, 0)).toBe(0);
    });
});
