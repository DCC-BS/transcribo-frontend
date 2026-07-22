import { describe, expect, it } from "vitest";
import type { StoredSegment } from "../../app/types/storedSegments";
import {
    charOffsetAtTime,
    timeAtCharOffset,
} from "../../app/utils/transcriptDoc";
import { buildTranscriptTurns } from "../../app/utils/tiptapTranscript";

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

describe("buildTranscriptTurns paragraph breaks", () => {
    // ~100 chars ending in a full sentence
    const sentence =
        "Das ist ein Beispielsatz mit einer ganzen Reihe von Woertern, damit die Laenge ungefaehr stimmt so.";

    function run(text: string, count: number): StoredSegment[] {
        return Array.from({ length: count }, (_, i) =>
            segment({ id: `s${i}`, text, start: i * 10, end: i * 10 + 9 }),
        );
    }

    it("keeps short same-speaker runs as one unbroken paragraph", () => {
        const turns = buildTranscriptTurns(run(sentence, 4));
        expect(turns).toHaveLength(1);
        expect(turns[0]?.paragraphBreaks.size).toBe(0);
    });

    it("breaks long runs at sentence ends but keeps them one turn", () => {
        const turns = buildTranscriptTurns(run(sentence, 12));
        expect(turns).toHaveLength(1);
        expect(turns[0]?.paragraphBreaks.size).toBeGreaterThan(0);
    });

    it("force-breaks at the hard limit without sentence ends", () => {
        const noEnd = sentence.slice(0, -1); // strip the final period
        const turns = buildTranscriptTurns(run(noEnd, 12));
        expect(turns[0]?.paragraphBreaks.size).toBeGreaterThan(0);
    });

    it("never breaks when merging is off", () => {
        const turns = buildTranscriptTurns(run(sentence, 12), false);
        expect(turns).toHaveLength(12);
    });
});
