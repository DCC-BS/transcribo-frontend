import { RGBColor } from "~/types/color";

const SPEAKER_PALETTE = [
    "#0e81a7",
    "#9156b4",
    "#e69500",
    "#a57251",
    "#009a79",
    "#c74f4f",
] as const;

const FALLBACK_COLOR = new RGBColor(115, 115, 115);

/**
 * Parses a `#rrggbb` string into a color.
 *
 * @param hex - The hex color string.
 * @returns The parsed color, or the neutral fallback for malformed input.
 */
function hexToRgb(hex: string): RGBColor {
    const match = hex.match(/^#([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i);
    if (!match) {
        return FALLBACK_COLOR;
    }
    return new RGBColor(
        Number.parseInt(match[1] as string, 16),
        Number.parseInt(match[2] as string, 16),
        Number.parseInt(match[3] as string, 16),
    );
}

/**
 * Assigns a stable palette color to each speaker, in order of appearance.
 *
 * @param speakers - Reactive list of speaker labels; falsy entries are ignored.
 * @returns A lookup function and the speaker-to-color map.
 */
export function useSpeakerColor(speakers: Ref<(string | undefined)[]>) {
    const speakerSet = computed(() =>
        Array.from(
            new Set(
                speakers.value.filter((speaker): speaker is string =>
                    Boolean(speaker),
                ),
            ),
        ),
    );

    const colorDict = computed(() =>
        speakerSet.value.reduce(
            (acc, speaker, index) => {
                acc[speaker] = hexToRgb(
                    SPEAKER_PALETTE[index % SPEAKER_PALETTE.length] as string,
                );
                return acc;
            },
            {} as Record<string, RGBColor>,
        ),
    );

    /**
     * Color assigned to a speaker.
     *
     * @param speaker - Speaker label.
     * @returns The speaker's color, or the neutral fallback when unknown.
     */
    function getSpeakerColor(speaker: string | undefined): RGBColor {
        if (!speaker) {
            return FALLBACK_COLOR;
        }
        return colorDict.value[speaker] ?? FALLBACK_COLOR;
    }

    return {
        getSpeakerColor,
        colorDict,
    };
}
