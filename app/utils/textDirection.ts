/**
 * Detection of text direction (LTR or RTL) based on content.
 */

export type TextDirection = "ltr" | "rtl";

/**
 * Detects the text direction of a given string.
 * It looks for the first character with strong directionality.
 *
 * @param text The text to analyze
 * @returns "rtl" if the first strong character is an RTL character, otherwise "ltr"
 */
export function detectTextDirection(
    text: string | null | undefined,
): TextDirection {
    if (!text) return "ltr";

    // Strip markdown formatting and spaces to find the first "real" character
    // We keep letters and numbers for now, but focus on the first "strong" direction character
    const stripped = text.replace(/[#*_`>|\-[\](){}!.,:;]/g, "").trim();

    if (!stripped) return "ltr";

    // RTL Unicode ranges
    const rtlRange =
        /[\u0590-\u05FF\u0600-\u06FF\u0700-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
    // LTR strong ranges (roughly Latin, Greek, Cyrillic, etc.)
    const ltrRange = /[a-zA-Z\u00C0-\u024F\u0370-\u03FF\u0400-\u04FF]/;

    // Iterate through characters to find the first one with a strong direction
    for (let i = 0; i < Math.min(stripped.length, 500); i++) {
        const char = stripped[i];
        if (!char) continue;
        if (rtlRange.test(char)) return "rtl";
        if (ltrRange.test(char)) return "ltr";
    }

    return "ltr";
}
