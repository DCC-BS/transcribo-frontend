<script lang="ts" setup>
import type { LayerConfig } from 'konva/lib/Layer';
import type { KonvaEventObject } from 'konva/lib/Node';
import type { Stage, StageConfig } from 'konva/lib/Stage';
import type { RectConfig, Rect } from 'konva/lib/shapes/Rect';
import type { TransformerConfig } from 'konva/lib/shapes/Transformer';
import TimeAxisLayer from '~/components/timeline/TimeAxisLayer.vue';
import { UpdateSegementCommand } from '~/types/commands';

// -----------------------------------------------------------------
// Props and constants
// -----------------------------------------------------------------

interface TimelineViewProps {
    currentTime: number;
    duration: number;
    zoomX: number;
    startTime: number;
    endTime: number;
}

const props = defineProps<TimelineViewProps>();
const { t } = useI18n();

const marginTop = 20;
const heightPerSpeaker = 50;

// -----------------------------------------------------------------
// Composables
// -----------------------------------------------------------------

const { executeCommand } = useCommandBus();
const { checkSnap, createDragBoundFunc, findSnapPoints } = useTimelineSegment(computed(() => props.zoomX));
const { segments } = useCurrentTranscription();

// -----------------------------------------------------------------
// References and state
// -----------------------------------------------------------------

const container = ref<HTMLDivElement>();
const stageWidth = ref<number>(100);
const selectedSegment = ref<string>();
const transformerNode = ref<Rect>();
const transformerVisible = ref(false);

// Tooltip state
const tooltipText = ref<string>('');
const tooltipVisible = ref<boolean>(false);
const tooltipPosition = ref<{ x: number, y: number }>({ x: 0, y: 0 });
const timeInfoVisible = ref<boolean>(false);

// -----------------------------------------------------------------
// Computed properties
// -----------------------------------------------------------------

/**
 * List of unique speakers extracted from segments
 */
const speakers = computed(() =>
    Array.from(
        new Set(
            segments.value.map((segment) => segment.speaker ?? 'unknown'),
        ),
    ),
);

/**
 * Maps speaker names to their vertical position indices
 */
const speakerToIndex = computed(() =>
    speakers.value.reduce((acc, speaker, index) => {
        acc[speaker] = index;
        return acc;
    }, {} as Record<string, number>),
);

/**
 * Calculate stage height based on number of speakers
 */
const stageHeight = computed(() => speakers.value.length * heightPerSpeaker + marginTop);

const { getSpeakerColor } = useSpeakerColor(speakers);
const { observe } = useResizeObserver(container);

const {
    fromTimetoPixelSpace,
    fromPixeltoTimeSpace,
    playheadLineConfig,
    transformedLayerConfig,
} = useMediaTimeline({
    mediaDuration: computed(() => props.duration),
    stageWidth,
    stageHeight,
    zoomX: computed(() => props.zoomX),
    startTime: computed(() => props.startTime),
    currentTime: computed(() => props.currentTime),
});

/**
 * Configuration for the Konva stage
 */
const configKonva = computed(
    () =>
        ({
            width: stageWidth.value,
            height: stageHeight.value,
        }) as StageConfig,
);

/**
 * Layer configuration for the player header
 */
const playerHeaderLayerConfig = computed(() => transformedLayerConfig.value);

/**
 * Layer configuration for timeline segments with vertical offset
 */
const timelineLayerConfig = computed(() => ({
    ...transformedLayerConfig.value,
    y: marginTop,
} as LayerConfig));

/**
 * Configuration for the transformer tool
 */
const transformerConfig = computed(() => ({
    node: transformerNode.value,
    visible: transformerVisible.value,
    // Only allow horizontal resizing
    enabledAnchors: ['middle-left', 'middle-right'],
    // Disable rotation
    rotateEnabled: false,
    // Custom style for the transformer
    borderStroke: '#ffcc00',
    borderStrokeWidth: 1,
    anchorStroke: '#ffcc00',
    anchorFill: '#ffcc00',
    anchorSize: 8,
    ignoreStroke: true,
    // Keep transformer visible inside the stage
    boundBoxFunc: (oldBox: any, newBox: any) => {
        // Prevent negative width
        if (newBox.width < 5) {
            return oldBox;
        }
        return newBox;
    },
} as TransformerConfig));

/**
 * Generate rectangle configurations for all segments
 */
const rectConfigs = computed(() =>
    segments.value.map(
        (segment) =>
            ({
                id: segment.id,
                // Scale x position and width to fit stage width
                x: fromTimetoPixelSpace(segment.start),
                y: speakerToIndex.value[segment.speaker ?? 'unknown'] * heightPerSpeaker,
                width: fromTimetoPixelSpace(segment.end - segment.start),
                height: heightPerSpeaker,
                fill: getSpeakerColor(segment.speaker).toString(),
                // Add stroke to make segments visually distinct
                stroke: 'black',
                strokeScaleEnabled: false,
                draggable: true,
                // Store segment text as a property for hover access
                text: segment.text,
                dragBoundFunc: createDragBoundFunc(
                    segment,
                    stageWidth.value,
                    speakerToIndex.value[segment.speaker ?? 'unknown'],
                    heightPerSpeaker,
                    fromTimetoPixelSpace,
                    marginTop
                ),
            }) as RectConfig & { text?: string },
    ),
);

// -----------------------------------------------------------------
// Lifecycle hooks
// -----------------------------------------------------------------

onMounted(() => {
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('resize', updateStageWidth);
    // Initialize the stage width and the resize observer
    updateStageWidth();
    observe(() => updateStageWidth());
});

onUnmounted(() => {
    window.removeEventListener('keyup', handleKeyUp);
    window.removeEventListener('resize', updateStageWidth);
});

// -----------------------------------------------------------------
// Functions
// -----------------------------------------------------------------

/**
 * Updates the stage width based on the container's current dimensions
 */
function updateStageWidth(): void {
    if (container.value) {
        stageWidth.value = container.value.clientWidth;
    }
}

/**
 * Handles keyboard navigation for selected segments
 */
function handleKeyUp(e: KeyboardEvent): void {
    if (!selectedSegment.value) return;
    const segement = segments.value.find((s) => s.id === selectedSegment.value);

    if (!segement) return;

    if (e.key === 'ArrowRight') {
        segement.start += 0.5;
        segement.end += 0.5;
    } else if (e.key === 'ArrowLeft') {
        segement.start -= 0.5;
        segement.end -= 0.5;
    }
}

/**
 * Shows the transformer tool for the given rectangle
 */
function showTransformer(rect: Rect): void {
    transformerNode.value = rect;
    transformerVisible.value = true;
}

/**
 * Hides the transformer tool
 */
function hideTransformer(): void {
    transformerVisible.value = false;
}

// -----------------------------------------------------------------
// Event handlers
// -----------------------------------------------------------------

/**
 * Handles drag end event to update segment times
 */
function onDragEnd(e: KonvaEventObject<MouseEvent, Rect>): void {
    if (!selectedSegment.value) return;

    const rect = e.target;
    const segmentIndex = segments.value.findIndex(s => s.id === selectedSegment.value);
    if (segmentIndex === -1) return;

    // Calculate new times based on position
    const newStart = fromPixeltoTimeSpace(rect.x());
    const newEnd = fromPixeltoTimeSpace(rect.x() + rect.width() * rect.scaleX());

    const segmentId = segments.value[segmentIndex].id;

    // Update the segment with new times
    executeCommand(new UpdateSegementCommand(segmentId, {
        start: Math.max(0, newStart),
        end: Math.max(newStart + 0.5, newEnd)
    }));
}

/**
 * Handles transform end event to update segment times after resizing
 */
function onTransformEnd(e: KonvaEventObject<MouseEvent, Rect>): void {
    if (!selectedSegment.value) return;

    const rect = e.target as Rect;
    const segmentIndex = segments.value.findIndex(s => s.id === selectedSegment.value);
    if (segmentIndex === -1) return;

    // Calculate new times based on position and width
    const newStart = fromPixeltoTimeSpace(rect.x());
    const newEnd = fromPixeltoTimeSpace(rect.x() + rect.width() * rect.scaleX());

    const segmentId = segments.value[segmentIndex].id;
    executeCommand(new UpdateSegementCommand(segmentId, {
        start: Math.max(0, newStart),
        end: Math.max(newStart + 0.5, newEnd), // Ensure minimum duration
    }));

    // Reset scale since we've applied the transform
    rect.scaleX(1);

    // Hide time info after transformation ends
    timeInfoVisible.value = false;
}

/**
 * Handles drag move event to implement snapping
 */
function onDragMove(e: KonvaEventObject<MouseEvent, Rect>): void {
    const rect = e.target;

    if (e.evt.altKey) return;

    const leftEdge = rect.x();
    const rightEdge = leftEdge + rect.width();
    const snapPoints = findSnapPoints(rectConfigs.value, selectedSegment.value);

    // Check for snap on left edge (start time)
    const snappedLeft = checkSnap(leftEdge, [...snapPoints.starts, ...snapPoints.ends]);

    // Check for snap on right edge (end time)
    const snappedRight = checkSnap(rightEdge, [...snapPoints.starts, ...snapPoints.ends]);

    // Apply snapping if needed
    if (snappedLeft !== null) {
        rect.x(snappedLeft);
    } else if (snappedRight !== null) {
        rect.x(snappedRight - rect.width());
    }
}

/**
 * Handles transform move for snapping during resize
 */
function onTransform(e: KonvaEventObject<MouseEvent, Rect>): void {
    const rect = e.target;

    if (e.evt.altKey) return;

    const snapPoints = findSnapPoints(rectConfigs.value, selectedSegment.value);

    // Check for snap on left edge (if middle-left anchor is being dragged)
    const leftEdge = rect.x();
    const snappedLeft = checkSnap(leftEdge, [...snapPoints.starts, ...snapPoints.ends]);

    // Check for snap on right edge (if middle-right anchor is being dragged)
    const rightEdge = leftEdge + rect.width();
    const snappedRight = checkSnap(rightEdge, [...snapPoints.starts, ...snapPoints.ends]);

    // Apply snapping if needed
    if (snappedLeft !== null) {
        const newWidth = rect.width() * rect.scaleX() + (leftEdge - snappedLeft);
        rect.x(snappedLeft);
        rect.width(newWidth);
        rect.scaleX(1); // Reset scale
    }

    if (snappedRight !== null) {
        const newWidth = snappedRight - rect.x();
        rect.width(newWidth);
        rect.scaleX(1); // Reset scale
    }
}

/**
 * Handles segment click to select it
 */
function onSegmentClicked(e: KonvaEventObject<MouseEvent, Rect>, segmentId: string): void {
    selectedSegment.value = segmentId;
    showTransformer(e.target as Rect);
}

/**
 * Clears selection when clicking on empty space
 */
function clearSelection(e: KonvaEventObject<MouseEvent, Stage>): void {
    // Only clear if clicking on the stage background, not on a shape
    if (e.target === e.currentTarget) {
        selectedSegment.value = undefined;
        hideTransformer();
        timeInfoVisible.value = false;
    }
}

/**
 * Shows tooltip when hovering over a segment
 */
function onSegmentMouseEnter(e: any, text: string): void {
    // Display the tooltip with segment text
    tooltipText.value = text || t('timeline.noTranscription');
    tooltipVisible.value = true;

    // Position tooltip near the mouse position
    const stage = e.target.getStage();
    const pointerPosition = stage.getPointerPosition();
    if (pointerPosition) {
        tooltipPosition.value = {
            x: pointerPosition.x + 10,
            y: pointerPosition.y - 10
        };
    }
}

/**
 * Hides tooltip when mouse leaves a segment
 */
function onSegmentMouseLeave(): void {
    tooltipVisible.value = false;
}

/**
 * Updates tooltip position as mouse moves
 */
function onPointerMove(e: any): void {
    if (tooltipVisible.value) {
        const stage = e.target.getStage();
        const pointerPosition = stage.getPointerPosition();
        if (pointerPosition) {
            tooltipPosition.value = {
                x: pointerPosition.x + 10,
                y: pointerPosition.y - 10
            };
        }
    }
}
</script>

<template>
    <div ref="container" class="w-full">
        <v-stage :config="configKonva" v-if="segments.length > 0" @mousemove="onPointerMove" @click="clearSelection">

            <!-- Time Axis layer -->
            <TimeAxisLayer :start-time="props.startTime" :end-time="props.endTime" :zoom-x="props.zoomX"
                :stage-width="stageWidth" />

            <!-- Timeline segments layer -->
            <v-layer :config="timelineLayerConfig">
                <v-rect v-for="(rectConfig, index) in rectConfigs" :key="index" :config="rectConfig"
                    @click="(e: KonvaEventObject<MouseEvent, Rect>) => onSegmentClicked(e, rectConfig.id!)"
                    @mouseenter="onSegmentMouseEnter($event, rectConfig.text!)" @mouseleave="onSegmentMouseLeave()"
                    @dragmove="onDragMove" @dragend="onDragEnd" @transform="onTransform"
                    @transformend="onTransformEnd" />
            </v-layer>

            <v-layer :config="playerHeaderLayerConfig">
                <v-line :config="playheadLineConfig" />
            </v-layer>

            <v-layer>
                <v-transformer :config="transformerConfig" />
            </v-layer>

            <!-- Tooltip layer -->
            <v-layer>
                <v-label v-if="tooltipVisible" :config="{
                    x: tooltipPosition.x,
                    y: tooltipPosition.y,
                    opacity: 0.75,
                }">
                    <v-tag :config="{
                        fill: 'black',
                        pointerDirection: 'down',
                        pointerWidth: 10,
                        pointerHeight: 10,
                        lineJoin: 'round',
                        shadowColor: 'black',
                        shadowBlur: 10,
                        shadowOffset: { x: 5, y: 5 },
                        shadowOpacity: 0.5
                    }" />
                    <v-text :config="{
                        text: tooltipText,
                        fontSize: 14,
                        padding: 5,
                        fill: 'white',
                        maxWidth: 300
                    }" />
                </v-label>
            </v-layer>
        </v-stage>
    </div>
</template>