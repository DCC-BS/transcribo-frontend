<script setup lang="ts">
import { onClickOutside, useLocalStorage } from "@vueuse/core";
import {
    DeleteSegmentsCommand,
    UpdateSegmentCommand,
    UpdateSegmentsCommand,
} from "~/types/commands";
import type {
    EditorLaneBlock,
    EditorLaneChange,
    EditorLaneContextMenu,
} from "~/types/editorTimeline";
import type { StoredSegment } from "~/types/storedSegments";
import type { StoredTranscription } from "~/types/storedTranscription";
import { describeLaneChange, laneAcceptsBlock } from "~/utils/laneGeometry";
import { clamp } from "~/utils/math";
import { buildTranscriptTurns } from "~/utils/tiptapTranscript";

const props = defineProps<{
    transcription: StoredTranscription;
    segments: StoredSegment[];
    currentTime: number;
    duration: number;
    mergeSegments?: boolean;
    viewportHeight?: number;
    /** Scroll the active speaker's lane into view while playing. */
    autoScroll?: boolean;
}>();

const zoom = defineModel<number>("zoom", { required: true });
const emit = defineEmits<(event: "seek", seconds: number) => void>();

const { t } = useI18n();
const { executeCommand } = useCommandBus();
const { openDialog } = useDialog();
const { renameSpeaker } = useSpeakerRename(
    () => props.transcription.id,
    () => props.segments,
);

const {
    speakerIds: speakers,
    displayName,
    speakerColors,
    addSpeaker,
    removeEmptySpeaker,
} = useSpeakerRegistry();

// --- resizable speaker column (drag the split next to the lane track) -------

const LABEL_WIDTH_MIN = 128;
const LABEL_WIDTH_MAX = 400;
const labelWidth = useLocalStorage<number>("editor-lanes-label-width", 190);

/**
 * Starts a pointer drag that resizes the speaker label column.
 *
 * @param event - The pointer event starting the drag.
 */
function beginLabelResize(event: PointerEvent): void {
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = labelWidth.value;
    const move = (ev: PointerEvent) => {
        labelWidth.value = Math.min(
            Math.max(startWidth + (ev.clientX - startX), LABEL_WIDTH_MIN),
            LABEL_WIDTH_MAX,
        );
    };
    window.addEventListener("pointermove", move);
    window.addEventListener(
        "pointerup",
        () => window.removeEventListener("pointermove", move),
        { once: true },
    );
}

const segmentsBySpeaker = computed(() => {
    const map = new Map<string, StoredSegment[]>();
    for (const segment of props.segments) {
        const speaker = segment.speaker ?? "unknown";
        const entries = map.get(speaker) ?? [];
        entries.push(segment);
        map.set(speaker, entries);
    }
    return map;
});

const timelineDuration = computed(() =>
    props.segments.reduce(
        (latestEnd, segment) => Math.max(latestEnd, segment.end),
        props.duration,
    ),
);

// A merged block must keep its members when it moves across other speakers in
// time. Rebuilding turns solely from chronological order would split that block
// as soon as another speaker falls between two of its member segments.
const mergeGroupBySegmentId = new Map<string, string>();

/**
 * Rebuilds the segment-to-turn mapping so lane blocks match the merged turns shown in the document editor.
 */
function initializeMergeGroups(): void {
    mergeGroupBySegmentId.clear();
    for (const turn of buildTranscriptTurns(props.segments, true)) {
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
    [() => props.segments, () => props.mergeSegments],
    ([segments, merged], [, previousMerged]) => {
        if (!merged) {
            mergeGroupBySegmentId.clear();
            return;
        }
        if (!previousMerged || mergeGroupBySegmentId.size === 0) {
            initializeMergeGroups();
            return;
        }
        // Keep mappings for deleted IDs while this editor is mounted. Undo may
        // restore them, and segment IDs are stable, so retaining the mapping
        // restores the exact merged block without affecting new segments.
        for (const segment of segments) {
            if (!mergeGroupBySegmentId.has(segment.id)) {
                mergeGroupBySegmentId.set(segment.id, segment.id);
            }
        }
    },
    { immediate: true, flush: "sync" },
);

const blocks = computed<EditorLaneBlock[]>(() => {
    if (props.mergeSegments) {
        const groups = new Map<string, StoredSegment[]>();
        for (const segment of props.segments) {
            const groupId = mergeGroupBySegmentId.get(segment.id) ?? segment.id;
            const entries = groups.get(groupId) ?? [];
            entries.push(segment);
            groups.set(groupId, entries);
        }
        return Array.from(groups, ([id, segments]) => {
            const sorted = [...segments].sort(
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
    const turns = buildTranscriptTurns(props.segments, false);
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
            props.currentTime >= block.start && props.currentTime < block.end,
    ),
);
const activeSpeaker = computed(() => activeBlock.value?.speaker);

// Delete key on a selected block: remove every segment it holds (one in
// unmerged mode, the whole merged run otherwise).
/**
 * Deletes a whole lane block as one undoable command.
 *
 * @param blockId - Block to delete.
 */
async function deleteBlock(blockId: string): Promise<void> {
    const block = blockForId(blockId);
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
    const block = blockForId(change.blockId);
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

    const updates: ConstructorParameters<typeof UpdateSegmentsCommand>[0] = [];
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

// Jump per block, not per segment: with merging on, a merged run counts as
// one stop and the jump lands on its first timestamp.
/**
 * Seeks to the speaker's next block after the playhead, wrapping to their first one.
 *
 * @param speaker - Speaker id.
 */
function jumpToNext(speaker: string): void {
    const sorted = blocks.value
        .filter((block) => block.speaker === speaker)
        .sort((left, right) => left.start - right.start);
    const next =
        sorted.find((block) => block.start > props.currentTime + 0.05) ??
        sorted[0];
    if (next) {
        emit("seek", next.start);
    }
}

/**
 * Keeps a context menu inside the viewport.
 *
 * @param x - Desired client x.
 * @param y - Desired client y.
 * @returns The clamped position.
 */
function clampMenuPosition(x: number, y: number): { x: number; y: number } {
    const menuWidth = 248;
    const menuHeight = 290;
    return {
        x: clamp(x, 8, window.innerWidth - menuWidth),
        y: clamp(y, 8, window.innerHeight - menuHeight),
    };
}

const blockMenu = ref<{
    block: EditorLaneBlock;
    x: number;
    y: number;
}>();

/**
 * Opens the context menu for a lane block.
 *
 * @param menu - Block id and pointer position from the canvas.
 */
function openBlockMenu(menu: EditorLaneContextMenu): void {
    const block = blockForId(menu.blockId);
    if (!block) {
        return;
    }
    blockMenu.value = {
        block,
        ...clampMenuPosition(menu.x, menu.y),
    };
}

/**
 * Moves the block from the open menu to another speaker lane.
 *
 * @param target - Target speaker id.
 */
async function moveBlockTo(target: string): Promise<void> {
    const block = blockMenu.value?.block;
    blockMenu.value = undefined;
    if (
        !block ||
        target === block.speaker ||
        !canMoveBlockTo(block, target)
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
 * Whether the menu entry for a target lane should be disabled.
 *
 * @param target - Target speaker id.
 * @returns `true` when the block cannot be moved there.
 */
function blockMenuDisabledFor(target: string): boolean {
    const block = blockMenu.value?.block;
    return block ? !canMoveBlockTo(block, target) : false;
}

const laneMenu = ref<{ speaker: string; x: number; y: number }>();

/**
 * Toggles the context menu of a speaker lane.
 *
 * @param speaker - Speaker id.
 * @param event - The click event, used to position the menu.
 */
function openLaneMenu(speaker: string, event: MouseEvent): void {
    if (laneMenu.value?.speaker === speaker) {
        laneMenu.value = undefined;
        return;
    }
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    laneMenu.value = {
        speaker,
        ...clampMenuPosition(rect.right + 4, rect.top),
    };
}

/**
 * Merges all segments of the menu's speaker into another speaker.
 *
 * @param target - Speaker to merge into.
 */
async function moveSegmentsTo(target: string): Promise<void> {
    const source = laneMenu.value?.speaker;
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
    laneMenu.value = undefined;
}

/**
 * Asks for confirmation before deleting a speaker's segments.
 */
function requestDeleteSpeaker(): void {
    const speaker = laneMenu.value?.speaker;
    laneMenu.value = undefined;
    if (!speaker) {
        return;
    }
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

const editingSpeaker = ref<string>();
const editName = ref("");
const renameInput = ref<HTMLInputElement>();

/**
 * Opens the inline rename field for a speaker.
 *
 * @param speaker - Speaker id.
 */
function startRename(speaker: string): void {
    editingSpeaker.value = speaker;
    editName.value = displayName(speaker);
    nextTick(() => {
        renameInput.value?.focus();
        renameInput.value?.select();
    });
}

/**
 * Persists the inline rename; blank names are discarded.
 */
async function commitRename(): Promise<void> {
    const speakerId = editingSpeaker.value;
    const renamed = editName.value.trim();
    editingSpeaker.value = undefined;
    if (!speakerId || !renamed) {
        return;
    }
    await renameSpeaker(speakerId, displayName(speakerId), renamed);
}

const addSpeakerOpen = ref(false);
const addSpeakerName = ref("");
const addSpeakerElement = ref<HTMLElement>();
onClickOutside(addSpeakerElement, () => {
    addSpeakerOpen.value = false;
});

/**
 * Toggles the "add speaker" field and focuses it when opening.
 */
function toggleAddSpeaker(): void {
    addSpeakerName.value = "";
    addSpeakerOpen.value = !addSpeakerOpen.value;
    if (addSpeakerOpen.value) {
        nextTick(() =>
            addSpeakerElement.value?.querySelector("input")?.focus(),
        );
    }
}

/**
 * Closes the "add speaker" field.
 */
function closeAddSpeaker(): void {
    addSpeakerOpen.value = false;
}

/**
 * Creates the entered speaker and closes the field on success.
 */
async function confirmAddSpeaker(): Promise<void> {
    if (await addSpeaker(addSpeakerName.value)) {
        addSpeakerOpen.value = false;
    }
}
</script>

<template>
    <div class="relative">
        <div
            class="relative flex items-stretch border-b border-default bg-default"
        >
            <div
                class="flex flex-none items-center justify-between border-r border-default py-0 pr-1.5 pl-3 text-[0.72rem] font-semibold uppercase tracking-wider text-muted"
                :style="{ width: `${labelWidth}px` }"
            >
                <span>{{ t("editor.lanes.speakers") }}</span>
                <div class="relative">
                    <button
                        type="button"
                        class="rounded-md p-0.5 text-dimmed hover:bg-elevated hover:text-default"
                        :title="t('editor.lanes.addSpeaker')"
                        @click.stop="toggleAddSpeaker"
                    >
                        <UIcon name="i-lucide-plus" class="size-4" />
                    </button>
                    <div
                        v-if="addSpeakerOpen"
                        ref="addSpeakerElement"
                        class="absolute top-7 left-0 z-90 w-60 rounded-xl border border-default bg-default p-1.5 text-[0.84rem] shadow-md"
                    >
                        <div class="flex items-center gap-1.5 p-1">
                            <UInput
                                v-model="addSpeakerName"
                                size="sm"
                                class="flex-1"
                                :placeholder="t('editor.lanes.addSpeakerPrompt')"
                                @keydown.enter="confirmAddSpeaker"
                                @keydown.escape="closeAddSpeaker"
                            />
                            <UButton
                                icon="i-lucide-check"
                                size="sm"
                                color="primary"
                                variant="soft"
                                :title="t('editor.lanes.addSpeaker')"
                                @click="confirmAddSpeaker"
                            />
                        </div>
                    </div>
                </div>
            </div>
            <div
                class="flex min-h-11.5 min-w-0 flex-1 flex-wrap items-center gap-2.5 px-3.5 py-1.25"
            >
                <slot name="toolbar" />
            </div>
        </div>

        <!-- drag handle on the split between the speaker column and the
             lane track; spans head row and lanes so it is easy to grab -->
        <div
            class="absolute inset-y-0 z-10 w-2 -translate-x-1/2 cursor-col-resize touch-none"
            :style="{ left: `${labelWidth}px` }"
            :title="t('editor.lanes.resizeSpeakerColumn')"
            @pointerdown="beginLabelResize"
        />

        <EditorSpeakerLanesCanvas
            v-model:zoom="zoom"
            :speakers="speakers"
            :label-width="labelWidth"
            :active-block-id="activeBlock?.id"
            :active-speaker="activeSpeaker"
            :auto-scroll="props.autoScroll"
            :blocks="blocks"
            :current-time="props.currentTime"
            :duration="timelineDuration"
            :viewport-height="props.viewportHeight ?? 4 * 44 + 27"
            :speaker-colors="speakerColors"
            @seek="emit('seek', $event)"
            @change="applyLaneChange"
            @contextmenu="openBlockMenu"
            @delete="deleteBlock"
        >
            <template #speaker="{ speaker }">
                <div
                    class="flex min-w-0 flex-1 items-center gap-2 py-0 pr-1.5 pl-2 text-[0.84rem]"
                >
                    <span
                        class="size-2.5 flex-none rounded-full transition-transform duration-300"
                        :class="{ 'scale-125': speaker === activeSpeaker }"
                        :style="{ background: speakerColors[speaker] }"
                    />
                    <input
                        v-if="editingSpeaker === speaker"
                        ref="renameInput"
                        v-model="editName"
                        class="min-w-0 flex-1 rounded-md border border-primary bg-default px-1 py-0.5 text-[0.84rem] outline-none"
                        @keydown.enter="commitRename"
                        @keydown.escape="editingSpeaker = undefined"
                        @blur="commitRename"
                    />
                    <button
                        v-else
                        type="button"
                        class="min-w-0 flex-1 cursor-text truncate rounded-md px-1 py-0.5 text-left transition-[font-weight,color] duration-300 hover:bg-elevated"
                        :class="{ 'font-semibold': speaker === activeSpeaker }"
                        :title="`${displayName(speaker)} — ${t('editor.lanes.rename')}`"
                        @click.stop="startRename(speaker)"
                    >
                        {{ displayName(speaker) }}
                    </button>
                    <button
                        type="button"
                        class="rounded-md p-0.5 text-dimmed hover:bg-elevated hover:text-default"
                        :title="t('editor.lanes.jumpToNext')"
                        @click.stop="jumpToNext(speaker)"
                    >
                        <UIcon name="i-lucide-step-forward" class="size-4" />
                    </button>
                    <button
                        type="button"
                        class="rounded-md p-0.5 text-dimmed hover:bg-elevated hover:text-default"
                        :title="t('editor.lanes.laneMenu')"
                        @click.stop="openLaneMenu(speaker, $event)"
                    >
                        <UIcon
                            name="i-lucide-more-vertical"
                            class="size-4"
                        />
                    </button>
                </div>
            </template>
        </EditorSpeakerLanesCanvas>

        <EditorSpeakerMoveMenu
            v-if="blockMenu"
            :x="blockMenu.x"
            :y="blockMenu.y"
            :current-speaker="blockMenu.block.speaker"
            :disabled-for="blockMenuDisabledFor"
            @select="moveBlockTo"
            @close="blockMenu = undefined"
        />

        <EditorSpeakerMoveMenu
            v-if="laneMenu"
            :x="laneMenu.x"
            :y="laneMenu.y"
            :current-speaker="laneMenu.speaker"
            deletable
            @select="moveSegmentsTo"
            @delete="requestDeleteSpeaker"
            @close="laneMenu = undefined"
        />
    </div>
</template>
