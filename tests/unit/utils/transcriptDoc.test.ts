import { describe, expect, it } from "vitest";
import {
    activeSegmentsAt,
    wordBoundsAt,
} from "../../../app/utils/transcriptDoc";

describe("wordBoundsAt", () => {
    const text = "der Regierungsrat tagt";

    it("expands an offset inside a word to the whole word", () => {
        expect(wordBoundsAt(text, 8)).toEqual({ start: 4, end: 17 });
    });

    it("keeps the word to the right when sitting on its first character", () => {
        expect(wordBoundsAt(text, 4)).toEqual({ start: 4, end: 17 });
    });

    it("clamps an offset past the end to the last word", () => {
        expect(wordBoundsAt(text, 999)).toEqual({
            start: 18,
            end: text.length,
        });
    });

    it("clamps a negative offset to the first word", () => {
        expect(wordBoundsAt(text, -5)).toEqual({ start: 0, end: 3 });
    });

    // The playhead sits on the space only between two words; staining the
    // word just finished reads better than staining nothing at all.
    it("falls back to the preceding word when sitting on whitespace", () => {
        expect(wordBoundsAt(text, 3)).toEqual({ start: 0, end: 3 });
    });

    it("handles empty text", () => {
        expect(wordBoundsAt("", 0)).toEqual({ start: 0, end: 0 });
    });
});

describe("activeSegmentsAt", () => {
    const a = { id: "a", start: 0, end: 2 };
    const b = { id: "b", start: 2, end: 4 };
    const c = { id: "c", start: 6, end: 8 };
    // two turns: [a, b] runs 0-4, [c] runs 6-8 with a silent gap between
    const turns = [{ segments: [a, b] }, { segments: [c] }];

    it("finds the segment being spoken", () => {
        expect(activeSegmentsAt(turns, 1)).toEqual([a]);
        expect(activeSegmentsAt(turns, 3)).toEqual([b]);
        expect(activeSegmentsAt(turns, 7)).toEqual([c]);
    });

    it("moves on at a segment boundary inside a turn", () => {
        expect(activeSegmentsAt(turns, 2)).toEqual([b]);
    });

    it("keeps the last segment when the time is a turn's end", () => {
        expect(activeSegmentsAt(turns, 4)).toEqual([b]);
        expect(activeSegmentsAt(turns, 8)).toEqual([c]);
    });

    it("prefers a turn starting where the previous one ends", () => {
        const adjacent = { segments: [{ id: "d", start: 4, end: 6 }] };
        expect(
            activeSegmentsAt([{ segments: [a, b] }, adjacent], 4),
        ).toEqual([{ id: "d", start: 4, end: 6 }]);
    });

    // Speakers talking over each other: every live turn stays highlighted,
    // each on the segment it is currently on.
    it("returns every turn speaking at once", () => {
        const over1 = { id: "x", start: 1, end: 5 };
        const over2 = { id: "y", start: 3, end: 9 };
        const overlapping = [
            { segments: [a, b] },
            { segments: [over1] },
            { segments: [over2] },
        ];
        expect(activeSegmentsAt(overlapping, 3.5)).toEqual([b, over1, over2]);
        // once the first two have ended only the long one is left
        expect(activeSegmentsAt(overlapping, 6)).toEqual([over2]);
    });

    it("returns nothing in a gap or outside the transcript", () => {
        expect(activeSegmentsAt(turns, 5)).toEqual([]);
        expect(activeSegmentsAt(turns, 9)).toEqual([]);
        expect(activeSegmentsAt([], 1)).toEqual([]);
    });
});
