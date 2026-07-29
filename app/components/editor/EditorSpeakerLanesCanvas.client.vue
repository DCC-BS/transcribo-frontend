<script setup lang="ts">
import {
    onClickOutside,
    useEventListener,
    useResizeObserver,
} from "@vueuse/core";
import type { KonvaEventObject } from "konva/lib/Node";
import type { Rect } from "konva/lib/shapes/Rect";
import type { Transformer } from "konva/lib/shapes/Transformer";
import type {
    EditorLaneBlock,
    EditorLaneChange,
    EditorLaneContextMenu,
} from "~/types/editorTimeline";
import { clamp, clamp01 } from "~/utils/math";
import { formatTime } from "~/utils/time";

const LANE_HEIGHT = 44;
const RULER_HEIGHT = 27;
const MIN_BLOCK_SECONDS = 0.2;
const PREFERRED_BLOCK_WIDTH = 14;
const BLOCK_GAP = 1.5;
const RULER_LABEL_WIDTH = 56;
const ZOOM_MIN = 0.125;
const ZOOM_MAX = 8;

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

interface ZoomAnchor {
    time: number;
    screenX: number;
}

const props = defineProps<{
    speakers: string[];
    blocks: EditorLaneBlock[];
    currentTime: number;
    duration: number;
    viewportHeight: number;
    speakerColors: Record<string, string>;
    /** Width of the speaker label column, controlled by the parent. */
    labelWidth: number;
    /** Block currently under the playhead — rendered highlighted. */
    activeBlockId?: string;
    /** Speaker whose lane should remain visible during playback. */
    activeSpeaker?: string;
    autoScroll?: boolean;
}>();

const zoom = defineModel<number>("zoom", { required: true });

const emit = defineEmits<{
    seek: [seconds: number];
    change: [change: EditorLaneChange];
    contextmenu: [menu: EditorLaneContextMenu];
    delete: [blockId: string];
}>();

const viewport = ref<HTMLElement>();
const rulerStage = ref<KonvaComponent<import("konva/lib/Stage").Stage>>();
const transformer = ref<KonvaComponent<Transformer>>();
const baseTrackWidth = ref(250);
const selectedBlockId = ref<string>();
const selectedRect = shallowRef<Rect>();
const dragPreview = ref<DragPreview>();
let dragCommitTimeout: ReturnType<typeof setTimeout> | undefined;
const hoveredBlockId = ref<string>();
const zoomAnchor = ref<ZoomAnchor>();

const theme = reactive({
    background: "#ffffff",
    muted: "#f5f5f5",
    border: "#d4d4d4",
    text: "#171717",
    dimmed: "#737373",
    primary: "#673ab7",
    error: "#dc2626",
});

const trackWidth = computed(() =>
    Math.max(baseTrackWidth.value * zoom.value, 56),
);
const lanesHeight = computed(() => props.speakers.length * LANE_HEIGHT);
const innerWidth = computed(() => props.labelWidth + trackWidth.value);
const playheadX = computed(() => timeToX(props.currentTime));
const chipHalfWidth = computed(
    () =>
        formatTime(props.currentTime, { milliseconds: false }).length * 3 + 7,
);
const chipX = computed(() =>
    Math.min(
        Math.max(playheadX.value, 0),
        Math.max(trackWidth.value - chipHalfWidth.value, 0),
    ),
);
const rulerBar = ref<HTMLElement>();

/** Drag the HTML time chip along the ruler to seek. */
function beginChipDrag(event: PointerEvent): void {
    const bar = rulerBar.value;
    if (!bar) {
        return;
    }
    event.preventDefault();
    const rect = bar.getBoundingClientRect();
    const seekAt = (e: PointerEvent) => {
        const x = Math.min(
            Math.max(e.clientX - rect.left - props.labelWidth, 0),
            trackWidth.value,
        );
        emit("seek", xToTime(x));
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

const blocksBySpeaker = computed(() => {
    const map = new Map<string, EditorLaneBlock[]>();
    for (const speaker of props.speakers) {
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
    if (props.duration <= 0) {
        return [];
    }
    const rawStep = props.duration / Math.max(8 * zoom.value, 1);
    const steps = [1, 2, 5, 10, 15, 30, 60, 120, 300, 600, 900, 1800];
    const step = steps.find((candidate) => candidate >= rawStep) ?? 3600;
    const ticks: {
        time: number;
        x: number;
        labelX: number;
        label: string;
    }[] = [];
    for (let time = step; time < props.duration; time += step) {
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
    const channels = color.match(/^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/);
    if (!channels) {
        return color;
    }
    return `rgba(${channels[1]}, ${channels[2]}, ${channels[3]}, ${alpha})`;
}

interface BlockGeometry {
    x: number;
    width: number;
    hasOverlap: boolean;
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
            other.id !== block.id &&
            other.start < end &&
            other.end > start,
    );
    const actualWidth = Math.max(timeToX(duration), Number.EPSILON);

    // Selection, dragging and invalid data always use the true time extent.
    // The larger idle shape is only a visual affordance and must never hide
    // a real overlap or distort resize calculations.
    if (
        selectedBlockId.value === block.id ||
        preview ||
        hasOverlap
    ) {
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

// Lane row per speaker, looked up once instead of scanning the speaker list
// for every block on every drag/hover frame.
const speakerLane = computed(
    () => new Map(props.speakers.map((speaker, index) => [speaker, index])),
);

const blockConfigs = computed(() =>
    props.blocks.map((block) => {
        const speakerIndex = speakerLane.value.get(block.speaker) ?? 0;
        const geometry = blockGeometry(block);
        const speakerColor =
            props.speakerColors[block.speaker] ?? theme.primary;
        const selected = selectedBlockId.value === block.id;
        const hovered = hoveredBlockId.value === block.id;
        const active = props.activeBlockId === block.id;
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
 * Re-reads the canvas colors from the current CSS theme.
 */
function readTheme(): void {
    const styles = getComputedStyle(document.documentElement);
    function value(name: string, fallback: string): string {
        return styles.getPropertyValue(name).trim() || fallback;
    }
    theme.background = value("--ui-bg", theme.background);
    theme.muted = value("--ui-bg-muted", theme.muted);
    theme.border = value("--ui-border", theme.border);
    theme.text = value("--ui-text", theme.text);
    theme.dimmed = value("--ui-text-dimmed", theme.dimmed);
    theme.primary = value("--ui-primary", theme.primary);
    theme.error = value("--ui-error", theme.error);
}

/**
 * Recomputes the track width from the viewport and the current zoom.
 */
function updateWidth(): void {
    if (!viewport.value) {
        return;
    }
    // A pixel of slack, floored: at 1x zoom the track would otherwise measure
    // exactly the viewport, and a fractional layout width (display scaling on
    // Windows) rounds it just past the edge — enough for a horizontal
    // scrollbar on a track that has nothing to scroll.
    baseTrackWidth.value = Math.max(
        Math.floor(viewport.value.clientWidth - props.labelWidth - 1),
        250,
    );
}

/**
 * Scrolls the lane of the active speaker into view, when auto-scroll is on.
 *
 * @param behavior - Scroll behavior.
 */
function scrollActiveSpeakerIntoView(
    behavior: ScrollBehavior = "smooth",
): void {
    const container = viewport.value;
    const speaker = props.activeSpeaker;
    if (!container || !speaker || !props.autoScroll) {
        return;
    }

    const lane = container.querySelector<HTMLElement>(
        `[data-speaker-lane-label][data-lane="${CSS.escape(speaker)}"]`,
    );
    if (!lane) {
        return;
    }

    const containerRect = container.getBoundingClientRect();
    const laneRect = lane.getBoundingClientRect();
    const rulerRect = rulerBar.value?.getBoundingClientRect();
    const visibleBottom = rulerRect
        ? Math.min(containerRect.bottom, rulerRect.top)
        : containerRect.bottom;

    let scrollDelta = 0;
    if (laneRect.top < containerRect.top) {
        scrollDelta = laneRect.top - containerRect.top;
    } else if (laneRect.bottom > visibleBottom) {
        scrollDelta = laneRect.bottom - visibleBottom;
    }

    if (scrollDelta !== 0) {
        container.scrollBy({ top: scrollDelta, behavior });
    }
}

useResizeObserver(viewport, () => {
    updateWidth();
    scrollActiveSpeakerIntoView("auto");
});
useResizeObserver(rulerBar, () => scrollActiveSpeakerIntoView("auto"));
watch(() => props.labelWidth, updateWidth);
watch(
    [
        () => props.activeSpeaker,
        () => props.autoScroll,
        () => props.speakers.join("\u0000"),
    ],
    async () => {
        await nextTick();
        scrollActiveSpeakerIntoView();
    },
    { flush: "post" },
);
onClickOutside(viewport, clearSelectedBlock);

// Delete/Backspace removes the selected block (all its segments in merge
// mode); ignored while typing in an input so text edits keep the keys.
useEventListener(window, "keydown", (event: KeyboardEvent) => {
    if (event.key !== "Delete" && event.key !== "Backspace") {
        return;
    }
    if (!selectedBlockId.value) {
        return;
    }
    const target = event.target as HTMLElement | null;
    if (
        target?.isContentEditable ||
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement
    ) {
        return;
    }
    event.preventDefault();
    emit("delete", selectedBlockId.value);
    clearSelectedBlock();
});

onMounted(() => {
    readTheme();
    updateWidth();
});

/**
 * Converts a playback time to a canvas x coordinate.
 *
 * @param seconds - Time in seconds.
 * @returns The x coordinate.
 */
function timeToX(seconds: number): number {
    if (props.duration <= 0) {
        return 0;
    }
    return (seconds / props.duration) * trackWidth.value;
}

/**
 * Converts a canvas x coordinate to a playback time.
 *
 * @param x - The x coordinate.
 * @returns Time in seconds, clamped to the media duration.
 */
function xToTime(x: number): number {
    if (trackWidth.value <= 0 || props.duration <= 0) {
        return 0;
    }
    return clamp01(x / trackWidth.value) * props.duration;
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
    let maxEnd = props.duration;
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
    const sourceIndex = props.speakers.indexOf(block.speaker);
    const targetIndex = Math.min(
        Math.max(Math.round((position.y - 8) / LANE_HEIGHT), 0),
        Math.max(props.speakers.length - 1, 0),
    );
    const targetSpeaker = props.speakers[targetIndex] ?? block.speaker;
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
    // Not clamp(): each edge obeys the lane bound AND must leave the
    // outermost member segment visible, and those two can conflict. The
    // nesting order makes the member-segment limit win; the minWidth guard
    // below then rejects the resize outright.
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
 * Selects a block and attaches the resize handles to it.
 *
 * @param block - The clicked block.
 * @param event - The Konva click event.
 */
function selectBlock(
    block: EditorLaneBlock,
    event: KonvaEventObject<MouseEvent>,
): void {
    selectedBlockId.value = block.id;
    selectedRect.value = event.target as Rect;
    transformer.value?.getNode().forceUpdate();
    emit("seek", block.start);
}

/**
 * Clears the selection when the click landed on empty canvas.
 *
 * @param event - The Konva click event.
 */
function clearSelection(event: KonvaEventObject<MouseEvent>): void {
    if (event.target === event.currentTarget) {
        clearSelectedBlock();
    }
}

/**
 * Clears the selection when the pointer goes down outside the canvas.
 *
 * @param event - The pointer event.
 */
function onViewportPointerDown(event: PointerEvent): void {
    if (!(event.target instanceof HTMLCanvasElement)) {
        clearSelectedBlock();
    }
}

/**
 * Turns a finished drag into a lane change for the parent.
 *
 * @param block - The dragged block.
 * @param event - The Konva drag event.
 */
function onBlockDragEnd(
    block: EditorLaneBlock,
    event: KonvaEventObject<DragEvent>,
): void {
    const preview = dragPreview.value;
    const rect = event.target as Rect;
    if (preview?.targetSpeaker && !preview.allowed) {
        dragPreview.value = undefined;
        rect.position({
            x: timeToX(block.start),
            y: props.speakers.indexOf(block.speaker) * LANE_HEIGHT + 8,
        });
        return;
    }
    const start = preview?.targetSpeaker ? block.start : xToTime(rect.x());
    emit("change", {
        blockId: block.id,
        start,
        end: start + (block.end - block.start),
        ...(preview?.targetSpeaker
            ? { targetSpeaker: preview.targetSpeaker }
            : {}),
    });
    clearTimeout(dragCommitTimeout);
    dragCommitTimeout = setTimeout(() => {
        dragPreview.value = undefined;
    }, 2000);
    clearSelectedBlock();
}

/**
 * Turns a finished resize into a lane change for the parent.
 *
 * @param block - The resized block.
 */
function onTransformEnd(block: EditorLaneBlock): void {
    const rect = selectedRect.value;
    if (!rect) {
        return;
    }
    const start = xToTime(rect.x());
    const end = xToTime(rect.x() + rect.width() * rect.scaleX());
    rect.scaleX(1);
    emit("change", { blockId: block.id, start, end });
    clearSelectedBlock();
}

/**
 * Drops the current block selection.
 */
function clearSelectedBlock(): void {
    selectedBlockId.value = undefined;
    selectedRect.value = undefined;
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
 * Seeks when the user clicks empty canvas.
 *
 * @param event - The Konva click event.
 */
function seekFromStage(event: KonvaEventObject<MouseEvent>): void {
    clearSelectedBlock();
    if (event.target !== event.currentTarget) {
        return;
    }
    const pointer = event.currentTarget.getStage()?.getPointerPosition();
    if (pointer) {
        emit("seek", xToTime(pointer.x));
    }
}

/**
 * Seeks when the user clicks the time ruler.
 *
 * @param _event - The Konva click event; the pointer is read from the stage.
 */
function seekFromRuler(_event: KonvaEventObject<MouseEvent>): void {
    clearSelectedBlock();
    const stage = rulerStage.value?.getNode();
    const pointer = stage?.getPointerPosition();
    if (pointer) {
        emit("seek", xToTime(pointer.x));
    }
}

/**
 * Lets a wheel event over the speaker labels scroll them vertically.
 *
 * @param event - The wheel event.
 * @returns `true` when the event was consumed as a label scroll.
 */
function scrollSpeakerLabels(event: WheelEvent): boolean {
    const element = viewport.value;
    const target = event.target;
    if (
        !element ||
        !(target instanceof Element) ||
        !target.closest("[data-speaker-lane-label]")
    ) {
        return false;
    }

    event.preventDefault();
    const rawDelta = event.deltaY !== 0 ? event.deltaY : event.deltaX;
    const multiplier =
        event.deltaMode === WheelEvent.DOM_DELTA_LINE
            ? 16
            : event.deltaMode === WheelEvent.DOM_DELTA_PAGE
              ? element.clientHeight
              : 1;
    element.scrollTop += rawDelta * multiplier;
    return true;
}

/**
 * Scrolls the track so a playback time sits in the middle of the viewport.
 *
 * @param time - Time in seconds.
 */
function centerTimeInView(time: number): void {
    const element = viewport.value;
    if (!element || element.scrollWidth <= element.clientWidth) {
        return;
    }

    const visibleWidth = Math.max(
        element.clientWidth - props.labelWidth,
        1,
    );
    const targetX = timeToX(time);
    const maxScrollLeft = element.scrollWidth - element.clientWidth;
    element.scrollLeft = Math.min(
        Math.max(targetX - visibleWidth / 2, 0),
        maxScrollLeft,
    );
}

/**
 * Zooms the timeline on wheel input, unless the labels consumed the event.
 *
 * @param event - The wheel event.
 */
function onWheel(event: WheelEvent): void {
    if (scrollSpeakerLabels(event)) {
        return;
    }
    event.preventDefault();
    const delta = event.deltaY !== 0 ? event.deltaY : event.deltaX;
    if (delta === 0) {
        return;
    }
    if (event.shiftKey) {
        const element = viewport.value;
        if (element) {
            const rect = element.getBoundingClientRect();
            const visibleWidth = Math.max(
                element.clientWidth - props.labelWidth,
                1,
            );
            const screenX = Math.min(
                Math.max(event.clientX - rect.left - props.labelWidth, 0),
                visibleWidth,
            );
            zoomAnchor.value = {
                time: xToTime(element.scrollLeft + screenX),
                screenX,
            };
        }
        zoom.value = Math.min(
            Math.max(zoom.value * 2 ** (-delta / 400), ZOOM_MIN),
            ZOOM_MAX,
        );
        return;
    }
    const visibleSpan = props.duration / Math.max(zoom.value, ZOOM_MIN);
    const nextTime = Math.min(
        Math.max(
            props.currentTime + (delta / 100) * visibleSpan * 0.02,
            0,
        ),
        props.duration,
    );
    emit("seek", nextTime);
    centerTimeInView(nextTime);
}

watch(zoom, async (next, previous) => {
    const element = viewport.value;
    if (!element || next === previous || props.duration <= 0) {
        return;
    }
    const visibleWidth = Math.max(element.clientWidth - props.labelWidth, 1);
    const explicitAnchor = zoomAnchor.value;
    zoomAnchor.value = undefined;
    let anchorTime: number;
    let anchorOffset: number;
    if (explicitAnchor) {
        anchorTime = explicitAnchor.time;
        anchorOffset = explicitAnchor.screenX;
    } else {
        const oldWidth = Math.max(baseTrackWidth.value * previous, 56);
        const viewStart = element.scrollLeft;
        const currentX = (props.currentTime / props.duration) * oldWidth;
        const currentVisible =
            currentX >= viewStart && currentX <= viewStart + visibleWidth;
        const anchorX = currentVisible
            ? currentX
            : viewStart + visibleWidth / 2;
        anchorTime = (anchorX / oldWidth) * props.duration;
        anchorOffset = anchorX - viewStart;
    }
    await nextTick();
    element.scrollLeft = Math.max(
        (anchorTime / props.duration) * trackWidth.value - anchorOffset,
        0,
    );
});

watch(zoom, (value) => {
    const clamped = clamp(value, ZOOM_MIN, ZOOM_MAX);
    if (clamped !== value) {
        zoom.value = clamped;
    }
});

watch(
    () => props.blocks,
    (blocks) => {
        const preview = dragPreview.value;
        if (!preview) {
            return;
        }
        const block = blocks.find((candidate) => candidate.id === preview.blockId);
        if (!block) {
            return;
        }
        const expectedStart = preview.targetSpeaker
            ? block.start
            : xToTime(preview.x);
        const speakerCommitted =
            !preview.targetSpeaker || block.speaker === preview.targetSpeaker;
        if (
            speakerCommitted &&
            Math.abs(block.start - expectedStart) < 0.001
        ) {
            clearTimeout(dragCommitTimeout);
            dragPreview.value = undefined;
        }
    },
);

onBeforeUnmount(() => clearTimeout(dragCommitTimeout));
</script>

<template>
    <div
        ref="viewport"
        class="relative overflow-auto bg-muted"
        :style="{ maxHeight: `${props.viewportHeight}px` }"
        @pointerdown.capture="onViewportPointerDown"
        @wheel="onWheel"
    >
        <div
            class="relative bg-default"
            :style="{ width: `${innerWidth}px` }"
        >
            <div class="relative" :style="{ height: `${lanesHeight}px` }">
                <ClientOnly>
                    <!-- biome-ignore lint/a11y/noStaticElementInteractions: Konva canvas stage provides pointer timeline interaction -->
                    <v-stage
                        class="absolute top-0"
                        :style="{ left: `${labelWidth}px` }"
                        :config="{
                            width: trackWidth,
                            height: lanesHeight,
                        }"
                        @click="clearSelection"
                    >
                        <v-layer>
                            <template
                                v-for="(speaker, index) in props.speakers"
                                :key="speaker"
                            >
                                <!-- biome-ignore lint/a11y/noStaticElementInteractions: Konva lane background seeks on pointer click -->
                                <v-rect
                                    :config="{
                                        x: 0,
                                        y: index * LANE_HEIGHT,
                                        width: trackWidth,
                                        height: LANE_HEIGHT,
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
                                        y: index * LANE_HEIGHT + 1,
                                        width: trackWidth,
                                        height: LANE_HEIGHT - 2,
                                        stroke: dragPreview.allowed
                                            ? theme.primary
                                            : theme.error,
                                        strokeWidth: 2,
                                        dash: [5, 4],
                                    }"
                                />
                            </template>

                            <!-- biome-ignore lint/a11y/noStaticElementInteractions: Konva blocks support selection, drag, resize and context menu -->
                            <v-rect
                                v-for="(config, index) in blockConfigs"
                                :key="props.blocks[index]?.id"
                                :config="config"
                                @click="
                                    props.blocks[index] &&
                                    selectBlock(props.blocks[index], $event)
                                "
                                @mouseenter="
                                    hoveredBlockId = props.blocks[index]?.id
                                "
                                @mouseleave="hoveredBlockId = undefined"
                                @dragend="
                                    props.blocks[index] &&
                                    onBlockDragEnd(
                                        props.blocks[index],
                                        $event,
                                    )
                                "
                                @transformend="
                                    props.blocks[index] &&
                                    onTransformEnd(props.blocks[index])
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
                    v-for="speaker in props.speakers"
                    :key="speaker"
                    data-speaker-lane-label
                    :data-lane="speaker"
                    class="sticky left-0 z-5 flex h-11 flex-none items-center border-r border-b border-default bg-default"
                    :style="{ width: `${labelWidth}px` }"
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
                    :style="{ width: `${labelWidth}px` }"
                />
                <ClientOnly>
                    <!-- biome-ignore lint/a11y/noStaticElementInteractions: Konva ruler seeks on pointer click -->
                    <v-stage
                        ref="rulerStage"
                        :config="{ width: trackWidth, height: RULER_HEIGHT }"
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
                                        width: RULER_LABEL_WIDTH,
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
                    :style="{ left: `${labelWidth + chipX}px` }"
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
                        {{ formatTime(props.currentTime, { milliseconds: false }) }}
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
