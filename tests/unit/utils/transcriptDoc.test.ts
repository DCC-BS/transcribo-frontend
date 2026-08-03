import { describe, expect, it } from "vitest";
import { wordBoundsAt } from "../../../app/utils/transcriptDoc";

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
