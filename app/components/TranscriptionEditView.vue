<script lang="ts" setup>
import { useMediaQuery } from "@vueuse/core";
import { motion } from "motion-v";
import type { StoredTranscription } from "~/types/storedTranscription";

interface InputProps {
    transcription: StoredTranscription;
}

const props = defineProps<InputProps>();

const isMobile = useMediaQuery("(max-width: 800px)");
const { canUndo, canRedo, undo, redo } = useCommandHistory();

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
        currentTime.value = 0;
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
        <motion.div
            class="fixed bottom-6 right-6 z-50"
            :initial="{ opacity: 0, scale: 0.9, y: 20 }"
            :animate="{ opacity: 1, scale: 1, y: 0 }"
            :transition="{ duration: 0.3, delay: 0.1 }"
        >

            <div class="bg-default/80 backdrop-blur-sm rounded-lg shadow-lg p-1 border border-default">
                <UndoRedoButtons
                    :canRedo="canRedo"
                    :canUndo="canUndo"
                    @redo="redo"
                    @undo="undo"
                />
            </div>
        </motion.div>

        <KeyboardShortcutsHint />

        <div class="sticky top-0 z-40">
            <MediaPlaybackBar
                v-model="currentTime"
                :transcription="props.transcription"
                :duration="duration"
            />

            <div>
                <!-- <TimelineEditor
                    :transcription="props.transcription"
                    :currentTime="currentTime"
                /> -->
                <div class="sticky top-0 z-10 flex justify-end p-2 bg-default/95 backdrop-blur-sm">
                <UButton
                    size="xs"
                    variant="ghost"
                    :color="autoScrollEnabled ? 'primary' : 'neutral'"
                    class="shadow-sm border border-default"
                    @click="autoScrollEnabled = !autoScrollEnabled"
                >
                    <template #leading>
                        <UIcon
                            :name="autoScrollEnabled ? 'i-lucide-arrow-down-narrow-wide' : 'i-lucide-arrow-down-narrow-wide'"
                            :class="{ 'opacity-50': !autoScrollEnabled }"
                        />
                    </template>
                    <span class="text-xs">{{ autoScrollEnabled ? $t('transcription.autoScrollOn') : $t('transcription.autoScrollOff') }}</span>
                </UButton>
            </div>

            </div>
        </div>

        <div class="flex-1 min-h-0 flex flex-col">
            <template v-if="!isMobile">
                <div class="p-4 flex flex-col gap-4">
                    <RenameSpeakerView :transcription="props.transcription" />
                    <TranscriptionList
                    :transcription="props.transcription"
                        :currentTime="currentTime"
                        :autoScrollEnabled="autoScrollEnabled"
                    />
                </div>
            </template>

            <template v-else>
                <div class="flex-1 min-h-0">
                    <div class="p-4 flex flex-col gap-4">
                        <RenameSpeakerView :transcription="props.transcription" />
                        <TranscriptionList
                            :transcription="props.transcription"
                            :currentTime="currentTime"
                            :autoScrollEnabled="autoScrollEnabled"
                        />
                    </div>
                </div>
            </template>
        </div>
    </div>
</template>
