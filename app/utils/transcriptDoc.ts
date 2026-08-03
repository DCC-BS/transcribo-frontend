import type { StoredSegment } from "~/types/storedSegments";
import { clamp, clamp01 } from "~/utils/math";

/*
    Time <-> character offset interpolation for the script-style transcript
    viewer: maps the playback position into the text (playhead caret) and a
    click position back into a playback time.
*/

/**
 * Interpolated playback time for a character offset inside a segment.
 * Inverse of the playhead position: used by click-to-seek and
 * "play from here".
 */
export function timeAtCharOffset(
    segment: Pick<StoredSegment, "start" | "end" | "text">,
    charOffset: number,
): number {
    const length = segment.text.length;
    if (length <= 0) {
        return segment.start;
    }
    const progress = clamp01(charOffset / length);
    return segment.start + progress * (segment.end - segment.start);
}

/**
 * Interpolated character offset for the current playback time.
 * Drives the blinking playhead caret in the document.
 */
export function charOffsetAtTime(
    segment: Pick<StoredSegment, "start" | "end" | "text">,
    currentTime: number,
): number {
    const progress = calculateSegmentProgress(
        segment.start,
        segment.end,
        currentTime,
    );
    return Math.round(progress * segment.text.length);
}

/**
 * The word surrounding a character offset, as [start, end) indices.
 *
 * The interpolated playhead offset lands mid-word; every surface that
 * stains the current word — the document decorations, the viewer karaoke
 * and the auto-scroll anchor — expands it the same way, so they always
 * agree on where the word begins and ends.
 */
export function wordBoundsAt(
    text: string,
    offset: number,
): { start: number; end: number } {
    const index = clamp(offset, 0, text.length);
    let start = index;
    while (start > 0 && !/\s/.test(text[start - 1] ?? " ")) {
        start--;
    }
    let end = index;
    while (end < text.length && !/\s/.test(text[end] ?? " ")) {
        end++;
    }
    return { start, end };
}
