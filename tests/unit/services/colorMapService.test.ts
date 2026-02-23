import { describe, expect, it } from "vitest";
import {
    rainbow,
    grayscale,
    viridis,
    inferno,
    magma,
    textFriendly,
    getColorMap,
} from "../../../app/services/colorMapService";
import { RGBColor } from "../../../app/types/color";

describe("rainbow", () => {
    it("should return blue at 0", () => {
        const result = rainbow(0);
        expect(result.r).toBe(0);
        expect(result.b).toBe(255);
    });

    it("should return white at 1", () => {
        const result = rainbow(1);
        expect(result.r).toBe(255);
        expect(result.g).toBeGreaterThanOrEqual(254);
        expect(result.g).toBeLessThanOrEqual(255);
        expect(result.b).toBeGreaterThanOrEqual(254);
        expect(result.b).toBeLessThanOrEqual(255);
    });

    it("should clamp values below 0", () => {
        const result = rainbow(-0.5);
        expect(result).toEqual(rainbow(0));
    });

    it("should clamp values above 1", () => {
        const result = rainbow(1.5);
        expect(result).toEqual(rainbow(1));
    });

    it("should return RGBColor instance", () => {
        const result = rainbow(0.5);
        expect(result).toBeInstanceOf(RGBColor);
    });

    it("should have cyan in 0.2 range", () => {
        const result = rainbow(0.2);
        expect(result.g).toBe(255);
        expect(result.b).toBe(255);
    });

    it("should have green in 0.4 range", () => {
        const result = rainbow(0.4);
        expect(result.g).toBe(255);
    });

    it("should have yellow in 0.6 range", () => {
        const result = rainbow(0.6);
        expect(result.r).toBe(255);
        expect(result.g).toBe(255);
    });

    it("should have red in 0.8 range", () => {
        const result = rainbow(0.8);
        expect(result.r).toBe(255);
    });
});

describe("grayscale", () => {
    it("should return black at 0", () => {
        const result = grayscale(0);
        expect(result.r).toBe(0);
        expect(result.g).toBe(0);
        expect(result.b).toBe(0);
    });

    it("should return white at 1", () => {
        const result = grayscale(1);
        expect(result.r).toBe(255);
        expect(result.g).toBe(255);
        expect(result.b).toBe(255);
    });

    it("should return equal RGB values", () => {
        const result = grayscale(0.5);
        expect(result.r).toBe(result.g);
        expect(result.g).toBe(result.b);
    });

    it("should return 127 for 0.5", () => {
        const result = grayscale(0.5);
        expect(result.r).toBe(127);
    });

    it("should clamp values below 0", () => {
        const result = grayscale(-0.5);
        expect(result).toEqual(grayscale(0));
    });

    it("should clamp values above 1", () => {
        const result = grayscale(1.5);
        expect(result).toEqual(grayscale(1));
    });
});

describe("viridis", () => {
    it("should return dark color at 0", () => {
        const result = viridis(0);
        expect(result.r).toBe(0);
        expect(result.g).toBe(1);
        expect(result.b).toBe(84);
    });

    it("should return lighter color at 1", () => {
        const result = viridis(1);
        expect(result.r).toBeGreaterThanOrEqual(220);
        expect(result.r).toBeLessThanOrEqual(224);
        expect(result.g).toBeGreaterThanOrEqual(213);
        expect(result.g).toBeLessThanOrEqual(217);
        expect(result.b).toBeLessThanOrEqual(5);
    });

    it("should clamp values", () => {
        expect(viridis(-0.5)).toEqual(viridis(0));
        expect(viridis(1.5)).toEqual(viridis(1));
    });

    it("should return RGBColor instance", () => {
        expect(viridis(0.5)).toBeInstanceOf(RGBColor);
    });
});

describe("inferno", () => {
    it("should return dark color at 0", () => {
        const result = inferno(0);
        expect(result.r).toBe(20);
        expect(result.g).toBe(7);
        expect(result.b).toBe(37);
    });

    it("should return bright color at 1", () => {
        const result = inferno(1);
        expect(result.r).toBe(255);
        expect(result.g).toBe(255);
        expect(result.b).toBe(205);
    });

    it("should clamp values", () => {
        expect(inferno(-0.5)).toEqual(inferno(0));
        expect(inferno(1.5)).toEqual(inferno(1));
    });

    it("should return RGBColor instance", () => {
        expect(inferno(0.5)).toBeInstanceOf(RGBColor);
    });
});

describe("magma", () => {
    it("should return dark color at 0", () => {
        const result = magma(0);
        expect(result.r).toBe(15);
        expect(result.g).toBe(5);
        expect(result.b).toBe(45);
    });

    it("should return light color at 1", () => {
        const result = magma(1);
        expect(result.r).toBe(255);
        expect(result.g).toBe(255);
        expect(result.b).toBe(255);
    });

    it("should clamp values", () => {
        expect(magma(-0.5)).toEqual(magma(0));
        expect(magma(1.5)).toEqual(magma(1));
    });

    it("should return RGBColor instance", () => {
        expect(magma(0.5)).toBeInstanceOf(RGBColor);
    });
});

describe("textFriendly", () => {
    it("should return dark blue for first segment", () => {
        const result = textFriendly(0);
        expect(result.r).toBe(0);
        expect(result.g).toBe(51);
        expect(result.b).toBe(153);
    });

    it("should return green for second segment", () => {
        const result = textFriendly(0.2);
        expect(result.r).toBe(0);
        expect(result.g).toBe(128);
        expect(result.b).toBe(0);
    });

    it("should return dark red for third segment", () => {
        const result = textFriendly(0.35);
        expect(result.r).toBe(153);
        expect(result.g).toBe(0);
        expect(result.b).toBe(0);
    });

    it("should return purple for fourth segment", () => {
        const result = textFriendly(0.5);
        expect(result.r).toBe(102);
        expect(result.g).toBe(0);
        expect(result.b).toBe(153);
    });

    it("should return teal for fifth segment", () => {
        const result = textFriendly(0.65);
        expect(result.r).toBe(0);
        expect(result.g).toBe(128);
        expect(result.b).toBe(128);
    });

    it("should return dark orange for sixth segment", () => {
        const result = textFriendly(0.75);
        expect(result.r).toBe(204);
        expect(result.g).toBe(85);
        expect(result.b).toBe(0);
    });

    it("should return dark magenta for last segment", () => {
        const result = textFriendly(0.9);
        expect(result.r).toBe(139);
        expect(result.g).toBe(0);
        expect(result.b).toBe(139);
    });

    it("should clamp values", () => {
        expect(textFriendly(-0.5)).toEqual(textFriendly(0));
        expect(textFriendly(1.5)).toEqual(textFriendly(1));
    });

    it("should return RGBColor instance", () => {
        expect(textFriendly(0.5)).toBeInstanceOf(RGBColor);
    });
});

describe("getColorMap", () => {
    it("should return rainbow function for 'rainbow'", () => {
        const colorMap = getColorMap("rainbow");
        expect(colorMap(0.5)).toEqual(rainbow(0.5));
    });

    it("should return grayscale function for 'grayscale'", () => {
        const colorMap = getColorMap("grayscale");
        expect(colorMap(0.5)).toEqual(grayscale(0.5));
    });

    it("should return viridis function for 'viridis'", () => {
        const colorMap = getColorMap("viridis");
        expect(colorMap(0.5)).toEqual(viridis(0.5));
    });

    it("should return inferno function for 'inferno'", () => {
        const colorMap = getColorMap("inferno");
        expect(colorMap(0.5)).toEqual(inferno(0.5));
    });

    it("should return magma function for 'magma'", () => {
        const colorMap = getColorMap("magma");
        expect(colorMap(0.5)).toEqual(magma(0.5));
    });

    it("should return textFriendly function for 'textFriendly'", () => {
        const colorMap = getColorMap("textFriendly");
        expect(colorMap(0.5)).toEqual(textFriendly(0.5));
    });

    it("should return rainbow as default for unknown type", () => {
        const colorMap = getColorMap("unknown" as never);
        expect(colorMap(0.5)).toEqual(rainbow(0.5));
    });
});
