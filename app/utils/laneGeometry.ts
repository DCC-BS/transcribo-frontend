import type { EditorLaneBlock, EditorLaneChange } from "~/types/editorTimeline";

/*
    Pure interval maths behind the speaker lanes: which lane a block may be
    dropped into, and what a drag on the canvas actually asked for. Kept out
    of the component so both are testable without mounting the editor.
*/

/** Edits below this many seconds are canvas rounding noise, not intent. */
export const LANE_EPSILON = 0.001;

/** True when `target` has room for `block` — no lane may hold overlapping
 *  blocks. The block's own lane always qualifies. */
export function laneAcceptsBlock(
    blocks: EditorLaneBlock[],
    block: EditorLaneBlock,
    target: string,
): boolean {
    return blocks.every(
        (other) =>
            other.id === block.id ||
            other.speaker !== target ||
            other.start >= block.end ||
            other.end <= block.start,
    );
}

export interface LaneChangeIntent {
    /** How far the block travelled — a move shifts every segment by this. */
    startDelta: number;
    /** Both edges travelled together (or a lane was targeted): the block
     *  moves as a whole instead of changing duration. */
    isMove: boolean;
    /** Nothing actually changed — a click, or a drag that snapped back. */
    isNoop: boolean;
    movedStart: boolean;
    movedEnd: boolean;
}

/** What a lane drag asked for, derived from how the two edges travelled. */
export function describeLaneChange(
    block: EditorLaneBlock,
    change: EditorLaneChange,
): LaneChangeIntent {
    const startDelta = change.start - block.start;
    const endDelta = change.end - block.end;
    const isMove =
        change.targetSpeaker !== undefined ||
        Math.abs(startDelta - endDelta) < LANE_EPSILON;
    const movedStart = Math.abs(startDelta) >= LANE_EPSILON;
    const movedEnd = Math.abs(endDelta) >= LANE_EPSILON;
    const isNoop =
        isMove &&
        !movedStart &&
        (!change.targetSpeaker || change.targetSpeaker === block.speaker);

    // endDelta stays local: the resize branch works from change.start/end
    // directly, so only the derived movedEnd flag is of use to callers.
    return { startDelta, isMove, isNoop, movedStart, movedEnd };
}
