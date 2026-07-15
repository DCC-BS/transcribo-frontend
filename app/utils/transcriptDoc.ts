import type { StoredSegment } from "~/types/storedSegments";

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
    const progress = Math.min(Math.max(charOffset / length, 0), 1);
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
