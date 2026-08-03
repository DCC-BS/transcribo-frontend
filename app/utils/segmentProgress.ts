/*
    Playback progress of the active segment, rendered as the overlay bar in
    the transcript fragments.

    The overlay must work for every transcription size: a former
    `segments.length < 500` "performance guard" silently disabled it for long
    recordings while saving nothing (the list re-renders on every currentTime
    tick regardless). Do not reintroduce a size gate — enforced by
    tests/unit/segmentProgress.test.ts.
*/
import { clamp01 } from "~/utils/math";

/**
 * Playback progress within a segment, used to size the overlay bar.
 *
 * @param start - Segment start time in seconds.
 * @param end - Segment end time in seconds.
 * @param currentTime - Current playback time in seconds.
 * @returns Progress clamped to [0, 1]; `0` for empty or inverted ranges.
 */
export function calculateSegmentProgress(
    start: number,
    end: number,
    currentTime: number,
): number {
    const range = end - start;
    if (range <= 0) {
        return 0;
    }
    return clamp01((currentTime - start) / range);
}
