<script lang="ts" setup>
import type { RGBColor } from '~/types/color';
import type { TogglePlayCommand, Cmds, type SeekToSecondsCommand } from '~/types/commands';

// Import useI18n composable
const { t } = useI18n();

interface VideoViewProps {
    duration: number;
}

const props = defineProps<VideoViewProps>();
const transcriptionStore = useTranscriptionsStore();

const mediaFile = ref<Blob | null>(null);
const mediaSrc = ref<string>('');
const segments = shallowRef(transcriptionStore.currentTranscription?.segments ?? []);
const videoElement = ref<HTMLVideoElement | null>(null);
const isPlaying = ref<boolean>(false);
const isVideoFile = ref<boolean>(false);

const audioElement = ref<HTMLAudioElement>();

const { getSpeakerColor } = useSpeakerColor(computed(() => Array.from(getUniqueSpeakers(segments.value))));
const { registerHandler, unregisterHandler } = useCommandBus();

const currentTime = defineModel<number>({ default: 0 });

onMounted(() => {
    registerHandler(Cmds.SeekToSecondsCommand, handleSeekToSeconds);
    registerHandler(Cmds.TogglePlayCommand, handleTooglePlayCommand);
});

onUnmounted(() => {
    unregisterHandler(Cmds.SeekToSecondsCommand, handleSeekToSeconds);
    unregisterHandler(Cmds.TogglePlayCommand, handleTooglePlayCommand);
});

// Function to check if the file is a video
const checkIfVideoFile = (file: Blob): boolean => {
    // Check if the MIME type starts with 'video/'
    return file.type.startsWith('video/');
};

// Function to get currently visible segments based on current time
const currentSegments = computed(() => {
    // Return segments that include the current time
    return segments.value.filter(segment =>
        currentTime.value >= segment.start &&
        currentTime.value < segment.end
    );
});

async function handleTooglePlayCommand(_: TogglePlayCommand) {
    togglePlay();
}

/**
 * Toggles audio playback
 */
const togglePlay = (): void => {
    if (videoElement.value) {
        if (isPlaying.value) {
            videoElement.value.pause();
        } else {
            videoElement.value.play();
        }
    }
    else if (audioElement.value) {
        if (isPlaying.value) {
            audioElement.value.pause();
        } else {
            audioElement.value.play();
        }
    }

    isPlaying.value = !isPlaying.value;
};

watch(() => transcriptionStore.currentTranscription, (currentTranscription) => {
    if (!currentTranscription?.mediaFile) {
        return;
    }

    mediaFile.value = currentTranscription.mediaFile;
    mediaSrc.value = URL.createObjectURL(mediaFile.value);

    // Update segments and check if media is video
    segments.value = currentTranscription.segments ?? [];
    isVideoFile.value = checkIfVideoFile(currentTranscription.mediaFile);

    isPlaying.value = false;
},
    { immediate: true },
);

const seekTo = (time: number): void => {
    if (audioElement.value && audioElement.value.currentTime !== time) {
        audioElement.value.currentTime = time;

    } else if (videoElement.value && videoElement.value.currentTime !== time) {
        videoElement.value.currentTime = time;
    }

    currentTime.value = time;
};

function onTimeUpdate(): void {
    if (videoElement.value) {
        currentTime.value = videoElement.value.currentTime;
    }
    else if (audioElement.value) {
        currentTime.value = audioElement.value.currentTime;
    }
}

async function handleSeekToSeconds(
    command: SeekToSecondsCommand,
): Promise<void> {
    seekTo(command.seconds);
}

</script>

<template>
    <div class="media-container">
        <!-- Show video if it's a video file -->
        <video
v-if="isVideoFile && mediaFile" ref="videoElement" class="media-player" @timeupdate="onTimeUpdate"
            @click="togglePlay">
            <source :src="mediaSrc" type="video/mp4">
        </video>

        <!-- Show audio visualization if it's not a video file -->
        <div v-else class="audio-bar">
            <!-- Audio element with references for control -->
            <audio ref="audioElement" :src="mediaSrc" @timeupdate="onTimeUpdate" />
        </div>

        <!-- Subtitles section - now positioned at the bottom of the media -->
        <div class="subtitles-container">
            <div
v-for="segment in currentSegments" :key="segment.id" class="subtitle-segment" :style="{
                '--text-color': getSpeakerColor(segment.speaker ?? 'unknown').toString()
            }">
                <span class="font-bold">{{ segment.speaker }}: </span>
                <span>{{ segment.text }}</span>
            </div>
        </div>
    </div>
    <!-- Playback controls -->
    <div class="controls flex gap-2 items-center my-3">
        <UButton @click="togglePlay">
            {{ isPlaying ? t('media.pause') : t('media.play') }}
        </UButton>

        <USlider
v-model="currentTime" :min="0" :max="props.duration" :step="0.1"
            @update:model-value="v => seekTo(v as number)"/>
        <div class="w-[100px]">
            {{ formatTime(currentTime, { milliseconds: false }) }} / {{ formatTime(props.duration, {
                milliseconds:
                    false
            }) }}
        </div>
    </div>
</template>

<style lang="scss">
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

.audio-bar {
    width: 100%;
    height: 100px;
}

.subtitles-container {
    position: absolute;
    /* Position absolutely to overlay on video/audio */
    bottom: 10px;
    /* Position at the bottom with small margin */
    left: 0;
    right: 0;
    background-color: rgba(177, 177, 177, 0.9);
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
    font-size: 20px;
    color: var(--text-color);
    -webkit-text-stroke: 0.5px #313131;
}
</style>