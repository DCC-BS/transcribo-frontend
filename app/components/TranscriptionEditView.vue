<script lang="ts" setup>
import type { StoredTranscription } from '~/types/storedTranscription';


interface InputProps {
    transcription: StoredTranscription
}

const props = defineProps<InputProps>();

</script>

<template>
    <SplitView>
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
