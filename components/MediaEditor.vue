<script lang="ts" setup>
import { SeekToSecondsCommand, TogglePlayCommand } from '~/types/commands';
import AudioSpectrogram from './media/AudioSpectrogram.vue';
import CurrentSegementEditor from './media/CurrentSegementEditor.vue';
import TimelineView from './media/TimelineView.client.vue';
import VideoView from './media/VideoView.vue';
import RenameSpeakerView from './RenameSpeakerView.vue';

const audioFile = ref<Blob>(); // Reference to the uploaded audio file
const audioSrc = ref<string>(''); // URL to the audio file
const currentTime = ref<number>(0); // Current playback position in seconds
const duration = ref<number>(0); // Total audio duration in seconds
const zoomX = computed(() => duration.value / (timeRange.value[1] - timeRange.value[0]))

const timeRange = ref([0, duration.value]);

const transcriptionStore = useTranscriptionsStore();
const { executeCommand } = useCommandBus();

onMounted(() => {
    const currentTranscription = transcriptionStore.currentTranscription;

    if (!currentTranscription?.mediaFile) {
        return;
    }

    audioFile.value = currentTranscription.mediaFile;
    audioSrc.value = URL.createObjectURL(audioFile.value);

    // calculate duration
    const audio = new Audio();
    audio.src = audioSrc.value;

    audio.onloadedmetadata = () => {
        duration.value = audio.duration;
        timeRange.value = [0, audio.duration];
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

    if (end <= start) {
        return;
    }

    timeRange.value[0] = Math.max(0, start);
    timeRange.value[1] = Math.min(duration.value, end);

    event.preventDefault();
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
        const delta = (event.clientX - mouseDownStart.value);

        const start = timeRange.value[0] - delta;
        const end = timeRange.value[1] - delta;

        if (end <= start || start < 0 || end > duration.value) {
            return;
        }

        timeRange.value[0] = Math.max(0, start);
        timeRange.value[1] = Math.min(duration.value, end);

        mouseDownStart.value = event.clientX;
    }
}

function handleSpaceDown(event: KeyboardEvent) {
    event.preventDefault();
}

function handleSpaceUp(event: KeyboardEvent) {
    togglePlay(event);
    event.preventDefault();
}

function handleLeftPress(event: KeyboardEvent) {
    const newTime = Math.max(0, currentTime.value - 5);
    executeCommand(new SeekToSecondsCommand(newTime));
    event.preventDefault();
}

function handleRightPress(event: KeyboardEvent) {
    const newTime = Math.min(duration.value, currentTime.value + 5);
    executeCommand(new SeekToSecondsCommand(newTime));
    event.preventDefault();
}

function togglePlay(event: KeyboardEvent) {
    executeCommand(new TogglePlayCommand());
    event.preventDefault();
}
</script>

<template>
    <div>
        <div v-if="audioFile && duration > 0">

            <div @keyup.space="handleSpaceUp" @keydown.space="handleSpaceDown" @keypress.left="handleLeftPress"
                @keypress.right="handleRightPress" tabindex="0">
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

                <USlider v-model="timeRange" :min="0" :max="duration" />
            </div>


            <CurrentSegementEditor :currentTime="currentTime" />
            <RenameSpeakerView />
        </div>
    </div>
</template>