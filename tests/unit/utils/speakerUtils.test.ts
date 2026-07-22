import { describe, expect, it } from "vitest";
import {
    getUniqueSpeakers,
    nextSpeakerName,
} from "../../../app/utils/speakerUtils";
import type { Segment } from "../../../app/types/transcriptionResponse";

describe("getUniqueSpeakers", () => {
    it("should return empty set for empty array", () => {
        const result = getUniqueSpeakers([]);
        expect(result.size).toBe(0);
    });

    it("should return single speaker", () => {
        const segments: Segment[] = [
            { start: 0, end: 5, text: "Hello", speaker: "Speaker 1" },
        ];
        const result = getUniqueSpeakers(segments);
        expect(result).toEqual(new Set(["Speaker 1"]));
    });

    it("should return unique speakers", () => {
        const segments: Segment[] = [
            { start: 0, end: 5, text: "Hello", speaker: "Speaker 1" },
            { start: 5, end: 10, text: "World", speaker: "Speaker 2" },
            { start: 10, end: 15, text: "Again", speaker: "Speaker 1" },
        ];
        const result = getUniqueSpeakers(segments);
        expect(result).toEqual(new Set(["Speaker 1", "Speaker 2"]));
    });

    it("should handle undefined speakers as 'unknown'", () => {
        const segments: Segment[] = [
            { start: 0, end: 5, text: "Hello", speaker: undefined },
        ];
        const result = getUniqueSpeakers(segments);
        expect(result).toEqual(new Set(["unknown"]));
    });

    it("should handle mixed defined and undefined speakers", () => {
        const segments: Segment[] = [
            { start: 0, end: 5, text: "Hello", speaker: "Speaker 1" },
            { start: 5, end: 10, text: "World", speaker: undefined },
            { start: 10, end: 15, text: "Again", speaker: "Speaker 1" },
        ];
        const result = getUniqueSpeakers(segments);
        expect(result).toEqual(new Set(["Speaker 1", "unknown"]));
    });

    it("should handle segments without speaker field", () => {
        const segments: Segment[] = [
            { start: 0, end: 5, text: "Hello" },
        ];
        const result = getUniqueSpeakers(segments);
        expect(result).toEqual(new Set(["unknown"]));
    });

    it("should handle empty string speaker", () => {
        const segments: Segment[] = [
            { start: 0, end: 5, text: "Hello", speaker: "" },
        ];
        const result = getUniqueSpeakers(segments);
        expect(result).toEqual(new Set([""]));
    });
});

describe("nextSpeakerName", () => {
    it("starts at SPEAKER_00 when there are none", () => {
        expect(nextSpeakerName([])).toBe("SPEAKER_00");
        expect(nextSpeakerName(["Alice", "Bob"])).toBe("SPEAKER_00");
    });

    it("continues past the highest existing index", () => {
        expect(nextSpeakerName(["SPEAKER_00", "SPEAKER_01"])).toBe("SPEAKER_02");
        expect(nextSpeakerName(["SPEAKER_03", "Alice"])).toBe("SPEAKER_04");
    });

    it("ignores gaps and picks max + 1", () => {
        expect(nextSpeakerName(["SPEAKER_00", "SPEAKER_05"])).toBe("SPEAKER_06");
    });
});
