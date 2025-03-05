<script lang="ts" setup>
import type { ZoomToCommand } from '~/types/commands';
import { Cmds } from '~/types/commands';
import VideoView from './VideoView.vue';

const audioFile = ref<Blob>(); // Reference to the uploaded audio file
const audioSrc = ref<string>(''); // URL to the audio file
const currentTime = ref<number>(0); // Current playback position in seconds
const duration = ref<number>(0); // Total audio duration in seconds
const zoomX = ref<number>(1);
const startTime = ref<number>(0);

const timeRange = ref([0, duration.value]);

const transcriptionStore = useTranscriptionsStore();
const { registerHandler, unregisterHandler } = useCommandBus();

onMounted(() => {
    registerHandler(Cmds.ZoomToCommand, handleZoomTo);
});

onUnmounted(() => {
    unregisterHandler(Cmds.ZoomToCommand, handleZoomTo);
});

watch(
    () => transcriptionStore.currentTranscription,
    (currentTranscription) => {
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
    },
    { immediate: true },
);

watch(timeRange, ([start, end]) => {
    zoomX.value = duration.value / (end - start);
    startTime.value = start;
});

async function handleZoomTo(command: ZoomToCommand): Promise<void> {
    zoomX.value = command.zoomX;
    startTime.value = command.posX;
}
</script>

<template>
    <div>
        <div v-if="audioFile">
            <VideoView v-model="currentTime" :duration="duration" />
                
            <ClientOnly>
                <AudioSpectrogram :audio-file="audioFile" :current-time="currentTime" :duration="duration" :zoomX="zoomX"
                :startTime="startTime" />

                <TimelineView :current-time="currentTime" :duration="duration" :zoomX="zoomX" :startTime="startTime" />
            </ClientOnly>

            <USlider v-model="timeRange" :min="0" :max="duration" />
        </div>
    </div>
</template>