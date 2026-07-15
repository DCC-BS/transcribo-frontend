<script lang="ts" setup>
import type { StoredSegment } from "~/types/storedSegments";
import type { StoredTranscription } from "~/types/storedTranscription";

/*
    Script-style document mode: the whole transcript as one editable TipTap
    document instead of individual fragment cards. Shares the playback bar,
    undo/redo, speaker and keyword toolbars with the fragment editor.
*/
interface InputProps {
    transcription: StoredTranscription;
    segments: StoredSegment[];
}

const props = defineProps<InputProps>();

const { canUndo, canRedo, undo, redo } = useCommandHistory();
const { t } = useI18n();

const currentTime = ref(0);
const duration = ref(0);
const autoScrollEnabled = ref(true);

onMounted(() => {
    initializeDuration();
});

watch(
    () => props.transcription,
    () => {
        initializeDuration();

        if (currentTime.value > duration.value) {
            currentTime.value = 0;
        }
    },
);

function initializeDuration(): void {
    if (!props.transcription?.mediaFile) {
        duration.value = 0;
        return;
    }

    const audioSrc = URL.createObjectURL(props.transcription.mediaFile);
    const audio = new Audio();
    audio.src = audioSrc;

    audio.onloadedmetadata = () => {
        duration.value = audio.duration;
        URL.revokeObjectURL(audioSrc);
        audio.onloadedmetadata = null;
    };
}
</script>

<template>
    <div class="relative h-full flex flex-col">
        <div class="sticky top-0 z-40 bg-default/50 backdrop-blur-sm rounded">
            <MediaPlaybackBar v-model="currentTime" :transcription="props.transcription" :segments="props.segments"
                :duration="duration" />

            <div class="flex justify-between">
                <UndoRedoButtons :can-redo="canRedo" :can-undo="canUndo" @redo="redo" @undo="undo" />
                <UButton size="xs" variant="link" :color="autoScrollEnabled ? 'primary' : 'neutral'"
                    @click="autoScrollEnabled = !autoScrollEnabled">
                    <template #leading>
                        <UIcon name="i-lucide-arrow-down-narrow-wide" :class="{ 'opacity-50': !autoScrollEnabled }" />
                    </template>
                    <span class="text-xs">{{
                        autoScrollEnabled
                            ? t("transcription.autoScrollOn")
                            : t("transcription.autoScrollOff")
                    }}</span>
                </UButton>
            </div>

            <div class="px-4 pb-2">
                <RenameSpeakerView :transcription-id="props.transcription.id" :segments="props.segments" />
                <HotWordsView :transcription="props.transcription" :segments="props.segments" />
            </div>
        </div>

        <div class="flex-1 min-h-0 p-2 sm:p-4">
            <UCard variant="subtle">
                <TranscriptDocumentEditor :transcription="props.transcription" :segments="props.segments"
                    :current-time="currentTime" :auto-scroll-enabled="autoScrollEnabled" />
            </UCard>
        </div>
    </div>
</template>
