<script lang="ts" setup>
import type { StageConfig } from 'konva/lib/Stage';
import type { RectConfig } from 'konva/lib/shapes/Rect';
import type { Vector2d } from 'konva/lib/types';
import type { LineConfig } from 'konva/lib/shapes/Line';
import { ZoomToCommand } from '~/types/commands';

interface TimelineViewProps {
    currentTime: number;
    duration: number;
    zoomX: number;
    offsetX: number;
}

const props = defineProps<TimelineViewProps>();

const transcriptionStore = useTranscriptionsStore();
const { executeCommand } = useCommandBus();

const transcriptions = ref(
    transcriptionStore.currentTranscription?.segments ?? [],
);

const container = ref<HTMLDivElement | null>(null);

const heightPerSpeaker = 50;

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

const stageWidth = computed(() => container.value?.clientWidth ?? 100);
const selectedSegment = ref<string>();
const stageHeight = computed(() => speakers.value.length * heightPerSpeaker);

const configKonva = computed(
    () =>
        ({
            width: stageWidth.value,
            height: stageHeight.value,
            offsetX: props.offsetX,
            scaleX: props.zoomX,
        }) as StageConfig,
);

// Calculate scaling factor based on the last segment's end time and stage width
const scaleFactor = computed(() => {
    console.log('duration', props.duration)

    // Calculate scaling factor to fit all segments within stage width
    return stageWidth.value / props.duration;
});

function toPixelScale(value: number): number {
    return value * scaleFactor.value * props.zoomX + props.offsetX;
}

watch(scaleFactor, () => {
    console.log('Scale factor changed', scaleFactor.value);
});

const rectConfigs = computed(() =>
    transcriptions.value.map(
        (segment) =>
            ({
                id: segment.id,
                // Scale x position and width to fit stage width
                x: toPixelScale(segment.start),
                y: speakerToIndex.value[segment.speaker ?? 'unknown'] * heightPerSpeaker,
                width: toPixelScale(segment.end - segment.start),
                height: heightPerSpeaker,
                fill: selectedSegment.value == segment.id ? 'green' : 'blue',
                // Add stroke to make segments visually distinct
                stroke: 'black',
                strokeWidth: 1,
                strokeEnabled: true,
                fillEnabled: true,
                draggable: true,
                dragBoundFunc: (pos: Vector2d) => {
                    const width =
                        toPixelScale(segment.end - segment.start);
                    const newX = Math.max(
                        0,
                        Math.min(stageWidth.value - width, pos.x),
                    );
                    return {
                        x: newX,
                        y: 0,
                    };
                },
            }) as RectConfig,
    ),
);

const trackLineConfig = computed(() => ({
    points: [
        toPixelScale(props.currentTime), 0,
        toPixelScale(props.currentTime), stageHeight.value,
    ],
    stroke: 'red',
    strokeWidth: 1,
} as LineConfig));

watch(
    () => transcriptionStore.currentTranscription,
    (currentTranscription) => {
        transcriptions.value = currentTranscription?.segments ?? [];
    },
);

function onSegmentClicked(segmentId: string): void {
    console.log('Segment clicked', segmentId);

    selectedSegment.value = segmentId;
}

function onScroll(event: WheelEvent): void {
    const xZoom = event.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = props.zoomX * xZoom;
    const newOffset = props.offsetX + (event.deltaY > 0 ? 10 : -10);

    executeCommand(new ZoomToCommand(newZoom, newOffset));
}
</script>

<template>
    <div ref="container" class="w-full">
        <v-stage :config="configKonva" @scroll="onScroll">
            <v-layer>
                <v-rect @click="onSegmentClicked(rectConfig.id!)" v-for="(rectConfig, index) in rectConfigs"
                    :key="index" :config="rectConfig" />
                <v-line :config="trackLineConfig" />
            </v-layer>
        </v-stage>
    </div>
</template>

<style></style>
