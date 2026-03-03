<script lang="ts" setup>
import { useVirtualizer } from "@tanstack/vue-virtual";
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

// Memoize sorted segments to avoid re-sorting on every access
const sortedSegments = computed(() => {
    return [...props.transcription.segments].sort((a, b) => a.start - b.start);
});

const speakers = computed(() =>
    Array.from(getUniqueSpeakers(props.transcription.segments)),
);

const throttledProgress = ref(0);
let progressTimeout: ReturnType<typeof setTimeout> | undefined;

onUnmounted(() => {
    if (progressTimeout) {
        clearTimeout(progressTimeout);
    }
});

const currentSegmentId = computed(() => {
    const current = sortedSegments.value.find(
        (segment) =>
            props.currentTime >= segment.start &&
            props.currentTime < segment.end,
    );
    return current?.id;
});

const activeSegemntProgress = computed(() => {
    const current = sortedSegments.value.find(
        (segment) => segment.id === currentSegmentId.value,
    );
    if (!current) {
        return 0;
    }

    return (props.currentTime - current.start) / (current.end - current.start);
});

watch(
    activeSegemntProgress,
    (newProgress) => {
        if (progressTimeout) {
            return;
        }

        throttledProgress.value = newProgress;
        progressTimeout = setTimeout(() => {
            progressTimeout = undefined;
        }, 300);
    },
    { immediate: true },
);

function setSegmentRef(id: string, el: unknown): void {
    if (!el) {
        segmentRefs.value.delete(id);
        return;
    }

    if (el instanceof HTMLElement) {
        segmentRefs.value.set(id, el);
    }
}

function isSegmentActive(segmentId: string): boolean {
    return currentSegmentId.value === segmentId;
}

// Virtualizer setup for efficient rendering
const virtualizer = useVirtualizer({
    count: computed(() => sortedSegments.value.length),
    getScrollElement: () => listContainer.value,
    estimateSize: () => 150, // Average segment height estimate
    overscan: 5, // Render 5 extra items above and below viewport
});

const virtualItems = computed(() => virtualizer.value.getVirtualItems());

// Find the index of the current segment for auto-scroll
const currentSegmentIndex = computed(() => {
    if (!currentSegmentId.value) {
        return -1;
    }
    return sortedSegments.value.findIndex((s) => s.id === currentSegmentId.value);
});

// Auto-scroll to current segment
watch(currentSegmentIndex, (newIndex, oldIndex) => {
    if (
        !props.autoScrollEnabled ||
        newIndex === -1 ||
        newIndex === oldIndex ||
        !listContainer.value
    ) {
        return;
    }

    virtualizer.value.scrollToIndex(newIndex, {
        behavior: "smooth",
        align: "center",
    });
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
        speaker: speakers.value[0],
    };
    executeCommand(new AddSegmentCommand(segment));
}
</script>

<template>
    <div ref="listContainer" class="flex flex-col overflow-y-auto">
        <USeparator id="add-transcription-top">
            <UButton
                icon="i-lucide-plus"
                variant="link"
                color="neutral"
                @click="() => addSegemntAtZero()"
            />
        </USeparator>

        <div
            id="transcription-segments"
            class="relative w-full"
            :style="{ height: `${virtualizer.getTotalSize()}px` }"
        >
            <div
                v-for="virtualItem in virtualItems"
                :key="sortedSegments[virtualItem.index].id"
                :ref="(el) => setSegmentRef(sortedSegments[virtualItem.index].id, el)"
                class="absolute top-0 left-0 w-full"
                :style="{
                    height: `${virtualItem.size}px`,
                    transform: `translateY(${virtualItem.start}px)`,
                }"
            >
                <TranscriptionListItem
                    :segment="sortedSegments[virtualItem.index]"
                    :speakers="speakers"
                    :isActive="isSegmentActive(sortedSegments[virtualItem.index].id)"
                    :currentTime="props.currentTime"
                />

                <USeparator>
                    <UButton
                        icon="i-lucide-plus"
                        variant="link"
                        color="neutral"
                        @click="() => addSegmentAfter(sortedSegments[virtualItem.index])"
                    />
                </USeparator>
            </div>
        </div>
    </div>
</template>
