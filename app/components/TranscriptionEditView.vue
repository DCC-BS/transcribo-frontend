<script lang="ts" setup>
import { useMediaQuery } from '@vueuse/core'
import type { StoredTranscription } from '~/types/storedTranscription';


interface InputProps {
    transcription: StoredTranscription
}

const props = defineProps<InputProps>();

const isMobile = useMediaQuery('(max-width: 800px)');
</script>

<template>
    <SplitView :isHorizontal="isMobile">
        <template #a>
            <MediaEditor :transcription="props.transcription" />
        </template>
        <template #b>
            <div class="overflow-y-auto max-h-[calc(100vh-12rem)]">
                <TranscriptionList :transcription="props.transcription" class="p-2" />
            </div>
        </template>
    </SplitView>
</template>
