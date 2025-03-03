<script lang="ts" setup>

const audioElement = ref<HTMLAudioElement>(); // Reference to the audio element
const isPlaying = ref<boolean>(false); // Flag to indicate playback status
const audioFile = ref<File>(); // Reference to the uploaded audio file
const audioSrc = ref<string>(''); // URL to the audio file
const currentTime = ref<number>(0); // Current playback position in seconds
const duration = ref<number>(0); // Total audio duration in seconds

const loadAudio = async (event: Event): Promise<void> => {
    if (!event.target) {
        return;
    }

    const target = event.target as HTMLInputElement;
    if (!target.files || target.files.length === 0) {
        return;
    }

    audioFile.value = target.files[0]; // Update the reference to the uploaded audio file
    audioSrc.value = URL.createObjectURL(audioFile.value); // Create a URL for the audio file
};

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
</script>

<template>
    <div>
        <!-- File input for audio upload -->
        <input type="file" @change="loadAudio" accept="audio/*" />

        <div v-if="audioFile">
            <!-- Audio element with references for control -->
            <audio ref="audioElement" :src="audioSrc" @timeupdate="updatePosition" @seeked="updatePosition"></audio>

            <AudioSpectrogram :audioFile="audioFile" :currentTime="currentTime" :duration="duration"
                @onSeeked="seekTo" />

            <!-- Playback controls -->
            <div class="controls">
                <UButton @click="togglePlay">{{ isPlaying ? 'Pause' : 'Play' }}</UButton>
                <input type="range" :min="0" :max="duration" v-model="currentTime" @input="seek" step="0.1" />
                <span>{{ formatTime(currentTime) }} / {{ formatTime(duration) }}</span>
            </div>
        </div>
    </div>
</template>


<style></style>