<script lang="ts" setup>

interface VideoViewProps {
    currentTime: number;
    duration: number;
}

const props = defineProps<VideoViewProps>();

const transcriptionStore = useTranscriptionsStore();

const mediaFile = ref<Blob | null>(null);
const mediaSrc = ref<string>('');
const segments = ref(transcriptionStore.currentTranscription?.segments ?? []);
const videoElement = ref<HTMLVideoElement | null>(null);
const isPlaying = ref<boolean>(false);
const isVideoFile = ref<boolean>(false);
const speakerColors = ref<Record<string, string>>({});

// Function to check if the file is a video
const checkIfVideoFile = (file: Blob): boolean => {
    // Check if the MIME type starts with 'video/'
    return file.type.startsWith('video/');
};

// Function to generate consistent colors for speakers
const generateSpeakerColors = () => {
    const colors = ['#FF5733', '#33A8FF', '#33FF57', '#B533FF', '#FF33E9', '#FFD133', '#33FFE1'];
    const colorMap: Record<string, string> = {};

    if (transcriptionStore.currentTranscription?.segments) {
        const uniqueSpeakers = Array.from(new Set(
            transcriptionStore.currentTranscription.segments.map(segment => segment.speaker)
        ));

        uniqueSpeakers.forEach((speaker, index) => {
            colorMap[speaker] = colors[index % colors.length];
        });
    }

    speakerColors.value = colorMap;
};

// Function to get currently visible segments based on current time
const currentSegments = computed(() => {
    // Return segments that include the current time
    return segments.value.filter(segment =>
        props.currentTime >= segment.start &&
        props.currentTime <= segment.end
    );
});

watch(() => transcriptionStore.currentTranscription, (currentTranscription) => {
    if (!currentTranscription?.mediaFile) {
        return;
    }

    mediaFile.value = currentTranscription.mediaFile;
    mediaSrc.value = URL.createObjectURL(mediaFile.value);

    // Update segments and check if media is video
    segments.value = currentTranscription.segments ?? [];
    isVideoFile.value = checkIfVideoFile(currentTranscription.mediaFile);

    // Generate colors for different speakers
    generateSpeakerColors();

    isPlaying.value = false;
},
    { immediate: true },
);

watch(() => props.currentTime, (currentTime) => {
    if (videoElement.value) {
        videoElement.value.currentTime = currentTime;
    }
});

</script>

<template>
    <div class="media-container">
        <!-- Show video if it's a video file -->
        <video v-if="isVideoFile && mediaFile" ref="videoElement" class="media-player">
            <source :src="mediaSrc" type="video/mp4">
        </video>

        <!-- Show audio visualization if it's not a video file -->
        <div v-else class="audio-visualization">
            <!-- Black bar as a simple placeholder for audio -->
            <div class="audio-bar"></div>
        </div>

        <!-- Subtitles section - now positioned at the bottom of the media -->
        <div class="subtitles-container">
            <div v-for="segment in currentSegments" :key="segment.id" class="subtitle-segment"
                :style="{ color: speakerColors[segment.speaker] || '#FFFFFF' }">
                <span class="speaker-label">{{ segment.speaker }}:</span>
                <span class="subtitle-text">{{ segment.text }}</span>
            </div>
        </div>
    </div>
</template>

<style>
.media-container {
    display: flex;
    flex-direction: column;
    width: 100%;
    margin: 0 auto;
    position: relative;
    /* Add position relative to contain absolute positioned children */
}

.media-player {
    width: 100%;
    border-radius: 4px;
}

.audio-visualization {
    width: 100%;
    height: 80px;
    background-color: #000;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.audio-bar {
    width: 90%;
    height: 20px;
    background-color: #000;
    border-radius: 2px;
}

.subtitles-container {
    position: absolute;
    /* Position absolutely to overlay on video/audio */
    bottom: 10px;
    /* Position at the bottom with small margin */
    left: 0;
    right: 0;
    background-color: rgba(0, 0, 0, 0.7);
    border-radius: 4px;
    padding: 12px;
    min-height: 40px;
    /* Reduced min-height for more compact appearance */
    z-index: 10;
    /* Ensure subtitles appear above the video */
    margin: 0 auto;
    /* Center horizontally */
    max-width: 90%;
    /* Add some side margins */
}

.subtitle-segment {
    margin-bottom: 8px;
    font-size: 16px;
    line-height: 1.5;
}

.speaker-label {
    font-weight: bold;
    margin-right: 6px;
}

.subtitle-text {
    font-weight: normal;
}
</style>