<script lang="ts" setup>
import { motion } from "motion-v";
import { v4 as uuid } from "uuid";
import { AddSegmentCommand, InsertSegmentCommand } from "~/types/commands";
import type { StoredTranscription } from "~/types/storedTranscription";
import type { SegmentWithId } from "~/types/transcriptionResponse";
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

const { executeCommand } = useCommandBus();

const listContainer = ref<HTMLElement>();
const segmentRefs = ref<Map<string, HTMLElement>>(new Map());

const segments = computed(() => props.transcription.segments.toSorted((a, b) => a.start - b.start));
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
    } else {
        console.warn(`Attempted to set segment ref for ID ${id} with a non-HTMLElement`, el);
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
        console.warn(`No element found for segment ID: ${newId}`);
        return;
    }

    segmentEl.scrollIntoView({ behavior: "smooth", block: "center" });
});

async function addSegmentAfter(segment: SegmentWithId) {
    executeCommand(new InsertSegmentCommand(segment.id, {}, "after"));
}

async function addSegemntAtZero() {
    const segment: SegmentWithId = {
        id: uuid(),
        text: "",
        start: 0,
        end: 2,
        speaker: speakers.value[0]
    };
    executeCommand(new AddSegmentCommand(segment));
}
</script>

<template>
    <div ref="listContainer" class="flex flex-col">
        <USeparator>
            <UButton icon="i-lucide-plus" variant="link" color="neutral" @click="() => addSegemntAtZero()" />
        </USeparator>

        <AnimatePresence>
            <motion.div v-for="segment in segments" :key="segment.id" :initial="{ opacity: 0, scaleY: 0 }"
                :animate="{ opacity: 1, scaleY: 1 }" :exit="{ scale: 0 }">
                <div :ref="(el) => setSegmentRef(segment.id, el)">
                    <TranscriptionListItem :segment="segment" :speakers="speakers"
                        :isActive="isSegmentActive(segment.id)" />
                </div>

                <USeparator>
                    <UButton icon="i-lucide-plus" variant="link" color="neutral"
                        @click="() => addSegmentAfter(segment)" />
                </USeparator>
            </motion.div>
        </AnimatePresence>
    </div>
</template>
