<script lang="ts" setup>
import { Cmds, SeekToSecondsCommand, TogglePlayCommand } from "~/types/commands";
import type { StoredTranscription } from "~/types/storedTranscription";
import { formatTime } from "~/utils/time";

interface MediaPlaybackBarProps {
    transcription: StoredTranscription;
    duration: number;
}

const props = defineProps<MediaPlaybackBarProps>();

const currentTime = defineModel<number>({ default: 0 });
const { t } = useI18n();

const isExpanded = ref(false);
const mediaFile = ref<Blob | null>(null);
const mediaSrc = ref<string>("");
const videoElement = ref<HTMLVideoElement | null>(null);
const audioElement = ref<HTMLAudioElement | null>(null);
const isPlaying = ref<boolean>(false);
const isVideoFile = ref<boolean>(false);

const segments = computed(() => props.transcription.segments ?? []);

const { getSpeakerColor } = useSpeakerColor(
    computed(() => Array.from(getUniqueSpeakers(segments.value))),
);

const { onCommand } = useCommandBus();

const currentSegments = computed(() => {
    return segments.value.filter(
        (segment) =>
            currentTime.value >= segment.start &&
            currentTime.value < segment.end,
    );
});

onMounted(() => {
    loadMedia();
});

onUnmounted(() => {
    if (mediaSrc.value) {
        URL.revokeObjectURL(mediaSrc.value);
    }
});

onCommand<TogglePlayCommand>(Cmds.TogglePlayCommand, async (_) => {
    togglePlay();
});

onCommand<SeekToSecondsCommand>(Cmds.SeekToSecondsCommand, async (cmd) => {
    seekTo(cmd.seconds);
});

watch(
    () => props.transcription,
    () => {
        loadMedia();
    },
    { immediate: true },
);

function loadMedia(): void {
    if (!props.transcription?.mediaFile) {
        return;
    }

    if (mediaSrc.value) {
        URL.revokeObjectURL(mediaSrc.value);
    }

    mediaFile.value = props.transcription.mediaFile;
    mediaSrc.value = URL.createObjectURL(mediaFile.value);
    isVideoFile.value = mediaFile.value.type.startsWith("video/");
    isPlaying.value = false;
}

function togglePlay(): void {
    if (videoElement.value) {
        if (isPlaying.value) {
            videoElement.value.pause();
        } else {
            videoElement.value.play();
        }
    } else if (audioElement.value) {
        if (isPlaying.value) {
            audioElement.value.pause();
        } else {
            audioElement.value.play();
        }
    }
    isPlaying.value = !isPlaying.value;
}

function seekTo(time: number): void {
    if (audioElement.value && audioElement.value.currentTime !== time) {
        audioElement.value.currentTime = time;
    } else if (videoElement.value && videoElement.value.currentTime !== time) {
        videoElement.value.currentTime = time;
    }
    currentTime.value = time;
}

function onTimeUpdate(): void {
    if (videoElement.value) {
        currentTime.value = videoElement.value.currentTime;
    } else if (audioElement.value) {
        currentTime.value = audioElement.value.currentTime;
    }
}

function onSliderChange(value: number | undefined): void {
    if (value !== undefined) {
        seekTo(value);
    }
}

function toggleExpanded(): void {
    isExpanded.value = !isExpanded.value;
}
</script>

<template>
    <div class=" bg-default border-b border-default shadow-sm">
        <div v-if="isExpanded" class="p-2">
            <div class="media-container relative">
                <video
                    v-if="isVideoFile && mediaFile"
                    ref="videoElement"
                    class="media-player w-full rounded"
                    @timeupdate="onTimeUpdate"
                    @click="togglePlay"
                >
                    <source :src="mediaSrc" :type="mediaFile.type">
                </video>

                <div v-else class="audio-visualization w-full h-24 bg-muted rounded flex items-center justify-center">
                    <UIcon name="i-lucide-audio-waveform" class="w-12 h-12 text-muted-foreground" />
                </div>

                <div class="subtitles-container">
                    <div
                        v-for="segment in currentSegments"
                        :key="segment.id"
                        class="subtitle-segment"
                        :style="{
                            '--text-color': getSpeakerColor(segment.speaker ?? 'unknown').toString(),
                        }"
                    >
                        <span class="font-bold">{{ segment.speaker }}: </span>
                        <span>{{ segment.text }}</span>
                    </div>
                </div>
            </div>

            <div class="controls flex gap-2 items-center mt-2">
                <UButton size="sm" @click="togglePlay">
                    <UIcon :name="isPlaying ? 'i-lucide-pause' : 'i-lucide-play'" />
                </UButton>

                <USlider
                    :model-value="currentTime"
                    :min="0"
                    :max="props.duration"
                    :step="0.1"
                    class="flex-1"
                    @update:model-value="onSliderChange"
                />

                <div class="text-sm text-muted-foreground min-w-[100px] text-right">
                    {{ formatTime(currentTime, { milliseconds: false }) }} /
                    {{ formatTime(props.duration, { milliseconds: false }) }}
                </div>

                <UButton size="sm" variant="ghost" @click="toggleExpanded">
                    <UIcon name="i-lucide-chevron-up" />
                </UButton>
            </div>
        </div>

        <div v-else class="flex items-center gap-2 p-2">
            <UButton size="sm" variant="ghost" @click="togglePlay">
                <UIcon :name="isPlaying ? 'i-lucide-pause' : 'i-lucide-play'" />
            </UButton>

            <USlider
                :model-value="currentTime"
                :min="0"
                :max="props.duration"
                :step="0.1"
                class="flex-1"
                @update:model-value="onSliderChange"
            />

            <div class="text-sm text-muted-foreground min-w-[100px] text-right">
                {{ formatTime(currentTime, { milliseconds: false }) }} /
                {{ formatTime(props.duration, { milliseconds: false }) }}
            </div>

            <UButton size="sm" variant="ghost" @click="toggleExpanded">
                <UIcon name="i-lucide-chevron-down" />
            </UButton>
        </div>

        <audio
            v-if="!isVideoFile && mediaFile"
            ref="audioElement"
            :src="mediaSrc"
            @timeupdate="onTimeUpdate"
        />
    </div>
</template>

<style lang="scss" scoped>
.media-container {
    display: flex;
    flex-direction: column;
    width: 100%;
    position: relative;
}

.media-player {
    width: 100%;
    border-radius: 4px;
    max-height: 300px;
    object-fit: contain;
}

.subtitles-container {
    position: absolute;
    bottom: 10px;
    left: 0;
    right: 0;
    background-color: rgba(177, 177, 177, 0.9);
    border-radius: 4px;
    padding: 8px 12px;
    min-height: 30px;
    z-index: 10;
    margin: 0 auto;
    max-width: 90%;
}

.subtitle-segment {
    font-size: 16px;
    color: var(--text-color);
    -webkit-text-stroke: 0.5px #313131;
}
</style>
