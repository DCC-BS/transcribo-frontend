import { describe, expect, it } from "vitest";
import type { StoredSegment } from "../../app/types/storedSegments";
import {
    charOffsetAtTime,
    timeAtCharOffset,
} from "../../app/utils/transcriptDoc";

function segment(overrides: Partial<StoredSegment>): StoredSegment {
    return {
        id: "s1",
        transcriptionId: "t1",
        text: "Hello world",
        start: 0,
        end: 10,
        speaker: "SPEAKER_00",
        ...overrides,
    };
}

describe("timeAtCharOffset / charOffsetAtTime", () => {
    it("interpolates time from a character offset", () => {
        const s = segment({ text: "abcdefghij", start: 10, end: 20 });
        expect(timeAtCharOffset(s, 0)).toBe(10);
        expect(timeAtCharOffset(s, 5)).toBe(15);
        expect(timeAtCharOffset(s, 10)).toBe(20);
    });

    it("clamps offsets outside the text", () => {
        const s = segment({ text: "abcd", start: 0, end: 4 });
        expect(timeAtCharOffset(s, -2)).toBe(0);
        expect(timeAtCharOffset(s, 100)).toBe(4);
    });

    it("interpolates the character offset from playback time", () => {
        const s = segment({ text: "abcdefghij", start: 10, end: 20 });
        expect(charOffsetAtTime(s, 10)).toBe(0);
        expect(charOffsetAtTime(s, 15)).toBe(5);
        expect(charOffsetAtTime(s, 25)).toBe(10);
    });
});
