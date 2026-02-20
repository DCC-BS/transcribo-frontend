<script lang="ts" setup>
import type { StoredTranscription } from "~/types/storedTranscription";
import TranscriptionListItem from "./TranscriptionSegmentEdit.vue";

interface InputProps {
    transcription: StoredTranscription;
    currentTime?: number;
    autoScrollEnabled?: boolean;
}

const props = withDefaults(defineProps<InputProps>(), {
    currentTime: 0,
    autoScrollEnabled: true,
});
const listContainer = ref<HTMLElement>();
const segmentRefs = ref<Map<string, HTMLElement>>(new Map());

const segments = computed(() => props.transcription.segments);
const speakers = computed(() =>
    Array.from(getUniqueSpeakers(props.transcription.segments)),
);

const currentSegmentId = computed(() => {
    const current = segments.value.find(
        (segment) =>
            props.currentTime >= segment.start && props.currentTime < segment.end,
    );
    return current?.id;
});

function setSegmentRef(id: string, el: unknown): void {
    if (el instanceof HTMLElement) {
        segmentRefs.value.set(id, el);
    }
}

function isSegmentActive(segmentId: string): boolean {
    return currentSegmentId.value === segmentId;
}

watch(currentSegmentId, (newId, oldId) => {
    if (
        !props.autoScrollEnabled ||
        !newId ||
        !listContainer.value ||
        newId === oldId
    ) {
        return;
    }

    const segmentEl = segmentRefs.value.get(newId);
    if (!segmentEl) {
        return;
    }

    const containerRect = listContainer.value.getBoundingClientRect();
    const segmentRect = segmentEl.getBoundingClientRect();

    const bottomThreshold = containerRect.bottom - containerRect.height * 0.2;
    const topThreshold = containerRect.top + containerRect.height * 0.2;

    if (segmentRect.bottom > bottomThreshold || segmentRect.top < topThreshold) {
        segmentEl.scrollIntoView({ behavior: "smooth", block: "center" });
    }
});
</script>

<template>
    <div ref="listContainer" class="flex flex-col gap-4">
        <div
            v-for="segment in segments"
            :key="segment.id"
            :ref="(el) => setSegmentRef(segment.id, el)"
        >
            <TranscriptionListItem
                :segment="segment"
                :speakers="speakers"
                :isActive="isSegmentActive(segment.id)"
            />
        </div>
    </div>
</template>
