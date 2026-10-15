<script setup lang="ts">
import { onClickOutside, useLocalStorage } from "@vueuse/core";
import type { EditorLaneBlock, EditorLaneContextMenu } from "~/types/editorTimeline";
import type { StoredSegment } from "~/types/storedSegments";
import type { StoredTranscription } from "~/types/storedTranscription";
import { clamp } from "~/utils/math";

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
const { renameSpeaker } = useSpeakerRename(
    () => props.transcription.id,
    () => props.segments,
);
const { speakerIds: speakers, displayName, speakerColors, addSpeaker } =
    useSpeakerRegistry();

const {
    segmentsBySpeaker,
    timelineDuration,
    blocks,
    blockForId,
    activeBlock,
    activeSpeaker,
} = useLaneBlocks(
    () => props.segments,
    () => props.mergeSegments,
    () => props.duration,
    () => props.currentTime,
);

const commands = useLaneCommands(
    blocks,
    segmentsBySpeaker,
    (seconds) => emit("seek", seconds),
);

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
    if (!block) {
        return;
    }
    await commands.moveBlockTo(block, target);
}

/**
 * Whether the menu entry for a target lane should be disabled.
 *
 * @param target - Target speaker id.
 * @returns `true` when the block cannot be moved there.
 */
function blockMenuDisabledFor(target: string): boolean {
    const block = blockMenu.value?.block;
    return block ? !commands.canMoveBlockTo(block, target) : false;
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
    await commands.moveSegmentsTo(source, target);
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
    commands.requestDeleteSpeaker(speaker, t);
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
            :speakers="{ ids: speakers, colors: speakerColors }"
            :blocks="blocks"
            :timeline="{
                duration: timelineDuration,
                currentTime: props.currentTime,
            }"
            :viewport="{
                height: props.viewportHeight ?? 4 * 44 + 27,
                labelWidth,
            }"
            :active="{
                blockId: activeBlock?.id,
                speaker: activeSpeaker,
                autoScroll: props.autoScroll,
            }"
            @seek="emit('seek', $event)"
            @change="commands.applyLaneChange"
            @contextmenu="openBlockMenu"
            @delete="commands.deleteBlock"
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
                        @click.stop="commands.jumpToNext(speaker, props.currentTime)"
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
