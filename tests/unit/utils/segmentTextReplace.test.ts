import { describe, expect, it, vi } from "vitest";
import {
    buildTermPattern,
    escapeRegExp,
    replaceTermInSegmentTexts,
} from "../../../app/utils/segmentTextReplace";

describe("escapeRegExp", () => {
    it("escapes regex metacharacters", () => {
        expect(escapeRegExp("a.b*c")).toBe("a\\.b\\*c");
        expect(escapeRegExp("(x)[y]{z}")).toBe("\\(x\\)\\[y\\]\\{z\\}");
    });

    it("leaves plain text untouched", () => {
        expect(escapeRegExp("Basel")).toBe("Basel");
    });
});

describe("buildTermPattern", () => {
    it("matches only whole words, case-insensitively by default", () => {
        const pattern = buildTermPattern("Basel");
        expect(pattern.test("in basel today")).toBe(true);
        expect(pattern.test("BASEL")).toBe(true);
        expect(pattern.test("Baselland")).toBe(false);
        expect(pattern.test("Grossbasel")).toBe(false);
    });

    it("trims the term before matching", () => {
        expect(buildTermPattern("  Basel  ").test("Basel")).toBe(true);
    });

    it("escapes metacharacters in the term", () => {
        const pattern = buildTermPattern("a.b");
        expect(pattern.test("a.b")).toBe(true);
        expect(pattern.test("axb")).toBe(false);
    });

    it("supports a global flag for replace-all", () => {
        const result = "Basel and Basel".replace(buildTermPattern("Basel", "g"), "BS");
        expect(result).toBe("BS and BS");
    });
});

describe("replaceTermInSegmentTexts", () => {
    it("replaces every whole-word occurrence (case-sensitive) and emits one command per changed segment", async () => {
        const segments = [
            { id: "1", text: "Herr Meier war da." },
            { id: "2", text: "Meier und Meier." },
            { id: "3", text: "Meierhof bleibt." },
        ];
        const executeCommand = vi.fn().mockResolvedValue(undefined);

        const changed = await replaceTermInSegmentTexts(
            segments,
            "Meier",
            "Müller",
            executeCommand,
        );

        // Segment 3 ("Meierhof") is a partial match and stays untouched.
        expect(changed).toBe(2);
        expect(executeCommand).toHaveBeenCalledTimes(2);
        const first = executeCommand.mock.calls[0]?.[0];
        expect(first.segmentId).toBe("1");
        expect(first.updates).toEqual({ text: "Herr Müller war da." });
        const second = executeCommand.mock.calls[1]?.[0];
        expect(second.updates).toEqual({ text: "Müller und Müller." });
    });

    it("does nothing when the term is empty or unchanged", async () => {
        const executeCommand = vi.fn();
        const segments = [{ id: "1", text: "Basel" }];

        expect(
            await replaceTermInSegmentTexts(segments, "", "x", executeCommand),
        ).toBe(0);
        expect(
            await replaceTermInSegmentTexts(
                segments,
                "Basel",
                "Basel",
                executeCommand,
            ),
        ).toBe(0);
        expect(executeCommand).not.toHaveBeenCalled();
    });
});
