<script lang="ts" setup>
import type { LayerConfig } from 'konva/lib/Layer';
import type { KonvaEventObject } from 'konva/lib/Node';
import type { Stage, StageConfig } from 'konva/lib/Stage';
import type { RectConfig, Rect } from 'konva/lib/shapes/Rect';
import type { TransformerConfig } from 'konva/lib/shapes/Transformer';
import TimeAxisLayer from '~/components/timeline/TimeAxisLayer.vue';
import { UpdateSegementCommand } from '~/types/commands';

interface TimelineViewProps {
    currentTime: number;
    duration: number;
    zoomX: number;
    startTime: number;
    endTime: number;
}

const props = defineProps<TimelineViewProps>();

const marginTop = 20;
const heightPerSpeaker = 50;

const { executeCommand } = useCommandBus();
const { checkSnap, createDragBoundFunc, findSnapPoints } = useTimelineSegment(computed(() => props.zoomX));

const { segments } = useCurrentTranscription();

const container = ref<HTMLDivElement | null>(null);

const speakers = computed(() =>
    Array.from(
        new Set(
            segments.value.map((segment) => segment.speaker ?? 'unknown'),
        ),
    ),
);

const speakerToIndex = computed(() =>
    speakers.value.reduce((acc, speaker, index) => {
        acc[speaker] = index;
        return acc;
    }, {} as Record<string, number>),
);

const { getSpeakerColor } = useSpeakerColor(speakers);

const stageWidth = computed(() => container.value?.clientWidth ?? 100);
const selectedSegment = ref<string>();
const stageHeight = computed(() => speakers.value.length * heightPerSpeaker + marginTop);

const { fromTimetoPixelSpace, fromPixeltoTimeSpace, playheadLineConfig, transformedLayerConfig, offsetX } = useMediaTimeline({
    mediaDuration: computed(() => props.duration),
    stageWidth,
    stageHeight,
    zoomX: computed(() => props.zoomX),
    startTime: computed(() => props.startTime),
    currentTime: computed(() => props.currentTime),
});

const configKonva = computed(
    () =>
        ({
            width: stageWidth.value,
            height: stageHeight.value,
        }) as StageConfig,
);

const playerHeaderLayerConfig = computed(() => transformedLayerConfig.value);
const timelineLayerConfig = computed(() => ({
    ...transformedLayerConfig.value,
    y: marginTop,
} as LayerConfig));

// Add state for tooltip
const tooltipText = ref<string>('');
const tooltipVisible = ref<boolean>(false);
const tooltipPosition = ref<{ x: number, y: number }>({ x: 0, y: 0 });

// Add state for time display during resize
const timeInfoVisible = ref<boolean>(false);

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
                    heightPerSpeaker, fromTimetoPixelSpace,
                    marginTop),
            }) as RectConfig & { text?: string },
    ),
);

onMounted(() => {
    window.addEventListener('keyup', handleKeyUp);
});

onUnmounted(() => {
    window.removeEventListener('keyup', handleKeyUp);
});

function handleKeyUp(e: KeyboardEvent) {
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

const transformerNode = ref<Rect>();
const transformerVisible = ref(false);

// Configuration for the transformer
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

function showTransformer(rect: Rect) {
    transformerNode.value = rect;
    transformerVisible.value = true;
}

function hideTransformer() {
    transformerVisible.value = false;
}

// Handle rectangle drag end to update segment times
function onDragEnd(e: KonvaEventObject<Rect, Event>): void {
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

// Handle transform end to update segment times
function onTransformEnd(e: KonvaEventObject<Rect, Event>): void {
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

// Handle drag move to implement snapping
function onDragMove(e: KonvaEventObject<MouseEvent, Rect>): void {
    const rect = e.target;
    const snapPoints = findSnapPoints(rectConfigs.value, selectedSegment.value);

    // Check for snap on left edge (start time)
    const leftEdge = rect.x();
    const snappedLeft = checkSnap(leftEdge, [...snapPoints.starts, ...snapPoints.ends]);

    // Check for snap on right edge (end time)
    const rightEdge = leftEdge + rect.width();
    const snappedRight = checkSnap(rightEdge, [...snapPoints.starts, ...snapPoints.ends]);

    // Apply snapping if needed
    if (snappedLeft !== null) {
        rect.x(snappedLeft);
    } else if (snappedRight !== null) {
        rect.x(snappedRight - rect.width());
    }
}

// Handle transform move for snapping during resize
function onTransform(e: KonvaEventObject<Event, Rect>): void {
    const rect = e.target;
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

function onSegmentClicked(e: KonvaEventObject<MouseEvent, Rect>, segmentId: string): void {
    // Deselect previous selection
    selectedSegment.value = segmentId;
    showTransformer(e.target as Rect);
}

// Clear selection when clicking on empty space
function clearSelection(e: KonvaEventObject<MouseEvent, Stage>): void {
    // Only clear if clicking on the stage background, not on a shape
    if (e.target === e.currentTarget) {
        selectedSegment.value = undefined;

        // Clear transformer
        hideTransformer();

        // Hide time info
        timeInfoVisible.value = false;
    }
}

// Handle mouse enter to show tooltip
function onSegmentMouseEnter(e: any, text: string): void {
    // Display the tooltip with segment text
    tooltipText.value = text || 'No transcription available';
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

// Handle mouse leave to hide tooltip
function onSegmentMouseLeave(): void {
    tooltipVisible.value = false;
}

// Handle pointer move to update tooltip position
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

            <!-- Time Axis layer - replaced with component -->F
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
                <!-- Add transformer for resizing -->
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