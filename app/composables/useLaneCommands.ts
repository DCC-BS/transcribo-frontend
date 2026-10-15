import {
    DeleteSegmentsCommand,
    UpdateSegmentCommand,
    UpdateSegmentsCommand,
} from "~/types/commands";
import type { EditorLaneBlock, EditorLaneChange } from "~/types/editorTimeline";
import type { StoredSegment } from "~/types/storedSegments";
import { describeLaneChange, laneAcceptsBlock } from "~/utils/laneGeometry";

/*
    All undoable mutations the speaker lanes can trigger: deleting a block,
    applying a finished drag/resize, moving a block or a whole speaker to
    another lane, and jumping the playhead to a speaker's next block.
*/
export function useLaneCommands(
    blocks: ComputedRef<EditorLaneBlock[]>,
    segmentsBySpeaker: ComputedRef<Map<string, StoredSegment[]>>,
    onSeek: (seconds: number) => void,
) {
    const { executeCommand } = useCommandBus();
    const { openDialog } = useDialog();
    const { displayName, removeEmptySpeaker } = useSpeakerRegistry();

    /**
     * Deletes a whole lane block as one undoable command.
     *
     * @param blockId - Block to delete.
     */
    async function deleteBlock(blockId: string): Promise<void> {
        const block = blocks.value.find(
            (candidate) => candidate.id === blockId,
        );
        if (!block) {
            return;
        }
        // one command for the whole block, so undo/redo restores it as a whole
        await executeCommand(
            new DeleteSegmentsCommand(
                block.segments.map((segment) => segment.id),
            ),
        );
    }

    /**
     * Applies a finished lane drag — move, resize or speaker change — to the underlying segments.
     *
     * @param change - The change the canvas reported.
     */
    async function applyLaneChange(change: EditorLaneChange): Promise<void> {
        const block = blocks.value.find(
            (candidate) => candidate.id === change.blockId,
        );
        if (!block) {
            return;
        }

        const { startDelta, isMove, isNoop, movedStart, movedEnd } =
            describeLaneChange(block, change);

        if (isMove) {
            if (isNoop) {
                return;
            }
            await executeCommand(
                new UpdateSegmentsCommand(
                    block.segments.map((segment) => ({
                        segmentId: segment.id,
                        updates: {
                            start: segment.start + startDelta,
                            end: segment.end + startDelta,
                            ...(change.targetSpeaker
                                ? { speaker: change.targetSpeaker }
                                : {}),
                        },
                    })),
                ),
            );
            return;
        }

        const first = block.segments[0];
        const last = block.segments[block.segments.length - 1];
        if (!first || !last) {
            return;
        }
        if (first.id === last.id) {
            await executeCommand(
                new UpdateSegmentCommand(first.id, {
                    ...(movedStart ? { start: change.start } : {}),
                    ...(movedEnd ? { end: change.end } : {}),
                }),
            );
            return;
        }

        const updates: ConstructorParameters<typeof UpdateSegmentsCommand>[0] =
            [];
        if (movedStart) {
            updates.push({
                segmentId: first.id,
                updates: { start: change.start },
            });
        }
        if (movedEnd) {
            updates.push({
                segmentId: last.id,
                updates: { end: change.end },
            });
        }
        if (updates.length > 0) {
            await executeCommand(new UpdateSegmentsCommand(updates));
        }
    }

    /**
     * Seeks to the speaker's next block after the playhead, wrapping to their first one.
     *
     * @param speaker - Speaker id.
     * @param currentTime - Current playback time.
     */
    function jumpToNext(speaker: string, currentTime: number): void {
        const sorted = blocks.value
            .filter((block) => block.speaker === speaker)
            .sort((left, right) => left.start - right.start);
        const next =
            sorted.find((block) => block.start > currentTime + 0.05) ??
            sorted[0];
        if (next) {
            onSeek(next.start);
        }
    }

    /**
     * Moves a block to another speaker lane.
     *
     * @param block - The block to move.
     * @param target - Target speaker id.
     */
    async function moveBlockTo(
        block: EditorLaneBlock,
        target: string,
    ): Promise<void> {
        if (
            target === block.speaker ||
            !laneAcceptsBlock(blocks.value, block, target)
        ) {
            return;
        }
        await executeCommand(
            new UpdateSegmentsCommand(
                block.segments.map((segment) => ({
                    segmentId: segment.id,
                    updates: { speaker: target },
                })),
            ),
        );
    }

    /**
     * Whether a block fits into a lane without overlapping.
     *
     * @param block - The block to move.
     * @param target - Target speaker id.
     * @returns `true` when the lane has room.
     */
    function canMoveBlockTo(block: EditorLaneBlock, target: string): boolean {
        return laneAcceptsBlock(blocks.value, block, target);
    }

    /**
     * Merges all segments of a speaker into another speaker.
     *
     * @param source - Speaker to merge from.
     * @param target - Speaker to merge into.
     */
    async function moveSegmentsTo(
        source: string,
        target: string,
    ): Promise<void> {
        if (!source || source === target) {
            return;
        }
        await executeCommand(
            new UpdateSegmentsCommand(
                (segmentsBySpeaker.value.get(source) ?? []).map((segment) => ({
                    segmentId: segment.id,
                    updates: { speaker: target },
                })),
            ),
        );
    }

    /**
     * Deletes a speaker's segments and drops the now empty speaker.
     *
     * @param speaker - Speaker id.
     * @param segmentIds - Segments to delete.
     */
    async function deleteSpeakerSegments(
        speaker: string,
        segmentIds: string[],
    ): Promise<void> {
        await executeCommand(new DeleteSegmentsCommand(segmentIds));
        removeEmptySpeaker(speaker);
    }

    /**
     * Asks for confirmation before deleting a speaker's segments.
     *
     * @param speaker - Speaker id.
     * @param t - Translation function.
     */
    function requestDeleteSpeaker(
        speaker: string,
        t: (key: string, params?: Record<string, unknown>) => string,
    ): void {
        const segmentIds = (segmentsBySpeaker.value.get(speaker) ?? []).map(
            (segment) => segment.id,
        );
        if (segmentIds.length === 0) {
            return;
        }
        openDialog({
            title: t("editor.lanes.deleteSpeaker"),
            message: t("editor.lanes.deleteSpeakerConfirm", {
                speaker: displayName(speaker),
            }),
            onSubmit: () => {
                void deleteSpeakerSegments(speaker, segmentIds);
            },
        });
    }

    return {
        deleteBlock,
        applyLaneChange,
        jumpToNext,
        moveBlockTo,
        canMoveBlockTo,
        moveSegmentsTo,
        requestDeleteSpeaker,
    };
}
