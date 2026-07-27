import { describe, expect, it } from "vitest";
import { resolveTranscriptionTitle } from "../../../app/utils/resolveTranscriptionTitle";

describe("resolveTranscriptionTitle", () => {
    it("prefers and trims the inferred title", () => {
        expect(
            resolveTranscriptionTitle(
                "  Gespräch über Stadtentwicklung  ",
                "aufnahme.mp3",
            ),
        ).toBe("Gespräch über Stadtentwicklung");
    });

    it.each([null, undefined, "", "   "])(
        "falls back to the media filename for %s",
        (inferredTitle) => {
            expect(
                resolveTranscriptionTitle(inferredTitle, "aufnahme.mp3"),
            ).toBe("aufnahme.mp3");
        },
    );
});
