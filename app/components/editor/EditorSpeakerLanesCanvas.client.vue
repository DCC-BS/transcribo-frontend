<script setup lang="ts">
import { onClickOutside } from "@vueuse/core";
import type { KonvaEventObject } from "konva/lib/Node";
import type { Stage } from "konva/lib/Stage";
import type { Rect } from "konva/lib/shapes/Rect";
import type { Transformer } from "konva/lib/shapes/Transformer";
import type {
    EditorLaneBlock,
    EditorLaneCanvasProps,
    EditorLaneChange,
    EditorLaneContextMenu,
} from "~/types/editorTimeline";
import { formatTime } from "~/utils/time";

interface KonvaComponent<T> {
    getNode(): T;
}

interface DragPreview {
    blockId: string;
    targetSpeaker?: string;
    allowed: boolean;
    x: number;
    y: number;
}

const props = defineProps<EditorLaneCanvasProps>();

const zoom = defineModel<number>("zoom", { required: true });

const emit = defineEmits<{
    seek: [seconds: number];
    change: [change: EditorLaneChange];
    contextmenu: [menu: EditorLaneContextMenu];
    delete: [blockId: string];
}>();

const viewport = ref<HTMLElement>();
const rulerStage = ref<KonvaComponent<Stage>>();
const transformer = ref<KonvaComponent<Transformer>>();
const rulerBar = ref<HTMLElement>();

const baseTrackWidth = ref(250);
const selectedBlockId = ref<string>();
const selectedRect = shallowRef<Rect>();
const dragPreview = ref<DragPreview>();
const hoveredBlockId = ref<string>();

const { theme, readTheme } = useLaneTheme();
const timeline = useLaneTimeline(
    props,
    zoom,
    baseTrackWidth,
    { selectedBlockId, selectedRect, dragPreview, hoveredBlockId },
    theme,
);
const { updateWidth, onWheel } = useLaneViewport(
    props,
    zoom,
    (seconds) => emit("seek", seconds),
    viewport,
    rulerBar,
    baseTrackWidth,
    timeline,
);
const interaction = useLaneInteraction(
    props,
    (seconds) => emit("seek", seconds),
    (change) => emit("change", change),
    (blockId) => emit("delete", blockId),
    transformer,
    timeline,
    { selectedBlockId, selectedRect, dragPreview, hoveredBlockId },
);

const {
    trackWidth,
    lanesHeight,
    innerWidth,
    playheadX,
    chipX,
    rulerTicks,
    blockConfigs,
    transformerConfig,
} = timeline;

onMounted(() => {
    readTheme();
    updateWidth();
});

onBeforeUnmount(() => interaction.clearDragCommitTimeout());

onClickOutside(viewport, interaction.clearSelectedBlock);

/**
 * Drag the HTML time chip along the ruler to seek.
 *
 * @param event - The pointer event starting the drag.
 */
function beginChipDrag(event: PointerEvent): void {
    const bar = rulerBar.value;
    if (!bar) {
        return;
    }
    event.preventDefault();
    const rect = bar.getBoundingClientRect();
    const seekAt = (e: PointerEvent) => {
        const x = Math.min(
            Math.max(
                e.clientX - rect.left - props.viewport.labelWidth,
                0,
            ),
            trackWidth.value,
        );
        emit("seek", timeline.xToTime(x));
    };
    seekAt(event);
    const move = (e: PointerEvent) => seekAt(e);
    window.addEventListener("pointermove", move);
    window.addEventListener(
        "pointerup",
        () => window.removeEventListener("pointermove", move),
        { once: true },
    );
}

/**
 * Seeks when the user clicks empty canvas.
 *
 * @param event - The Konva click event.
 */
function seekFromStage(event: KonvaEventObject<MouseEvent>): void {
    interaction.clearSelectedBlock();
    if (event.target !== event.currentTarget) {
        return;
    }
    const pointer = event.currentTarget.getStage()?.getPointerPosition();
    if (pointer) {
        emit("seek", timeline.xToTime(pointer.x));
    }
}

/**
 * Seeks when the user clicks the time ruler.
 *
 * @param _event - The Konva click event; the pointer is read from the stage.
 */
function seekFromRuler(_event: KonvaEventObject<MouseEvent>): void {
    interaction.clearSelectedBlock();
    const stage = rulerStage.value?.getNode();
    const pointer = stage?.getPointerPosition();
    if (pointer) {
        emit("seek", timeline.xToTime(pointer.x));
    }
}

/**
 * Emits the block context menu request at the pointer position.
 *
 * @param block - The block under the pointer.
 * @param event - The Konva pointer event.
 */
function openContextMenu(
    block: EditorLaneBlock,
    event: KonvaEventObject<PointerEvent>,
): void {
    event.evt.preventDefault();
    emit("contextmenu", {
        blockId: block.id,
        x: event.evt.clientX,
        y: event.evt.clientY,
    });
}

/**
 * Clears the selection when the pointer goes down outside the canvas.
 *
 * @param event - The pointer event.
 */
function onViewportPointerDown(event: PointerEvent): void {
    if (!(event.target instanceof HTMLCanvasElement)) {
        interaction.clearSelectedBlock();
    }
}
</script>

<template>
    <div
        ref="viewport"
        class="relative overflow-auto bg-muted"
        :style="{ maxHeight: `${props.viewport.height}px` }"
        @pointerdown.capture="onViewportPointerDown"
        @wheel="onWheel"
    >
        <div
            class="relative bg-default"
            :style="{ width: `${innerWidth}px` }"
        >
            <div class="relative" :style="{ height: `${lanesHeight}px` }">
                <ClientOnly>
                    <v-stage
                        class="absolute top-0"
                        :style="{ left: `${props.viewport.labelWidth}px` }"
                        :config="{
                            width: trackWidth,
                            height: lanesHeight,
                        }"
                        @click="interaction.clearSelection"
                    >
                        <v-layer>
                            <template
                                v-for="(speaker, index) in props.speakers.ids"
                                :key="speaker"
                            >
                                <v-rect
                                    :config="{
                                        x: 0,
                                        y: index * 44,
                                        width: trackWidth,
                                        height: 44,
                                        fill:
                                            index % 2 === 0
                                                ? theme.muted
                                                : theme.background,
                                        stroke: theme.border,
                                        strokeWidth: 1,
                                    }"
                                    @click="seekFromStage"
                                />
                                <v-rect
                                    v-if="
                                        dragPreview?.targetSpeaker === speaker
                                    "
                                    :config="{
                                        x: 0,
                                        y: index * 44 + 1,
                                        width: trackWidth,
                                        height: 42,
                                        stroke: dragPreview.allowed
                                            ? theme.primary
                                            : theme.error,
                                        strokeWidth: 2,
                                        dash: [5, 4],
                                    }"
                                />
                            </template>

                            <v-rect
                                v-for="(config, index) in blockConfigs"
                                :key="props.blocks[index]?.id"
                                :config="config"
                                @click="
                                    props.blocks[index] &&
                                    interaction.selectBlock(
                                        props.blocks[index],
                                        $event,
                                    )
                                "
                                @mouseenter="
                                    hoveredBlockId = props.blocks[index]?.id
                                "
                                @mouseleave="hoveredBlockId = undefined"
                                @dragend="
                                    props.blocks[index] &&
                                    interaction.onBlockDragEnd(
                                        props.blocks[index],
                                        $event,
                                    )
                                "
                                @transformend="
                                    props.blocks[index] &&
                                    interaction.onTransformEnd(
                                        props.blocks[index],
                                    )
                                "
                                @contextmenu="
                                    props.blocks[index] &&
                                    openContextMenu(
                                        props.blocks[index],
                                        $event,
                                    )
                                "
                            />

                            <v-line
                                :config="{
                                    points: [
                                        playheadX,
                                        0,
                                        playheadX,
                                        lanesHeight,
                                    ],
                                    stroke: theme.text,
                                    strokeWidth: 1,
                                    listening: false,
                                }"
                            />
                        </v-layer>
                        <v-layer>
                            <v-transformer
                                ref="transformer"
                                :config="transformerConfig"
                            />
                        </v-layer>
                    </v-stage>
                </ClientOnly>

                <div
                    v-for="speaker in props.speakers.ids"
                    :key="speaker"
                    data-speaker-lane-label
                    :data-lane="speaker"
                    class="sticky left-0 z-5 flex h-11 flex-none items-center border-r border-b border-default bg-default"
                    :style="{ width: `${props.viewport.labelWidth}px` }"
                >
                    <slot name="speaker" :speaker="speaker" />
                </div>
            </div>

            <div
                ref="rulerBar"
                class="sticky bottom-0 z-11 flex h-6.75 border-t border-default bg-default"
            >
                <div
                    class="sticky left-0 z-7 h-6.75 flex-none bg-default"
                    :style="{ width: `${props.viewport.labelWidth}px` }"
                />
                <ClientOnly>
                    <v-stage
                        ref="rulerStage"
                        :config="{ width: trackWidth, height: 27 }"
                        @click="seekFromRuler"
                    >
                        <v-layer>
                            <template
                                v-for="tick in rulerTicks"
                                :key="tick.time"
                            >
                                <v-line
                                    :config="{
                                        points: [tick.x, 0, tick.x, 5],
                                        stroke: theme.border,
                                        strokeWidth: 1,
                                    }"
                                />
                                <v-text
                                    :config="{
                                        x: tick.labelX,
                                        y: 7,
                                        width: 56,
                                        text: tick.label,
                                        align: 'center',
                                        fontSize: 11,
                                        fill: theme.dimmed,
                                        listening: false,
                                    }"
                                />
                            </template>
                            <v-line
                                :config="{
                                    points: [playheadX, 0, playheadX, 27],
                                    stroke: theme.text,
                                    strokeWidth: 1,
                                    listening: false,
                                }"
                            />
                        </v-layer>
                    </v-stage>
                </ClientOnly>

                <!-- time chip straddling the line between the lanes and the
                     ruler, triangle pointing up to the playhead -->
                <div
                    class="absolute -top-3 z-11 flex -translate-x-1/2 cursor-grab active:cursor-grabbing touch-none select-none flex-col items-center"
                    :style="{
                        left: `${props.viewport.labelWidth + chipX}px`,
                    }"
                    @pointerdown="beginChipDrag"
                >
                    <div
                        class="size-0 border-x-5 border-b-5 border-x-transparent"
                        :style="{ borderBottomColor: theme.text }"
                    />
                    <div
                        class="rounded-[5px] px-1.5 py-0.5 text-[10px] font-bold leading-[14px]"
                        :style="{
                            background: theme.text,
                            color: theme.background,
                        }"
                    >
                        {{
                            formatTime(props.timeline.currentTime, {
                                milliseconds: false,
                            })
                        }}
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
