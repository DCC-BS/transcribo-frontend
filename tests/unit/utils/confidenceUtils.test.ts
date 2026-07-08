import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Word } from "../../../app/types/transcriptionResponse";
import {
    ClearConfidenceOnEdit,
    computeLowConfidenceRanges,
    confidenceHighlightStyle,
    confidenceLabelKey,
    ConfidenceProbabilityAttribute,
    confidenceTextToHtml,
    htmlToTextAndRanges,
} from "../../../app/utils/confidenceUtils";

function word(text: string, probability: number): Word {
    return { word: text, probability, start: 0, end: 0, speaker: null };
}

describe("computeLowConfidenceRanges", () => {
    it("returns the ranges of low-confidence words with their probability", () => {
        const ranges = computeLowConfidenceRanges("Hello world", [
            word(" Hello", 0.9),
            word(" world", 0.3),
        ]);

        expect(ranges).toEqual([{ start: 6, end: 11, probability: 0.3 }]);
    });

    it("distinguishes repeated words by position", () => {
        const ranges = computeLowConfidenceRanges("so so good", [
            word(" so", 0.9),
            word(" so", 0.3),
            word(" good", 0.9),
        ]);

        expect(ranges).toEqual([{ start: 3, end: 5, probability: 0.3 }]);
    });

    it("skips words that do not appear in the text", () => {
        const ranges = computeLowConfidenceRanges("Hello world", [
            word(" Hello", 0.9),
            word(" missing", 0.3),
            word(" world", 0.3),
        ]);

        expect(ranges).toEqual([{ start: 6, end: 11, probability: 0.3 }]);
    });

    it("returns no ranges without words", () => {
        expect(computeLowConfidenceRanges("Hello", null)).toEqual([]);
        expect(computeLowConfidenceRanges("Hello", [])).toEqual([]);
    });
});

describe("confidenceTextToHtml", () => {
    it("wraps the ranges in the confidence mark with the probability", () => {
        const html = confidenceTextToHtml("Hello world", [
            { start: 6, end: 11, probability: 0.3 },
        ]);

        expect(html).toBe(
            '<p>Hello <u data-confidence="0.3">world</u></p>',
        );
    });

    it("renders plain text without ranges", () => {
        expect(confidenceTextToHtml("Hello world", [])).toBe(
            "<p>Hello world</p>",
        );
    });

    it("ignores stale ranges outside the text", () => {
        expect(
            confidenceTextToHtml("Hi", [
                { start: 1, end: 10, probability: 0.3 },
            ]),
        ).toBe("<p>Hi</p>");
    });

    it("maps each line to its own paragraph", () => {
        expect(confidenceTextToHtml("First line\nSecond line", [])).toBe(
            "<p>First line</p><p>Second line</p>",
        );
    });

    it("keeps ranges across lines", () => {
        const html = confidenceTextToHtml("Hello\nworld again", [
            { start: 6, end: 11, probability: 0.3 },
        ]);

        expect(html).toBe(
            '<p>Hello</p><p><u data-confidence="0.3">world</u> again</p>',
        );
    });

    it("escapes HTML in the text", () => {
        expect(confidenceTextToHtml("a <b> & c", [])).toBe(
            "<p>a &lt;b&gt; &amp; c</p>",
        );
    });

    it("renders an empty paragraph for empty text", () => {
        expect(confidenceTextToHtml("", [])).toBe("<p></p>");
    });
});

describe("htmlToTextAndRanges", () => {
    it("extracts the text and the marked ranges with their probability", () => {
        const { text, ranges } = htmlToTextAndRanges(
            '<p>Hello <u data-confidence="0.3">world</u></p>',
        );

        expect(text).toBe("Hello world");
        expect(ranges).toEqual([{ start: 6, end: 11, probability: 0.3 }]);
    });

    it("falls back to the threshold when a mark has no probability", () => {
        const { ranges } = htmlToTextAndRanges("<p><u>world</u></p>");

        expect(ranges).toEqual([{ start: 0, end: 5, probability: 0.5 }]);
    });

    it("joins paragraphs with newlines and keeps offsets aligned", () => {
        const { text, ranges } = htmlToTextAndRanges(
            '<p>Hello</p><p><u data-confidence="0.3">world</u> again</p>',
        );

        expect(text).toBe("Hello\nworld again");
        expect(ranges).toEqual([{ start: 6, end: 11, probability: 0.3 }]);
    });

    it("round-trips with confidenceTextToHtml", () => {
        const originalText = "Hello world\nsecond line";
        const originalRanges = [
            { start: 6, end: 11, probability: 0.3 },
            { start: 12, end: 18, probability: 0.42 },
        ];

        const { text, ranges } = htmlToTextAndRanges(
            confidenceTextToHtml(originalText, originalRanges),
        );

        expect(text).toBe(originalText);
        expect(ranges).toEqual(originalRanges);
    });

    it("returns no ranges for unmarked content", () => {
        expect(htmlToTextAndRanges("<p>Hello</p>")).toEqual({
            text: "Hello",
            ranges: [],
        });
    });
});

describe("confidenceHighlightStyle", () => {
    it("grades halfway between warning and error at half the threshold", () => {
        expect(confidenceHighlightStyle(0.25)).toBe(
            "background-color: color-mix(in srgb, color-mix(in oklab, var(--ui-warning) 50%, var(--ui-error)) 25%, transparent)",
        );
    });

    it("is pure error color at probability 0", () => {
        expect(confidenceHighlightStyle(0)).toContain("var(--ui-warning) 0%");
    });

    it("is pure warning color at and above the threshold", () => {
        expect(confidenceHighlightStyle(0.5)).toContain(
            "var(--ui-warning) 100%",
        );
        expect(confidenceHighlightStyle(0.9)).toContain(
            "var(--ui-warning) 100%",
        );
    });
});

describe("confidenceLabelKey", () => {
    it("rates up to 0.2 as very uncertain", () => {
        expect(confidenceLabelKey(0)).toBe("confidence.veryUncertain");
        expect(confidenceLabelKey(0.2)).toBe("confidence.veryUncertain");
    });

    it("rates above 0.2 as uncertain", () => {
        expect(confidenceLabelKey(0.21)).toBe("confidence.uncertain");
        expect(confidenceLabelKey(0.5)).toBe("confidence.uncertain");
    });
});

describe("ConfidenceProbabilityAttribute", () => {
    it("renders no style without a probability", () => {
        const editor = new Editor({
            content: "<p><u>w</u></p>",
            extensions: [StarterKit, ConfidenceProbabilityAttribute],
        });
        expect(editor.getHTML()).not.toContain("style=");
        editor.destroy();
    });
});

describe("ClearConfidenceOnEdit", () => {
    let editor: Editor;

    beforeEach(() => {
        editor = new Editor({
            content: "<p>Hello <u>wrold</u> out <u>ther</u></p>",
            extensions: [StarterKit, ClearConfidenceOnEdit],
        });
    });

    afterEach(() => {
        editor.destroy();
    });

    it("removes the highlight from a word edited in the middle", () => {
        editor.commands.insertContentAt(9, "o");

        expect(editor.getHTML()).toBe("<p>Hello wroold out <u>ther</u></p>");
    });

    it("removes the highlight when typing at the end of a marked word", () => {
        editor.commands.insertContentAt(21, "e");

        expect(editor.getHTML()).toBe("<p>Hello <u>wrold</u> out there</p>");
    });

    it("removes the highlight when deleting inside a marked word", () => {
        editor.commands.deleteRange({ from: 8, to: 9 });

        expect(editor.getHTML()).toBe("<p>Hello wold out <u>ther</u></p>");
    });

    it("keeps other highlights when editing unmarked text", () => {
        editor.commands.insertContentAt(1, "Oh ");

        expect(editor.getHTML()).toBe(
            "<p>Oh Hello <u>wrold</u> out <u>ther</u></p>",
        );
    });

    it("removes highlights from both fringe words when a range spans them", () => {
        editor.commands.deleteRange({ from: 8, to: 20 });

        expect(editor.getHTML()).toBe("<p>Hello wr</p>");
    });
});
