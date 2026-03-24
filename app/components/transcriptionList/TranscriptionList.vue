<script lang="ts" setup>
import { useWindowScroll, useWindowSize } from "@vueuse/core";
import { motion } from "motion-v";
import { v4 as uuid } from "uuid";
import { AddSegmentCommand, InsertSegmentCommand } from "~/types/commands";
import {
    type StoredSegment,
    StoredSegmentSchema,
} from "~/types/storedSegments";
import TranscriptionListItem from "./TranscriptionSegmentEdit.vue";

interface InputProps {
    transcriptionId: string;
    segments: StoredSegment[];
    currentTime?: number;
    autoScrollEnabled?: boolean;
}

const props = withDefaults(defineProps<InputProps>(), {
    currentTime: 0,
    autoScrollEnabled: true,
});

const { executeCommand } = useCommandBus();

const segmentRefs = ref<Map<string, HTMLElement>>(new Map());
const { height: windowHeight } = useWindowSize();
const segmentSize = 192;
const { y } = useWindowScroll();

const maxSegment = ref(0);
const useProgress = computed(() => segments.value.length < 500);

watch(
    () => [windowHeight.value, y.value],
    () => {
        const max =
            Math.floor((windowHeight.value + y.value) / segmentSize) + 1;

        maxSegment.value = Math.max(maxSegment.value, max);
    },
    { immediate: true },
);

const segments = computed(() => props.segments);

const speakers = computed(() => Array.from(getUniqueSpeakers(props.segments)));

const currentSegmentId = computed(() => {
    const current = segments.value.find(
        (segment) =>
            props.currentTime >= segment.start &&
            props.currentTime < segment.end,
    );
    return current?.id;
});

function setSegmentRef(id: string, el: unknown): void {
    if (!el) {
        return;
    }

    if (el instanceof HTMLElement) {
        segmentRefs.value.set(id, el);
    } else {
        console.warn(
            `Attempted to set segment ref for ID ${id} with a non-HTMLElement`,
            el,
        );
    }
}

function isSegmentActive(segmentId: string): boolean {
    return currentSegmentId.value === segmentId;
}

watch(currentSegmentId, async (newId, oldId) => {
    if (!props.autoScrollEnabled || !newId || newId === oldId) {
        return;
    }

    const index = segments.value.findIndex((s) => s.id === newId);
    if (index >= 0) {
        maxSegment.value = Math.max(index + 2, maxSegment.value);
    }

    // wait for the element to load
    await nextTick();

    const segmentEl = segmentRefs.value.get(newId);
    if (!segmentEl) {
        console.warn(`No element found for segment ID: ${newId}`);
        return;
    }

    segmentEl.scrollIntoView({ behavior: "smooth", block: "center" });
});

async function addSegmentAfter(segment: StoredSegment) {
    await executeCommand(
        new InsertSegmentCommand(
            segment.transcriptionId,
            segment.id,
            {},
            "after",
        ),
    );
}

async function addSegmentAtZero() {
    const speaker = speakers.value[0] ?? "SPEAKER_1";

    const segment = StoredSegmentSchema.parse({
        text: "",
        start: 0,
        end: 2,
        speaker: speaker,
        transcriptionId: props.transcriptionId,
    } as Omit<StoredSegment, "id">);
    await executeCommand(new AddSegmentCommand(segment));
}
</script>

<template>
    <div class="flex flex-col">
        <USeparator id="add-transcription-top">
            <UButton icon="i-lucide-plus" variant="link" color="neutral" @click="() => addSegmentAtZero()" />
        </USeparator>

        <AnimatePresence>
            <div id="transcription-segments">
                <motion.div v-for="segment in segments.slice(0, maxSegment)" :key="segment.id"
                    :initial="{ opacity: 0, scaleY: 0 }" :animate="{ opacity: 1, scaleY: 1 }" :exit="{ scale: 0 }">
                    <div :ref="(el) => setSegmentRef(segment.id, el)">
                        <TranscriptionListItem :segment="segment" :speakers="speakers"
                            :isActive="isSegmentActive(segment.id)" :currentTime="props.currentTime"
                            :showProgress="useProgress" />
                    </div>

                    <USeparator>
                        <UButton icon="i-lucide-plus" variant="link" color="neutral"
                            @click="() => addSegmentAfter(segment)" />
                    </USeparator>
                </motion.div>
            </div>
        </AnimatePresence>
    </div>
</template>
