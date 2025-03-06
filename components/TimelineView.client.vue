<script lang="ts" setup>
import type { LayerConfig } from 'konva/lib/Layer';
import type { StageConfig } from 'konva/lib/Stage';
import type { RectConfig } from 'konva/lib/shapes/Rect';
import type { Vector2d } from 'konva/lib/types';
// Import formatTime function
import { formatTime } from '~/utils/time';

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

const transcriptionStore = useTranscriptionsStore();
const { executeCommand } = useCommandBus();

const transcriptions = ref(
    transcriptionStore.currentTranscription?.segments ?? [],
);

const container = ref<HTMLDivElement | null>(null);

const speakers = computed(() =>
    Array.from(
        new Set(
            transcriptions.value.map((segment) => segment.speaker ?? 'unknown'),
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

const { fromTimetoPixelSpace, playheadLineConfig, offsetX } = useMediaTimeline({
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

const timelineLayerConfig = computed(() => ({
    offsetX: offsetX.value,
    scaleX: props.zoomX,
    y: marginTop,
} as LayerConfig));

// Add state for tooltip
const tooltipText = ref<string>('');
const tooltipVisible = ref<boolean>(false);
const tooltipPosition = ref<{ x: number, y: number }>({ x: 0, y: 0 });

const rectConfigs = computed(() =>
    transcriptions.value.map(
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
                stroke: selectedSegment.value == segment.id ? 'yellow' : 'black',
                strokeEnabled: true,
                strokeScaleEnabled: false,
                fillEnabled: true,
                draggable: true,
                // Store segment text as a property for hover access
                text: segment.text,
                dragBoundFunc: (pos: Vector2d) => {
                    const width =
                        fromTimetoPixelSpace(segment.end - segment.start);
                    const newX = Math.max(
                        0,
                        Math.min(stageWidth.value - width, pos.x),
                    );
                    return {
                        x: newX,
                        y: speakerToIndex.value[segment.speaker ?? 'unknown'] * heightPerSpeaker + marginTop,
                    };
                },
            }) as RectConfig & { text?: string },
    ),
);

// Calculate time axis ticks based on visible time range
const timeTicks = computed(() => {
    const visibleDuration = props.endTime - props.startTime;

    // Determine appropriate tick interval based on zoom level and stage width
    // We aim for approximately 5-10 ticks across the visible area
    let tickIntervalSeconds: number;

    if (visibleDuration <= 10) { // 0-10 seconds visible
        tickIntervalSeconds = 1; // 1 second intervals
    } else if (visibleDuration <= 60) { // 10-60 seconds visible
        tickIntervalSeconds = 5; // 5 second intervals
    } else if (visibleDuration <= 300) { // 1-5 minutes visible
        tickIntervalSeconds = 30; // 30 second intervals
    } else if (visibleDuration <= 1800) { // 5-30 minutes visible
        tickIntervalSeconds = 60; // 1 minute intervals
    } else { // > 30 minutes
        tickIntervalSeconds = 300; // 5 minute intervals
    }

    // Generate tick positions and labels
    const ticks = [];
    // Round start time to nearest tick interval
    const firstTick = Math.ceil(props.startTime / tickIntervalSeconds) * tickIntervalSeconds;

    for (let time = firstTick; time <= props.endTime; time += tickIntervalSeconds) {
        const x = fromTimetoPixelSpace(time - props.startTime) * props.zoomX;
        ticks.push({
            x,
            time,
            label: formatTime(time)
        });
    }

    return ticks;
});

onMounted(() => {
    window.addEventListener('keyup', handleKeyUp);
});

onUnmounted(() => {
    window.removeEventListener('keyup', handleKeyUp);
});

watch(
    () => transcriptionStore.currentTranscription,
    (currentTranscription) => {
        transcriptions.value = currentTranscription?.segments ?? [];
    },
);

function handleKeyUp(e: KeyboardEvent) {
    if (!selectedSegment.value) return;
    const segement = transcriptions.value.find((s) => s.id === selectedSegment.value);

    if (!segement) return;

    if (e.key === 'ArrowRight') {
        segement.start += 0.5;
        segement.end += 0.5;
    } else if (e.key === 'ArrowLeft') {
        segement.start -= 0.5;
        segement.end -= 0.5;
    }
}

function onSegmentClicked(segmentId: string): void {
    selectedSegment.value = segmentId;
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
        <v-stage :config="configKonva" v-if="transcriptions.length > 0" @mousemove="onPointerMove">
            <!-- Time Axis layer -->
            <v-layer>
                <!-- Time tick marks -->
                <template v-for="(tick, index) in timeTicks" :key="index">
                    <!-- Vertical tick line -->
                    <v-line :config="{
                        points: [tick.x, 0, tick.x, 10],
                        stroke: '#555',
                        strokeWidth: 1
                    }" />

                    <!-- Tick label -->
                    <v-text :config="{
                        x: tick.x,
                        y: 10,
                        text: tick.label,
                        fontSize: 10,
                        fill: '#555',
                        align: 'center',
                        offsetX: 0
                    }" />
                </template>
            </v-layer>

            <!-- Timeline segements layer -->
            <v-layer :config="timelineLayerConfig">
                <v-rect v-for="(rectConfig, index) in rectConfigs" :key="index" :config="rectConfig"
                    @click="onSegmentClicked(rectConfig.id!)"
                    @mouseenter="onSegmentMouseEnter($event, rectConfig.text!)" @mouseleave="onSegmentMouseLeave()" />
                <v-line :config="playheadLineConfig" />
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