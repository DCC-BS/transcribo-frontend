<script lang="ts" setup>
import type { StoredSegment } from "~/stores/migrations/v4/storedSegments";
import type { StoredTranscription } from "~/types/storedTranscription";
import { formatTime } from "~/utils/time";

interface MediaPlaybackBarProps {
    transcription: StoredTranscription;
    segments: StoredSegment[];
    duration: number;
}

const props = defineProps<MediaPlaybackBarProps>();

const currentTime = defineModel<number>({ required: true });

const isExpanded = ref(false);

const {
    mediaFile,
    mediaSrc,
    videoElement,
    audioElement,
    isPlaying,
    isVideoFile,
    playbackRate,
    togglePlay,
    seekTo,
    onTimeUpdate,
} = useMediaPlayback(() => props.transcription, currentTime);

const { getSpeakerColor, displayName } = useSpeakerRegistry();

const currentSegments = computed(() => {
    return props.segments.filter(
        (segment) =>
            currentTime.value >= segment.start &&
            currentTime.value < segment.end,
    );
});

function toggleExpanded(): void {
    isExpanded.value = !isExpanded.value;
}

</script>

<template>
    <div
        id="media-playback-bar"
        class="flex-none border-t border-default bg-default"
    >
        <!-- We cannot use v-if here because the video needs to exist so it
             can be played, therefore we use v-show -->
        <div
            v-show="isExpanded"
            class="relative mx-auto w-fit p-2"
            :class="{ 'w-full': !isVideoFile }"
        >
            <!-- biome-ignore lint/a11y/useMediaCaption: User-uploaded media may not have captions -->
            <video
                v-if="isVideoFile && mediaFile"
                ref="videoElement"
                class="block max-h-75 rounded"
                playsinline
                webkit-playsinline
                @timeupdate="onTimeUpdate"
                @click="togglePlay"
            >
                <source :src="mediaSrc" :type="mediaFile.type" />
            </video>

            <div
                class="absolute inset-x-2 bottom-2 flex min-h-7.5 justify-center rounded bg-[rgba(177,177,177,0.9)] px-3 py-2"
            >
                <div
                    v-for="segment in currentSegments"
                    :key="segment.id"
                    class="text-base [-webkit-text-stroke:0.5px_#313131]"
                    :style="{
                        color: getSpeakerColor(
                            segment.speaker ?? 'unknown',
                        ).toString(),
                    }"
                >
                    <span class="font-bold">{{ displayName(segment.speaker ?? undefined) }}: </span>
                    <span>{{ segment.text }}</span>
                </div>
            </div>
        </div>
        <audio
            v-if="!isVideoFile && mediaFile"
            ref="audioElement"
            :src="mediaSrc"
            @timeupdate="onTimeUpdate"
        />

        <!-- chip track on its own row, controls centered beneath — the
             centered play group mirrors the editor dock and keeps the
             round play button away from the footer branding below -->
        <div class="flex flex-col gap-1.5 px-5 pt-2.5 pb-2">
            <PlaybarChipTrack
                :current-time="currentTime"
                :duration="props.duration"
                compact-chip
                @seek="seekTo"
            />

            <div class="relative flex items-center justify-center gap-3">
                <span
                    class="text-[0.78rem] tabular-nums text-muted"
                >
                    {{
                        formatTime(currentTime, {
                            milliseconds: false,
                            minimumMinuteDigits: 2,
                        })
                    }} /
                    {{ formatTime(props.duration, { milliseconds: false }) }}
                </span>
                <PlayButton
                    :playing="isPlaying"
                    tone="primary"
                    @click="togglePlay"
                />
                <PlaybackSpeedButton v-model="playbackRate" />

                <UButton
                    v-if="isVideoFile"
                    id="media-expand-button"
                    class="absolute right-0"
                    size="sm"
                    variant="ghost"
                    color="neutral"
                    :icon="
                        isExpanded
                            ? 'i-lucide-chevron-down'
                            : 'i-lucide-chevron-up'
                    "
                    :aria-label="isExpanded ? 'Collapse' : 'Expand'"
                    @click="toggleExpanded"
                />
            </div>
        </div>
    </div>
</template>
