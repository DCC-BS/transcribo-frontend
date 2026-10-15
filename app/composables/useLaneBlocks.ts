import type { EditorLaneBlock } from "~/types/editorTimeline";
import type { StoredSegment } from "~/types/storedSegments";
import { buildTranscriptTurns } from "~/utils/tiptapTranscript";

/*
    Builds the lane blocks shown in the speaker lanes from the raw segments.
    In merge mode a block is a whole merged turn (kept intact when it moves
    across speakers); otherwise each turn is its own block.
*/
export function useLaneBlocks(
    segments: MaybeRefOrGetter<StoredSegment[]>,
    mergeSegments: MaybeRefOrGetter<boolean | undefined>,
    duration: MaybeRefOrGetter<number>,
    currentTime: MaybeRefOrGetter<number>,
) {
    const segmentsBySpeaker = computed(() => {
        const map = new Map<string, StoredSegment[]>();
        for (const segment of toValue(segments)) {
            const speaker = segment.speaker ?? "unknown";
            const entries = map.get(speaker) ?? [];
            entries.push(segment);
            map.set(speaker, entries);
        }
        return map;
    });

    const timelineDuration = computed(() =>
        toValue(segments).reduce(
            (latestEnd, segment) => Math.max(latestEnd, segment.end),
            toValue(duration),
        ),
    );

    // A merged block must keep its members when it moves across other speakers
    // in time. Rebuilding turns solely from chronological order would split
    // that block as soon as another speaker falls between two of its members.
    const mergeGroupBySegmentId = new Map<string, string>();

    /**
     * Rebuilds the segment-to-turn mapping so lane blocks match the merged turns shown in the document editor.
     */
    function initializeMergeGroups(): void {
        mergeGroupBySegmentId.clear();
        for (const turn of buildTranscriptTurns(toValue(segments), true)) {
            const groupId = turn.segments[0]?.id;
            if (!groupId) {
                continue;
            }
            for (const segment of turn.segments) {
                mergeGroupBySegmentId.set(segment.id, groupId);
            }
        }
    }

    watch(
        [() => toValue(segments), () => toValue(mergeSegments)],
        ([currentSegments, merged], [, previousMerged]) => {
            if (!merged) {
                mergeGroupBySegmentId.clear();
                return;
            }
            if (!previousMerged || mergeGroupBySegmentId.size === 0) {
                initializeMergeGroups();
                return;
            }
            // Keep mappings for deleted IDs while this editor is mounted. Undo
            // may restore them, and segment IDs are stable, so retaining the
            // mapping restores the exact merged block without affecting new
            // segments.
            for (const segment of currentSegments) {
                if (!mergeGroupBySegmentId.has(segment.id)) {
                    mergeGroupBySegmentId.set(segment.id, segment.id);
                }
            }
        },
        { immediate: true, flush: "sync" },
    );

    const blocks = computed<EditorLaneBlock[]>(() => {
        if (toValue(mergeSegments)) {
            const groups = new Map<string, StoredSegment[]>();
            for (const segment of toValue(segments)) {
                const groupId =
                    mergeGroupBySegmentId.get(segment.id) ?? segment.id;
                const entries = groups.get(groupId) ?? [];
                entries.push(segment);
                groups.set(groupId, entries);
            }
            return Array.from(groups, ([id, groupSegments]) => {
                const sorted = [...groupSegments].sort(
                    (left, right) => left.start - right.start,
                );
                const first = sorted[0] as StoredSegment;
                const last = sorted[sorted.length - 1] as StoredSegment;
                return {
                    id,
                    speaker: first.speaker ?? "unknown",
                    start: first.start,
                    end: last.end,
                    segments: sorted,
                };
            }).sort((left, right) => left.start - right.start);
        }

        const result: EditorLaneBlock[] = [];
        const turns = buildTranscriptTurns(toValue(segments), false);
        for (const turn of turns) {
            const first = turn.segments[0];
            const last = turn.segments[turn.segments.length - 1];
            if (!first || !last) {
                continue;
            }
            result.push({
                id: first.id,
                speaker: turn.speaker ?? "unknown",
                start: first.start,
                end: last.end,
                segments: turn.segments,
            });
        }
        return result;
    });

    /**
     * Looks up a lane block.
     *
     * @param blockId - Block id.
     * @returns The block, or `undefined` when it is gone.
     */
    function blockForId(blockId: string): EditorLaneBlock | undefined {
        return blocks.value.find((block) => block.id === blockId);
    }

    // currently playing block and speaker — drive the lane highlight
    const activeBlock = computed(() =>
        blocks.value.find(
            (block) =>
                toValue(currentTime) >= block.start &&
                toValue(currentTime) < block.end,
        ),
    );
    const activeSpeaker = computed(() => activeBlock.value?.speaker);

    return {
        segmentsBySpeaker,
        timelineDuration,
        blocks,
        blockForId,
        activeBlock,
        activeSpeaker,
    };
}
