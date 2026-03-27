import { describe, expect, it } from "vitest";
import { detectTextDirection } from "../../../app/utils/textDirection";

describe("detectTextDirection", () => {
    it("should return ltr for null or undefined", () => {
        expect(detectTextDirection(null)).toBe("ltr");
        expect(detectTextDirection(undefined)).toBe("ltr");
    });

    it("should return ltr for empty string", () => {
        expect(detectTextDirection("")).toBe("ltr");
        expect(detectTextDirection("   ")).toBe("ltr");
    });

    it("should return ltr for English text", () => {
        expect(detectTextDirection("Hello world")).toBe("ltr");
    });

    it("should return rtl for Arabic text", () => {
        expect(detectTextDirection("مرحبا بالعالم")).toBe("rtl");
    });

    it("should return rtl for Hebrew text", () => {
        expect(detectTextDirection("שלום עולם")).toBe("rtl");
    });

    it("should skip markdown characters and detect direction", () => {
        expect(detectTextDirection("# English Title")).toBe("ltr");
        expect(detectTextDirection("# مرحبا بالعالم")).toBe("rtl");
        expect(detectTextDirection("> **שלום עולם**")).toBe("rtl");
    });

    it("should skip numbers and symbols and find the first strong character", () => {
        expect(detectTextDirection("1234 !!! Hello")).toBe("ltr");
        expect(detectTextDirection("2024 - مرحبا")).toBe("rtl");
    });

    it("should handle mixed text starting with LTR", () => {
        expect(detectTextDirection("English then العربية")).toBe("ltr");
    });

    it("should handle mixed text starting with RTL", () => {
        expect(detectTextDirection("العربية then English")).toBe("rtl");
    });

    it("should handle text with leading whitespace and symbols", () => {
        expect(detectTextDirection("   [!!!]   مرحبا")).toBe("rtl");
    });

    it("should return ltr for only numbers and symbols", () => {
        expect(detectTextDirection("1234567890 !@#$%^&*()")).toBe("ltr");
    });
});
