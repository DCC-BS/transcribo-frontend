<script lang="ts" setup>
import { useMediaQuery } from '@vueuse/core';
import type { StoredTranscription } from '~/types/storedTranscription';
import { motion } from "motion-v";

interface InputProps {
    transcription: StoredTranscription;
}

const props = defineProps<InputProps>();

const isMobile = useMediaQuery('(max-width: 800px)');
const { canUndo, canRedo, undo, redo } = useCommandHistory();
</script>

<template>
    <div class="relative h-full flex flex-col">
        <motion.div class="fixed bottom-6 right-6 z-50" :initial="{ opacity: 0, scale: 0.9, y: 20 }"
            :animate="{ opacity: 1, scale: 1, y: 0 }" :transition="{ duration: 0.3, delay: 0.1 }">
            <div class="bg-default/80 backdrop-blur-sm rounded-lg shadow-lg p-1 border border-default">
                <UndoRedoButtons :canRedo="canRedo" :canUndo="canUndo" @redo="redo" @undo="undo" />
            </div>
        </motion.div>

        <KeyboardShortcutsHint />

        <SplitView :isHorizontal="isMobile">
            <template #a>
                <MediaEditor :transcription="props.transcription" />
            </template>
            <template #b>
                <div class="h-full overflow-y-auto overscroll-contain">
                    <TranscriptionList :transcription="props.transcription" class="p-4" />
                </div>
            </template>
        </SplitView>
    </div>
</template>
