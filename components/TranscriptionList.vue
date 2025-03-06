<script lang="ts" setup>
import { useTranscriptionsStore } from '~/stores/transcriptionsStore';
import type { SegementWithId } from '~/types/transcriptionResponse';
import { v4 as uuidv4 } from 'uuid';
import TranscriptionListItem from './TranscriptionListItem.vue';

const transcriptionsStore = useTranscriptionsStore();

const transcriptions = ref<SegementWithId[]>(
    transcriptionsStore.currentTranscription?.segments ?? [],
);
const speakers = computed(() =>
    Array.from(
        new Set(
            transcriptions.value.map((segment) => segment.speaker ?? 'unknown'),
        ),
    ),
);

watch(
    () => transcriptionsStore.currentTranscription,
    (currentTranscription) => {
        transcriptions.value = currentTranscription?.segments ?? [];
    },
);

async function removeSegment(segment: SegementWithId): Promise<void> {
    await transcriptionsStore.updateCurrentTrascription({
        segments: transcriptions.value.filter((s) => s.id !== segment.id),
    });
}

function onSegmentChange(segment: SegementWithId): void {
    const newSegments = transcriptions.value.map((s) =>
        s.id === segment.id ? segment : s,
    );

    transcriptionsStore.updateCurrentTrascription({
        segments: newSegments,
    });
}

function addSegmentAfter(segment: SegementWithId): void {
    const newSegments = [
        ...transcriptions.value,
        {
            id: uuidv4(),
            start: segment.end,
            end: segment.end + 1,
            text: '',
            speaker: segment.speaker,
        },
    ];

    transcriptionsStore.updateCurrentTrascription({
        segments: newSegments.sort((a, b) => a.start - b.start)
    });
}
</script>

<template>
    <div class="flex flex-col gap-4">
        <div v-for="segment in transcriptions" :key="segment.text + segment.start">
            <TranscriptionListItem :segment="segment" :speakers="speakers" @add-segment-after="addSegmentAfter"
                @remove-segment="removeSegment" @update-segment="onSegmentChange" />
        </div>
    </div>
</template>