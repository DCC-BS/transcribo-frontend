import type { StoredSegment } from "~/types/storedSegments";
import { clamp, clamp01 } from "~/utils/math";

/*
    Playback position <-> text lookups for the script-style transcript
    viewer: which segment is being spoken, where the playhead sits inside its
    text, and which time a click in the text maps back to.
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
 * The segments being spoken at a playback position, one per turn covering it.
 *
 * Speakers may talk over each other — only *same*-speaker segments are barred
 * from overlapping — so any number of turns can be live at once and each one
 * contributes the segment it is currently on.
 *
 * Clicking behind the last word of a turn seeks to exactly its end time.
 * That instant belongs to no turn under a plain half-open test, which would
 * leave the karaoke without a current word and the transcript unstained.
 * Turns ending exactly at `currentTime` are therefore kept as a fallback and
 * only used when no turn really contains it, so a turn starting where its
 * predecessor ends still wins.
 *
 * @param turns - Speaker turns in playback order.
 * @param currentTime - Playback position in seconds.
 * @returns The segments being spoken, empty outside the transcript.
 */
export function activeSegmentsAt<
    T extends Pick<StoredSegment, "start" | "end">,
>(
    turns: readonly { readonly segments: readonly T[] }[],
    currentTime: number,
): T[] {
    const spoken: T[] = [];
    const endHere: T[] = [];
    for (const turn of turns) {
        const first = turn.segments[0];
        const last = turn.segments[turn.segments.length - 1];
        if (
            !first ||
            !last ||
            currentTime < first.start ||
            currentTime > last.end
        ) {
            continue;
        }
        // One speaker never overlaps themselves, so a turn's segments run in
        // playback order and the last one that has started is the live one.
        let active = first;
        for (const segment of turn.segments) {
            if (segment.start > currentTime) {
                break;
            }
            active = segment;
        }
        (currentTime < last.end ? spoken : endHere).push(active);
    }
    return spoken.length > 0 ? spoken : endHere;
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
