import type { Rect } from "konva/lib/shapes/Rect";
import type { ShallowRef } from "vue";
import type {
    EditorLaneBlock,
    EditorLaneCanvasProps,
} from "~/types/editorTimeline";
import { clamp, clamp01 } from "~/utils/math";
import { formatTime } from "~/utils/time";

const LANE_HEIGHT = 44;
const PREFERRED_BLOCK_WIDTH = 14;
const BLOCK_GAP = 1.5;
const RULER_LABEL_WIDTH = 56;
const MIN_BLOCK_SECONDS = 0.2;

interface SelectionState {
    selectedBlockId: Ref<string | undefined>;
    selectedRect: ShallowRef<Rect | undefined>;
    dragPreview: Ref<DragPreview | undefined>;
    hoveredBlockId: Ref<string | undefined>;
}

interface DragPreview {
    blockId: string;
    targetSpeaker?: string;
    allowed: boolean;
    x: number;
    y: number;
}

interface BlockGeometry {
    x: number;
    width: number;
    hasOverlap: boolean;
}

/*
    Pure geometry and derived layout for the lane canvas: where every block
    sits, how the ruler is ticked, and the time<->pixel conversions. Reads the
    interaction state (selection, drag preview, hover) so the shapes reflect
    what the user is doing, but never mutates it.
*/
export function useLaneTimeline(
    props: EditorLaneCanvasProps,
    zoom: Ref<number>,
    baseTrackWidth: Ref<number>,
    selection: SelectionState,
    theme: { primary: string; background: string },
) {
    const { selectedBlockId, selectedRect, dragPreview, hoveredBlockId } =
        selection;

    const trackWidth = computed(() =>
        Math.max(baseTrackWidth.value * zoom.value, 56),
    );
    const lanesHeight = computed(() => props.speakers.ids.length * LANE_HEIGHT);
    const innerWidth = computed(
        () => props.viewport.labelWidth + trackWidth.value,
    );
    const playheadX = computed(() => timeToX(props.timeline.currentTime));
    const chipHalfWidth = computed(
        () =>
            formatTime(props.timeline.currentTime, { milliseconds: false })
                .length *
                3 +
            7,
    );
    const chipX = computed(() =>
        Math.min(
            Math.max(playheadX.value, 0),
            Math.max(trackWidth.value - chipHalfWidth.value, 0),
        ),
    );

    const blocksBySpeaker = computed(() => {
        const map = new Map<string, EditorLaneBlock[]>();
        for (const speaker of props.speakers.ids) {
            map.set(speaker, []);
        }
        for (const block of props.blocks) {
            map.get(block.speaker)?.push(block);
        }
        for (const blocks of map.values()) {
            blocks.sort((a, b) => a.start - b.start);
        }
        return map;
    });

    const rulerTicks = computed(() => {
        if (props.timeline.duration <= 0) {
            return [];
        }
        const rawStep = props.timeline.duration / Math.max(8 * zoom.value, 1);
        const steps = [1, 2, 5, 10, 15, 30, 60, 120, 300, 600, 900, 1800];
        const step = steps.find((candidate) => candidate >= rawStep) ?? 3600;
        const ticks: {
            time: number;
            x: number;
            labelX: number;
            label: string;
        }[] = [];
        for (let time = step; time < props.timeline.duration; time += step) {
            const x = timeToX(time);
            ticks.push({
                time,
                x,
                labelX: Math.min(
                    Math.max(x - RULER_LABEL_WIDTH / 2, 0),
                    Math.max(trackWidth.value - RULER_LABEL_WIDTH, 0),
                ),
                label: `${formatTime(time, { milliseconds: false })}s`,
            });
        }
        return ticks;
    });

    const speakerLane = computed(
        () =>
            new Map(
                props.speakers.ids.map((speaker, index) => [speaker, index]),
            ),
    );

    const blockConfigs = computed(() =>
        props.blocks.map((block) => {
            const speakerIndex = speakerLane.value.get(block.speaker) ?? 0;
            const geometry = blockGeometry(block);
            const speakerColor =
                props.speakers.colors[block.speaker] ?? theme.primary;
            const selected = selectedBlockId.value === block.id;
            const hovered = hoveredBlockId.value === block.id;
            const active = props.active.blockId === block.id;
            const movingToAnotherLane =
                dragPreview.value?.blockId === block.id &&
                dragPreview.value.targetSpeaker;
            const preview =
                dragPreview.value?.blockId === block.id
                    ? dragPreview.value
                    : undefined;
            const fill = selected
                ? speakerColor
                : withAlpha(
                      speakerColor,
                      movingToAnotherLane
                          ? 0.08
                          : hovered
                            ? 0.3
                            : active
                              ? 0.28
                              : 0.15,
                  );
            const stroke =
                selected || hovered || active
                    ? speakerColor
                    : withAlpha(speakerColor, 0.4);
            return {
                id: `lane-block-${block.id}`,
                x: geometry.x,
                y: preview?.y ?? speakerIndex * LANE_HEIGHT + 8,
                width: geometry.width,
                height: LANE_HEIGHT - 16,
                cornerRadius: 7,
                fill,
                stroke,
                strokeWidth: 1,
                hitStrokeWidth: 12,
                draggable: true,
                dragBoundFunc: (position: { x: number; y: number }) =>
                    boundDrag(block, position),
            };
        }),
    );

    const transformerConfig = computed(() => ({
        nodes: selectedRect.value ? [selectedRect.value] : [],
        enabledAnchors: ["middle-left", "middle-right"],
        rotateEnabled: false,
        flipEnabled: false,
        borderEnabled: false,
        anchorStroke: theme.primary,
        anchorFill: theme.background,
        anchorSize: 8,
        anchorCornerRadius: 4,
        keepRatio: false,
        ignoreStroke: true,
        boundBoxFunc: (
            oldBox: { x: number; width: number },
            newBox: { x: number; width: number },
        ) => boundResize(oldBox, newBox),
    }));

    /**
     * Converts a playback time to a canvas x coordinate.
     *
     * @param seconds - Time in seconds.
     * @returns The x coordinate.
     */
    function timeToX(seconds: number): number {
        if (props.timeline.duration <= 0) {
            return 0;
        }
        return (seconds / props.timeline.duration) * trackWidth.value;
    }

    /**
     * Converts a canvas x coordinate to a playback time.
     *
     * @param x - The x coordinate.
     * @returns Time in seconds, clamped to the media duration.
     */
    function xToTime(x: number): number {
        if (trackWidth.value <= 0 || props.timeline.duration <= 0) {
            return 0;
        }
        return clamp01(x / trackWidth.value) * props.timeline.duration;
    }

    /**
     * Applies an alpha channel to a hex or `rgb()` color.
     *
     * @param color - The source color.
     * @param alpha - Alpha between 0 and 1.
     * @returns The color as `rgba(...)`.
     */
    function withAlpha(color: string, alpha: number): string {
        const hex = color.match(/^#([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i);
        if (hex) {
            return `rgba(${Number.parseInt(hex[1] ?? "0", 16)}, ${Number.parseInt(hex[2] ?? "0", 16)}, ${Number.parseInt(hex[3] ?? "0", 16)}, ${alpha})`;
        }
        const channels = color.match(
            /^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/,
        );
        if (!channels) {
            return color;
        }
        return `rgba(${channels[1]}, ${channels[2]}, ${channels[3]}, ${alpha})`;
    }

    /**
     * Canvas geometry of a block, preferring the live drag preview.
     *
     * @param block - The block to place.
     * @returns Position and size in canvas pixels.
     */
    function blockGeometry(block: EditorLaneBlock): BlockGeometry {
        const preview =
            dragPreview.value?.blockId === block.id
                ? dragPreview.value
                : undefined;
        const x = preview?.x ?? timeToX(block.start);
        const duration = Math.max(block.end - block.start, 0);
        const start = xToTime(x);
        const end = start + duration;
        const speaker = preview?.targetSpeaker ?? block.speaker;
        const otherBlocks = blocksBySpeaker.value.get(speaker) ?? [];
        const hasOverlap = otherBlocks.some(
            (other) =>
                other.id !== block.id && other.start < end && other.end > start,
        );
        const actualWidth = Math.max(timeToX(duration), Number.EPSILON);

        if (selectedBlockId.value === block.id || preview || hasOverlap) {
            return { x, width: actualWidth, hasOverlap };
        }

        const next = otherBlocks.find(
            (other) => other.id !== block.id && other.start >= end,
        );
        const rightLimit = next ? timeToX(next.start) : trackWidth.value;
        const freePixels = Math.max(rightLimit - (x + actualWidth), 0);
        const gap = Math.min(BLOCK_GAP, freePixels / 2);
        const availableWidth = Math.max(rightLimit - gap - x, actualWidth);

        return {
            x,
            width: Math.min(
                Math.max(actualWidth, PREFERRED_BLOCK_WIDTH),
                availableWidth,
            ),
            hasOverlap,
        };
    }

    /**
     * How far a block may grow before it hits its lane neighbours.
     *
     * @param block - The block being edited.
     * @returns The earliest start and latest end it may take.
     */
    function laneBounds(block: EditorLaneBlock): {
        minStart: number;
        maxEnd: number;
    } {
        let minStart = 0;
        let maxEnd = props.timeline.duration;
        for (const other of blocksBySpeaker.value.get(block.speaker) ?? []) {
            if (other.id === block.id) {
                continue;
            }
            if (other.end <= block.start) {
                minStart = Math.max(minStart, other.end);
            }
            if (other.start >= block.end) {
                maxEnd = Math.min(maxEnd, other.start);
            }
        }
        return { minStart, maxEnd };
    }

    /**
     * Whether a time range in a lane is free.
     *
     * @param speaker - Lane to check.
     * @param start - Range start in seconds.
     * @param end - Range end in seconds.
     * @param ignoredBlockId - Block to ignore, usually the dragged one.
     * @returns `true` when nothing overlaps.
     */
    function slotFree(
        speaker: string,
        start: number,
        end: number,
        ignoredBlockId: string,
    ): boolean {
        return (blocksBySpeaker.value.get(speaker) ?? []).every(
            (block) =>
                block.id === ignoredBlockId ||
                block.start >= end ||
                block.end <= start,
        );
    }

    /**
     * Constrains a drag to valid lanes and free time slots.
     *
     * @param block - The dragged block.
     * @param position - The proposed canvas position.
     * @returns The allowed position.
     */
    function boundDrag(
        block: EditorLaneBlock,
        position: { x: number; y: number },
    ): { x: number; y: number } {
        const sourceIndex = props.speakers.ids.indexOf(block.speaker);
        const targetIndex = Math.min(
            Math.max(Math.round((position.y - 8) / LANE_HEIGHT), 0),
            Math.max(props.speakers.ids.length - 1, 0),
        );
        const targetSpeaker = props.speakers.ids[targetIndex] ?? block.speaker;
        const blockWidth = timeToX(block.end - block.start);

        if (targetSpeaker !== block.speaker) {
            const allowed = slotFree(
                targetSpeaker,
                block.start,
                block.end,
                block.id,
            );
            const bounded = {
                x: timeToX(block.start),
                y: targetIndex * LANE_HEIGHT + 8,
            };
            dragPreview.value = {
                blockId: block.id,
                targetSpeaker,
                allowed,
                ...bounded,
            };
            return bounded;
        }

        const { minStart, maxEnd } = laneBounds(block);
        const minX = timeToX(minStart);
        const maxX = Math.max(timeToX(maxEnd) - blockWidth, minX);
        const bounded = {
            x: clamp(position.x, minX, maxX),
            y: sourceIndex * LANE_HEIGHT + 8,
        };
        dragPreview.value = {
            blockId: block.id,
            allowed: true,
            ...bounded,
        };
        return bounded;
    }

    /**
     * Constrains a resize to the block's lane bounds and a minimum width.
     *
     * @param oldBox - Box before the resize step.
     * @param newBox - Proposed box.
     * @returns The allowed box.
     */
    function boundResize(
        oldBox: { x: number; width: number },
        newBox: { x: number; width: number },
    ): { x: number; width: number } {
        const block = selectedBlockId.value
            ? blockForId(selectedBlockId.value)
            : undefined;
        if (!block) {
            return oldBox;
        }
        const { minStart, maxEnd } = laneBounds(block);
        const firstEnd = block.segments[0]?.end ?? block.end;
        const lastStart =
            block.segments[block.segments.length - 1]?.start ?? block.start;
        const minX = timeToX(minStart);
        const maxX = timeToX(maxEnd);
        const minWidth = Math.max(timeToX(MIN_BLOCK_SECONDS), 3);
        const leftLimit = timeToX(firstEnd) - minWidth;
        const rightLimit = timeToX(lastStart) + minWidth;
        const x = Math.min(Math.max(newBox.x, minX), leftLimit);
        const right = Math.max(
            Math.min(newBox.x + newBox.width, maxX),
            rightLimit,
        );
        if (right - x < minWidth) {
            return oldBox;
        }
        return { ...newBox, x, width: right - x };
    }

    /**
     * Looks up a block by id.
     *
     * @param blockId - Block id.
     * @returns The block, or `undefined`.
     */
    function blockForId(blockId: string): EditorLaneBlock | undefined {
        return props.blocks.find((block) => block.id === blockId);
    }

    return {
        trackWidth,
        lanesHeight,
        innerWidth,
        playheadX,
        chipX,
        rulerTicks,
        blocksBySpeaker,
        speakerLane,
        blockConfigs,
        transformerConfig,
        timeToX,
        xToTime,
        laneBounds,
        slotFree,
        blockForId,
    };
}
