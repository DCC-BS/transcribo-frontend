<script lang="ts" setup>
import { SeekToSecondsCommand, TogglePlayCommand } from '~/types/commands';
import AudioSpectrogram from './media/AudioSpectrogram.vue';
import CurrentSegementEditor from './media/CurrentSegementEditor.vue';
import TimelineView from './media/TimelineView.client.vue';
import VideoView from './media/VideoView.vue';
import RenameSpeakerView from './RenameSpeakerView.vue';
import { match } from 'ts-pattern';

const audioFile = ref<Blob>(); // Reference to the uploaded audio file
const currentTime = ref<number>(0); // Current playback position in seconds
const duration = ref<number>(0); // Total audio duration in seconds
const zoomX = computed(() => duration.value / (timeRange.value[1] - timeRange.value[0]))

const timeRange = ref([0, duration.value]);

const transcriptionStore = useTranscriptionsStore();
const { executeCommand } = useCommandBus();

onMounted(() => {
    duration.value = 0;
    const currentTranscription = transcriptionStore.currentTranscription;

    if (!currentTranscription?.mediaFile) {
        return;
    }

    audioFile.value = currentTranscription.mediaFile;
    const audioSrc = URL.createObjectURL(audioFile.value);

    // calculate duration
    const audio = new Audio();
    audio.src = audioSrc;

    audio.onloadedmetadata = () => {
        console.log(audio.duration);
        duration.value = audio.duration;
        timeRange.value = [0, audio.duration];

        URL.revokeObjectURL(audioSrc);
        audio.onloadedmetadata = null;
    };

    currentTime.value = 0;
});

function handleWheel(event: WheelEvent): void {
    const delta = event.deltaY * -0.1;

    const target = event.target as HTMLElement;
    const w = target.clientWidth;
    const x = event.offsetX;

    const startFactor = x / w;
    const endFactor = 1 - startFactor;

    const start = timeRange.value[0] + (delta * startFactor);
    const end = timeRange.value[1] - (delta * endFactor);

    event.preventDefault();

    if (end <= start + 0.01) {
        return;
    }

    timeRange.value[0] = Math.max(0, start);
    timeRange.value[1] = Math.min(duration.value, end);

}

const mouseDownStart = ref<number>();

function handleMouseDown(event: MouseEvent) {
    if (event.ctrlKey) {
        mouseDownStart.value = event.clientX;
        event.preventDefault();
        event.stopPropagation();
    }
}

function handleMouseUp(event: MouseEvent) {
    mouseDownStart.value = undefined;
}

function handleMouseMove(event: MouseEvent) {
    if (mouseDownStart.value !== undefined) {
        // Calculate how many pixels we moved
        const pixelDelta = event.clientX - mouseDownStart.value;

        // Convert pixels to time using the current zoom level
        // Negative because dragging left (negative pixels) should move timeline right (positive time)
        const timeDelta = -pixelDelta / zoomX.value;

        // Calculate new time range
        const start = timeRange.value[0] + timeDelta;
        const end = timeRange.value[1] + timeDelta;

        // Safety checks
        if (start < 0) {
            // Don't go before the beginning
            timeRange.value = [0, timeRange.value[1] - timeRange.value[0]];
        } else if (end > duration.value) {
            // Don't go past the end
            timeRange.value = [duration.value - (timeRange.value[1] - timeRange.value[0]), duration.value];
        } else {
            // Normal case - move the window
            timeRange.value = [start, end];
        }

        // Update the mouse position for next movement
        mouseDownStart.value = event.clientX;
    }
}

function handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'ArrowLeft') {
        handleLeftPress(event);
    } else if (event.key === 'ArrowRight') {
        handleRightPress(event);
    } else if (event.key === ' ') {
        // Space handling moved here
        handleSpaceDown(event);
    }
}

function handleKeyUp(event: KeyboardEvent) {
    // Handle key up events
    if (event.key === ' ') {
        handleSpaceUp(event);
    }
}

function handleSpaceDown(event: KeyboardEvent) {
    event.preventDefault();
}

function handleSpaceUp(event: KeyboardEvent) {
    executeCommand(new TogglePlayCommand());
    event.preventDefault();
}

const getSkipTime = (event: KeyboardEvent) =>
    match(event)
        .with({ shiftKey: true }, () => 30)
        .with({ ctrlKey: true }, () => 1)
        .otherwise(() => 5);

function handleLeftPress(event: KeyboardEvent) {
    const skipTime = getSkipTime(event);

    const newTime = Math.max(0, currentTime.value - skipTime);
    executeCommand(new SeekToSecondsCommand(newTime));
    event.preventDefault();
}

function handleRightPress(event: KeyboardEvent) {
    const skipTime = getSkipTime(event);

    const newTime = Math.min(duration.value, currentTime.value + skipTime);
    executeCommand(new SeekToSecondsCommand(newTime));
    event.preventDefault();
}

// Watch the current time to ensure it stays within the visible range
watch(currentTime, (newTime) => {
    // If current time moves outside the visible range
    if (newTime < timeRange.value[0] || newTime > timeRange.value[1]) {
        // Calculate the current view width/duration
        const rangeWidth = timeRange.value[1] - timeRange.value[0];

        // Determine new start and end positions
        let newStart: number;
        let newEnd: number;

        if (newTime < timeRange.value[0]) {
            // If current time is before visible range, align to left edge
            newStart = Math.max(0, newTime);
            newEnd = newStart + rangeWidth;
        } else {
            // If current time is after visible range, align to right edge
            newEnd = Math.min(duration.value, newTime);
            newStart = Math.max(0, newEnd - rangeWidth);
        }

        // Update the time range
        timeRange.value = [newStart, newEnd];
    }
});
</script>

<template>
    <div class="p-1">
        <div v-if="audioFile && duration > 0">
            <div @keydown="handleKeyDown" @keyup="handleKeyUp" tabindex="0">
                <VideoView v-model="currentTime" :duration="duration" />

                <ClientOnly>
                    <div @wheel="handleWheel" @mousedown="handleMouseDown" @mouseup="handleMouseUp"
                        @mousemove="handleMouseMove">

                        <AudioSpectrogram :audio-file="audioFile" :current-time="currentTime" :duration="duration"
                            :zoomX="zoomX" :startTime="timeRange[0]" />

                        <TimelineView :current-time="currentTime" :duration="duration" :zoomX="zoomX"
                            :startTime="timeRange[0]" :endTime="timeRange[1]" />
                    </div>
                </ClientOnly>

                <USlider v-model="timeRange" :min="0" :max="duration" class="my-2" />
            </div>


            <CurrentSegementEditor :currentTime="currentTime" class="m-2" />
            <RenameSpeakerView class="m-2" />

            <DataBsBanner class="mt-4" />
        </div>
    </div>
</template>