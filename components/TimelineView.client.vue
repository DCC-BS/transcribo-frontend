<script lang="ts" setup>
import type { StageConfig } from 'konva/lib/Stage';
import type { RectConfig } from 'konva/lib/shapes/Rect';
import type { Vector2d } from 'konva/lib/types';
import { ZoomToCommand } from '~/types/commands';

interface TimelineViewProps {
    currentTime: number;
    duration: number;
    zoomX: number;
    startTime: number;
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

const { getSpeakerColor } = useSpeakerColor(speakers);

const stageWidth = computed(() => container.value?.clientWidth ?? 100);
const selectedSegment = ref<string>();
const stageHeight = computed(() => speakers.value.length * heightPerSpeaker);

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
            offsetX: offsetX.value,
            scaleX: props.zoomX,
        }) as StageConfig,
);

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
                dragBoundFunc: (pos: Vector2d) => {
                    const width =
                        fromTimetoPixelSpace(segment.end - segment.start);
                    const newX = Math.max(
                        0,
                        Math.min(stageWidth.value - width, pos.x),
                    );
                    return {
                        x: newX,
                        y: speakerToIndex.value[segment.speaker ?? 'unknown'] * heightPerSpeaker,
                    };
                },
            }) as RectConfig,
    ),
);

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

function onScroll(event: WheelEvent): void {
    const xZoom = event.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = props.zoomX * xZoom;
    const newOffset = props.startTime + (event.deltaY > 0 ? 10 : -10);

    executeCommand(new ZoomToCommand(newZoom, newOffset));
}
</script>

<template>
    <div ref="container" class="w-full">
        <v-stage :config="configKonva" @scroll="onScroll">
            <v-layer>
                <v-rect
v-for="(rectConfig, index) in rectConfigs" :key="index" :config="rectConfig"
                    @click="onSegmentClicked(rectConfig.id!)" />
                <v-line :config="playheadLineConfig" />
            </v-layer>
        </v-stage>
    </div>
</template>

<style></style>
