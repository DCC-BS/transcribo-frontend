<script lang="ts" setup>
import { match } from "ts-pattern";
import { SeekToSecondsCommand } from "~/types/commands";
import type { StoredTranscription } from "~/types/storedTranscription";
import TimelineView from "./media/TimelineView.client.vue";

interface InputProps {
    transcription: StoredTranscription;
    currentTime: number;
}

const props = defineProps<InputProps>();

const duration = ref<number>(0);
const timeRange = ref<[number, number]>([0, 0]);

const zoomX = computed(
    () => duration.value / (timeRange.value[1] - timeRange.value[0]),
);

const { executeCommand } = useCommandBus();

onMounted(() => {
    initializeDuration();
});

watch(
    () => props.transcription,
    () => {
        initializeDuration();
    },
);

function initializeDuration(): void {
    const currentTranscription = props.transcription;

    if (!currentTranscription?.mediaFile) {
        return;
    }

    const audioSrc = URL.createObjectURL(currentTranscription.mediaFile);
    const audio = new Audio();
    audio.src = audioSrc;

    audio.onloadedmetadata = () => {
        duration.value = audio.duration;
        timeRange.value = [0, audio.duration];
        URL.revokeObjectURL(audioSrc);
        audio.onloadedmetadata = null;
    };
}

function handleWheel(event: WheelEvent): void {
    const delta = event.deltaY * -0.1;

    const target = event.target as HTMLElement;
    const w = target.clientWidth;
    const x = event.offsetX;

    const startFactor = x / w;
    const endFactor = 1 - startFactor;

    const start = timeRange.value[0] + delta * startFactor;
    const end = timeRange.value[1] - delta * endFactor;

    event.preventDefault();

    if (end <= start + 0.01) {
        return;
    }

    timeRange.value[0] = Math.max(0, start);
    timeRange.value[1] = Math.min(duration.value, end);
}

const mouseDownStart = ref<number>();

function handleMouseDown(event: MouseEvent): void {
    if (event.ctrlKey) {
        mouseDownStart.value = event.clientX;
        event.preventDefault();
        event.stopPropagation();
    }
}

function handleMouseUp(_: MouseEvent): void {
    mouseDownStart.value = undefined;
}

function handleMouseMove(event: MouseEvent): void {
    if (mouseDownStart.value !== undefined) {
        const pixelDelta = event.clientX - mouseDownStart.value;
        const timeDelta = -pixelDelta / zoomX.value;

        const start = timeRange.value[0] + timeDelta;
        const end = timeRange.value[1] + timeDelta;

        if (start < 0) {
            timeRange.value = [0, timeRange.value[1] - timeRange.value[0]];
        } else if (end > duration.value) {
            timeRange.value = [
                duration.value - (timeRange.value[1] - timeRange.value[0]),
                duration.value,
            ];
        } else {
            timeRange.value = [start, end];
        }

        mouseDownStart.value = event.clientX;
    }
}

function handleKeyDown(event: KeyboardEvent): void {
    if (event.key === "ArrowLeft") {
        handleLeftPress(event);
    } else if (event.key === "ArrowRight") {
        handleRightPress(event);
    }
}

const getSkipTime = (event: KeyboardEvent) =>
    match(event)
        .with({ shiftKey: true }, () => 30)
        .with({ ctrlKey: true }, () => 1)
        .otherwise(() => 5);

function handleLeftPress(event: KeyboardEvent): void {
    const skipTime = getSkipTime(event);
    const newTime = Math.max(0, props.currentTime - skipTime);
    executeCommand(new SeekToSecondsCommand(newTime));
    event.preventDefault();
}

function handleRightPress(event: KeyboardEvent): void {
    const skipTime = getSkipTime(event);
    const newTime = Math.min(duration.value, props.currentTime + skipTime);
    executeCommand(new SeekToSecondsCommand(newTime));
    event.preventDefault();
}

watch(
    () => props.currentTime,
    (newTime) => {
        if (newTime < timeRange.value[0] || newTime > timeRange.value[1]) {
            const rangeWidth = timeRange.value[1] - timeRange.value[0];

            let newStart: number;
            let newEnd: number;

            if (newTime < timeRange.value[0]) {
                newStart = Math.max(0, newTime);
                newEnd = newStart + rangeWidth;
            } else {
                newEnd = Math.min(duration.value, newTime);
                newStart = Math.max(0, newEnd - rangeWidth);
            }

            timeRange.value = [newStart, newEnd];
        }
    },
);
</script>

<template>
    <div class="h-full flex flex-col">
        <div v-if="duration > 0" class="flex-1 flex flex-col min-h-0" tabindex="0" @keydown="handleKeyDown">
            <div class="px-2 pt-2 pb-1 shrink-0">
                <USlider v-model="timeRange" :min="0" :max="duration" />
            </div>

            <ClientOnly>
                <div
                    class="flex-1 min-h-0"
                    @wheel="handleWheel"
                    @mousedown="handleMouseDown"
                    @mouseup="handleMouseUp"
                    @mousemove="handleMouseMove"
                >
                    <TimelineView
                        :transcription="props.transcription"
                        :current-time="props.currentTime"
                        :duration="duration"
                        :zoom-x="zoomX"
                        :start-time="timeRange[0]"
                        :end-time="timeRange[1]"
                    />
                </div>
            </ClientOnly>
        </div>
        <div v-else class="flex items-center justify-center h-full text-muted-foreground">
            Loading timeline...
        </div>
    </div>
</template>
