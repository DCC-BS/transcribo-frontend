<script lang="ts" setup>
import type { StageConfig } from 'konva/lib/Stage';
import type { RectConfig } from 'konva/lib/shapes/Rect';
import type { Vector2d } from 'konva/lib/types';
import type { LineConfig } from 'konva/lib/shapes/Line';

interface TimelineViewProps {
    currentTime: number;
}

const props = defineProps<TimelineViewProps>();

const transcriptionStore = useTranscriptionsStore();

const transcriptions = ref(
    transcriptionStore.currentTranscription?.segments ?? [],
);

const container = ref<HTMLDivElement | null>(null);

const stageWidth = computed(() => container.value?.clientWidth ?? 100);
const stageHeight = 100;
const selectedSegment = ref<string>();

const configKonva = computed(
    () =>
        ({
            width: stageWidth.value,
            height: stageHeight + 100,
        }) as StageConfig,
);

// Calculate scaling factor based on the last segment's end time and stage width
const scaleFactor = computed(() => {
    // Find the maximum end time from all segments
    const maxEndTime =
        transcriptions.value.length > 0
            ? Math.max(...transcriptions.value.map((segment) => segment.end))
            : 1; // Default to 1 if no segments

    // Calculate scaling factor to fit all segments within stage width
    return stageWidth.value / maxEndTime;
});

watch(scaleFactor, () => {
    console.log('Scale factor changed', scaleFactor.value);
});

const rectConfigs = computed(() =>
    transcriptions.value.map(
        (segment) =>
            ({
                id: segment.id,
                // Scale x position and width to fit stage width
                x: segment.start * scaleFactor.value,
                y: 0,
                width: (segment.end - segment.start) * scaleFactor.value,
                height: stageHeight,
                fill: selectedSegment.value == segment.id ? 'green' : 'blue',
                // Add stroke to make segments visually distinct
                stroke: 'black',
                strokeWidth: 1,
                strokeEnabled: true,
                fillEnabled: true,
                draggable: true,
                dragBoundFunc: (pos: Vector2d) => {
                    const width =
                        (segment.end - segment.start) * scaleFactor.value;
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
        props.currentTime * scaleFactor.value, 0,
        props.currentTime * scaleFactor.value, stageHeight],
    stroke: 'red',
    strokeWidth: 1,
} as LineConfig));

watch(
    () => transcriptionStore.currentTranscription,
    (currentTranscription) => {
        transcriptions.value = currentTranscription?.segments ?? [];
    },
);

watch(
    () => [...rectConfigs.value],
    () => {
        console.log('Rect configs changed', rectConfigs.value);
    },
);

function onSegmentClicked(segmentId: string): void {
    console.log('Segment clicked', segmentId);

    selectedSegment.value = segmentId;
}
</script>

<template>
    <div ref="container" class="w-full">
        <v-stage :config="configKonva">
            <v-layer>
                <v-rect @click="onSegmentClicked(rectConfig.id!)" v-for="(rectConfig, index) in rectConfigs"
                    :key="index" :config="rectConfig" />
                <v-line :config="trackLineConfig" />
            </v-layer>
        </v-stage>
    </div>
</template>

<style></style>
