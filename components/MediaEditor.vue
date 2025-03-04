<script lang="ts" setup>
import type { SeekToSecondsCommand } from '~/types/commands';
import { Cmds } from '~/types/commands';

const audioElement = ref<HTMLAudioElement>(); // Reference to the audio element
const isPlaying = ref<boolean>(false); // Flag to indicate playback status
const audioFile = ref<Blob>(); // Reference to the uploaded audio file
const audioSrc = ref<string>(''); // URL to the audio file
const currentTime = ref<number>(0); // Current playback position in seconds
const duration = ref<number>(0); // Total audio duration in seconds

const transcriptionStore = useTranscriptionsStore();
const { registerHandler, unregisterHandler } = useCommandBus();

onMounted(() => {
    registerHandler(Cmds.SeekToSecondsCommand, handleSeekToSeconds);
});

onUnmounted(() => {
    unregisterHandler(Cmds.SeekToSecondsCommand, handleSeekToSeconds);
});

watch(
    () => transcriptionStore.currentTranscription,
    (currentTranscription) => {
        if (!currentTranscription?.audioFile) {
            return;
        }

        audioFile.value = currentTranscription.audioFile;
        audioSrc.value = URL.createObjectURL(audioFile.value);
        duration.value = currentTranscription.audioDuration ?? 0;
        currentTime.value = 0;
    },
    { immediate: true },
);

/**
 * Toggles audio playback
 */
const togglePlay = (): void => {
    if (!audioElement.value) return;

    if (isPlaying.value) {
        audioElement.value.pause();
    } else {
        audioElement.value.play();
    }
    isPlaying.value = !isPlaying.value;
};

const updatePosition = (): void => {
    if (!audioElement.value) return;

    // Update the current time based on the audio element's playback position
    currentTime.value = audioElement.value.currentTime;
};

const seek = (): void => {
    if (!audioElement.value) return;

    // Seek to the specified time
    audioElement.value.currentTime = currentTime.value;
};

const seekTo = (time: number): void => {
    if (!audioElement.value) return;

    // Seek to the specified time
    audioElement.value.currentTime = time;
    currentTime.value = time;
};

/**
 * Formats time in seconds to MM:SS display
 * @param {number} time - Time in seconds
 * @returns {string} Formatted time string
 */
const formatTime = (time: number): string => {
    const minutes: number = Math.floor(time / 60);
    const seconds: number = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

async function handleSeekToSeconds(
    command: SeekToSecondsCommand,
): Promise<void> {
    seekTo(command.seconds);
}
</script>

<template>
    <div>
        <div v-if="audioFile">
            <!-- Audio element with references for control -->
            <audio ref="audioElement" :src="audioSrc" @timeupdate="updatePosition" @seeked="updatePosition" />

            <AudioSpectrogram :audio-file="audioFile" :current-time="currentTime" :duration="duration"
                @on-seeked="seekTo" />

            <ClientOnly>
                <TimelineView :current-time="currentTime" />
            </ClientOnly>

            <!-- Playback controls -->
            <div class="controls">
                <UButton @click="togglePlay">
                    {{ isPlaying ? 'Pause' : 'Play' }}
                </UButton>
                <input v-model="currentTime" type="range" :min="0" :max="duration" step="0.1" @input="seek">
                <span>
                    {{ formatTime(currentTime) }} / {{ formatTime(duration) }}
                </span>
            </div>
        </div>
    </div>
</template>

<style></style>
