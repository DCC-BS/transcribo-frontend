import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { calculateSegmentProgress } from "~/utils/segmentProgress";

describe("calculateSegmentProgress", () => {
    it("reports playback position inside the segment", () => {
        expect(calculateSegmentProgress(10, 20, 15)).toBe(0.5);
        expect(calculateSegmentProgress(10, 20, 10)).toBe(0);
        expect(calculateSegmentProgress(10, 20, 20)).toBe(1);
    });

    it("clamps outside the segment", () => {
        expect(calculateSegmentProgress(10, 20, 5)).toBe(0);
        expect(calculateSegmentProgress(10, 20, 25)).toBe(1);
    });

    it("returns 0 for empty or inverted ranges", () => {
        expect(calculateSegmentProgress(10, 10, 10)).toBe(0);
        expect(calculateSegmentProgress(20, 10, 15)).toBe(0);
    });
});

/*
    Regression guard: the fragment playback overlay was once silently disabled
    for transcriptions with >= 500 segments via a `segments.length < 500`
    gate. The overlay must work for every transcription size — fail loudly if
    someone reintroduces a size gate or a showProgress switch.
*/
describe("fragment progress overlay is never gated", () => {
    const read = (path: string) =>
        readFileSync(resolve(__dirname, "../..", path), "utf-8");

    it("TranscriptionList does not gate the overlay by segment count", () => {
        const source = read(
            "app/components/transcriptionList/TranscriptionList.vue",
        );
        expect(source).not.toMatch(/useProgress|show-progress|showProgress/);
        expect(source).not.toMatch(/segments[^\n]*length\s*[<>]/);
    });

    it("TranscriptionSegmentEdit renders the overlay for active segments", () => {
        const source = read(
            "app/components/transcriptionList/TranscriptionSegmentEdit.vue",
        );
        expect(source).toContain("calculateSegmentProgress");
        expect(source).not.toMatch(/showProgress/);
    });
});
