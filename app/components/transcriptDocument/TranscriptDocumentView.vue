<script lang="ts" setup>
import type { StoredSegment } from "~/types/storedSegments";
import type { StoredTranscription } from "~/types/storedTranscription";

interface InputProps {
    transcription: StoredTranscription;
    segments: StoredSegment[];
}

const props = defineProps<InputProps>();

const { canUndo, canRedo, undo, redo } = useCommandHistory();
const { t } = useI18n();

const currentTime = usePlaybackTime();
const { duration } = useMediaDuration(() => props.transcription);
const autoScrollEnabled = ref(true);
const mergeSegments = ref(true);
const keywordHighlightEnabled = ref(false);
const showVideo = ref(false);

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
const currentSegments = computed(() =>
    props.segments.filter(
        (segment) =>
            currentTime.value >= segment.start &&
            currentTime.value < segment.end,
    ),
);

watch(
    () => props.transcription,
    () => {
        // duration 0 means metadata is still probing — resetting then would
        // clobber a just-performed seek
        if (duration.value > 0 && currentTime.value > duration.value) {
            currentTime.value = 0;
        }
    },
);
</script>

<template>
    <div class="flex min-h-0 grow flex-col">
        <Teleport defer to="#editor-toolbar-tools">
            <UndoRedoButtons
                :can-redo="canRedo"
                :can-undo="canUndo"
                @redo="redo"
                @undo="undo"
            />
            <UPopover>
                <UButton
                    icon="i-lucide-settings-2"
                    trailing-icon="i-lucide-chevron-down"
                    color="primary"
                    variant="soft"
                    :title="t('viewer.displayOptions')"
                    class="text-[0.82rem]"
                    :ui="{
                        leadingIcon: 'size-4',
                        trailingIcon: 'hidden size-4 md:block',
                    }"
                >
                    <span class="hidden md:inline">{{
                        t("viewer.displayOptions")
                    }}</span>
                </UButton>
                <template #content>
                    <div class="w-80 flex flex-col gap-3 p-4">
                        <div class="flex items-center justify-between gap-6">
                            <div class="flex flex-col">
                                <span class="text-sm">{{
                                    t("editor.toolrow.highlightKeywords")
                                }}</span>
                                <span class="text-xs text-dimmed">{{
                                    t("editor.toolrow.highlightKeywordsHint")
                                }}</span>
                            </div>
                            <USwitch v-model="keywordHighlightEnabled" />
                        </div>
                        <div class="flex items-center justify-between gap-6">
                            <span class="text-sm">{{
                                t("editor.toolrow.autoScroll")
                            }}</span>
                            <USwitch v-model="autoScrollEnabled" />
                        </div>
                        <div class="flex items-center justify-between gap-6">
                            <span class="text-sm">{{
                                t("editor.toolrow.mergeSegments")
                            }}</span>
                            <USwitch v-model="mergeSegments" />
                        </div>
                    </div>
                </template>
            </UPopover>
        </Teleport>

        <audio
            v-if="!isVideoFile && mediaFile"
            ref="audioElement"
            :src="mediaSrc"
            @timeupdate="onTimeUpdate"
        />

        <div class="relative min-h-0 flex-1 overflow-hidden">
            <div
                v-show="showVideo && isVideoFile"
                class="absolute inset-0 flex items-center justify-center bg-black p-3"
            >
                <!-- biome-ignore lint/a11y/useMediaCaption: Transcription segments are rendered as synchronized subtitles -->
                <video
                    v-if="isVideoFile && mediaFile"
                    ref="videoElement"
                    class="block h-full max-h-full max-w-full rounded-lg object-contain"
                    playsinline
                    webkit-playsinline
                    @timeupdate="onTimeUpdate"
                    @click="togglePlay"
                >
                    <source :src="mediaSrc" :type="mediaFile.type" />
                </video>

                <div
                    v-if="currentSegments.length > 0"
                    class="absolute inset-x-6 bottom-6 flex flex-col items-center gap-1 rounded-md bg-black/75 px-4 py-2.5 text-center text-base text-white shadow-md"
                >
                    <div
                        v-for="segment in currentSegments"
                        :key="segment.id"
                    >
                        <span
                            class="font-semibold"
                            :style="{
                                color: getSpeakerColor(
                                    segment.speaker ?? 'unknown',
                                ).toString(),
                            }"
                        >
                            {{ displayName(segment.speaker ?? undefined) }}:
                        </span>
                        {{ segment.text }}
                    </div>
                </div>
            </div>

            <div
                v-show="!showVideo || !isVideoFile"
                id="transcript-document"
                data-transcript-scroll
                class="absolute inset-0 overflow-y-auto pt-6"
            >
                <div class="mx-auto max-w-210 px-5 pb-10">
                    <TranscriptDocumentEditor
                        :transcription="props.transcription"
                        :segments="props.segments"
                        :current-time="currentTime"
                        :auto-scroll-enabled="autoScrollEnabled"
                        :merge-segments="mergeSegments"
                        :keyword-highlight-enabled="keywordHighlightEnabled"
                    />
                </div>
            </div>
        </div>

        <!-- bottom dock: transport + speaker lanes -->
        <EditorDock
            v-model:show-video="showVideo"
            :transcription="props.transcription"
            :segments="props.segments"
            :duration="duration"
            :current-time="currentTime"
            :is-playing="isPlaying"
            :playback-rate="playbackRate"
            :has-video="isVideoFile"
            :merge-segments="mergeSegments"
            :auto-scroll="autoScrollEnabled"
            @toggle-play="togglePlay"
            @seek="seekTo"
            @set-rate="(rate) => (playbackRate = rate)"
        />
    </div>
</template>
