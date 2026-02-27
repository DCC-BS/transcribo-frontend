<script lang="ts" setup>
import { UButton } from "#components";
import type { StoredTranscription } from "~/types/storedTranscription";
import { AddSegmentCommand } from "../../types/commands";
import TranscriptionListItem from "../transcriptionList/TranscriptionSegmentEdit.vue";

interface CurrentSegmentEditorProps {
    transcription: StoredTranscription,
    currentTime: number;
    duration: number;
}

const props = defineProps<CurrentSegmentEditorProps>();

const segments = computed(() => props.transcription.segments);
const speakers = computed(() =>
    Array.from(getUniqueSpeakers(segments.value)),
);

const { executeCommand } = useCommandBus();
const { t } = useI18n();

// Function to get currently visible segments based on current time
const currentSegments = computed(() => {
    // Return segments that include the current time
    return segments.value.filter(
        (segment) =>
            props.currentTime >= segment.start &&
            props.currentTime < segment.end,
    );
});

async function handleAddSegment() {
    // Add a new segment at the current time

    const segemntBefore = segments.value.findLast(
        (segment) => segment.end < props.currentTime,
    );
    const segemntAfter = segments.value.find(
        (segment) => segment.start > props.currentTime,
    );

    const start = segemntBefore?.end ?? props.currentTime;
    const end =
        segemntAfter?.start ?? Math.min(props.currentTime + 5, props.duration);

    const newSegment = {
        text: "",
        start: start,
        end: end,
        speaker: speakers.value[0] ?? "SPEAKER_1",
    };

    const command = new AddSegmentCommand(newSegment);
    await executeCommand(command);
}
</script>

<template>
    <div>
        <div v-for="segment in currentSegments" :key="segment.text + segment.start">
            <TranscriptionListItem :segment="segment" :speakers="speakers" />
        </div>
        <div v-if="currentSegments.length === 0">
            <UButton @click="handleAddSegment">
                {{ t("media.addSegment") }}
            </UButton>
        </div>
    </div>
</template>
