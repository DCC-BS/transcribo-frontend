<script lang="ts" setup>
import type { StoredTranscription } from "~/types/storedTranscription";
import TranscriptionListItem from "./TranscriptionSegmentEdit.vue";

interface InputProps {
    transcription: StoredTranscription
}

const props = defineProps<InputProps>();

const segments = computed(() => props.transcription.segments);
const speakers = computed(() =>
    Array.from(getUniqueSpeakers(props.transcription.segments)),
);

</script>

<template>
    <div class="flex flex-col gap-4">
        <div v-for="segment in segments" :key="segment.text + segment.start">
            <TranscriptionListItem :segment="segment" :speakers="speakers" />
        </div>
    </div>
</template>
