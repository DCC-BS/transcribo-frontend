<script lang="ts" setup>
import { watchDebounced } from "@vueuse/core";
import { motion } from "motion-v";
import type { WatchHandle } from "vue";
import { UCard } from "#components";
import {
    DeleteSegmentCommand,
    SeekToSecondsCommand,
    UpdateSegmentCommand,
} from "~/types/commands";
import type { StoredSegment } from "~/types/storedSegments";
import { formatTime } from "~/utils/time";

interface TranscriptionListProps {
    segment: StoredSegment;
    speakers: string[];
    isActive?: boolean;
    currentTime: number;
    showProgress?: boolean;
}

const props = withDefaults(defineProps<TranscriptionListProps>(), {
    isActive: false,
    showProgress: true,
});

const MotionCard = motion.create(UCard);

const { executeCommand } = useCommandBus();
const { t } = useI18n();
const progress = ref(0);
const duration = ref(0);

const text = ref(props.segment.text);
const speaker = ref(props.segment.speaker);
const start = ref(props.segment.start);
const end = ref(props.segment.end);

watch(
    () => props.segment,
    (segment) => {
        text.value = segment.text;
        speaker.value = segment.speaker;
        start.value = segment.start;
        end.value = segment.end;
    },
);

function applyUpdates(updates: Partial<StoredSegment>): void {
    executeCommand(
        new UpdateSegmentCommand(props.segment.id, updates),
    );
}

watchDebounced(
    text,
    (newText) => {
        if (newText !== props.segment.text) {
            applyUpdates({ text: newText });
        }
    },
    { debounce: 3000 },
);

watchDebounced(
    start,
    (newStart) => {
        if (newStart !== props.segment.start) {
            applyUpdates({ start: newStart });
        }
    },
    { debounce: 1000 },
);

watchDebounced(
    end,
    (newEnd) => {
        if (newEnd !== props.segment.end) {
            applyUpdates({ end: newEnd });
        }
    },
    { debounce: 1000 },
);

watch(speaker, (newSpeaker) => {
    if (newSpeaker !== props.segment.speaker) {
        applyUpdates({ speaker: newSpeaker });
    }
});

let unsubscribe: WatchHandle | undefined;

watch(
    () => props.isActive,
    (isActive) => {
        if (isActive && props.showProgress) {
            unsubscribe = watch(
                () => props.currentTime,
                (tNew, tOld) => {
                    progress.value = (tNew - start.value) / (end.value - start.value);
                    duration.value = Math.abs(tNew - tOld);
                },
            );
        } else if (unsubscribe) {
            unsubscribe();
            progress.value = 0;
        }
    },
    { immediate: true },
);

function removeSegment(segment: StoredSegment): void {
    executeCommand(new DeleteSegmentCommand(segment.id));
}

function seekTo(time: number): void {
    executeCommand(new SeekToSecondsCommand(time));
}

function handleCreateSpeaker(newSpeaker: string): void {
    speaker.value = newSpeaker;
}

function roundToTwoDecimals(value: number): number {
    return Math.round(value * 100) / 100;
}

const startTimeFormatted = computed({
    get: () => roundToTwoDecimals(start.value),
    set: (value: number) => {
        start.value = Math.min(value, end.value);
    },
});

const endTimeFormatted = computed({
    get: () => roundToTwoDecimals(end.value),
    set: (value: number) => {
        end.value = Math.max(value, start.value);
    },
});
</script>

<template>
    <MotionCard layout variant="subtle" :ui="{
        root: props.isActive ? 'ring-2 ring-teal-500' : '',
    }" class="relative overflow-hidden">
        <motion.div v-if="props.isActive && props.showProgress" :initial="{ scaleX: 0 }" :animate="{ scaleX: progress }"
            :transition="{ duration: duration, ease: 'linear' }"
            class="absolute inset-0 origin-left pointer-events-none z-0" style="
                background: linear-gradient(
                    to right,
                    rgba(20, 184, 166, 0.15),
                    rgba(20, 184, 166, 0.25)
                );
            " />
        <div class="relative z-10">
            <UTextarea v-model="text" class="w-full" />

            <div class="flex justify-between gap-2 pt-2 flex-wrap">
                <USelectMenu v-model="speaker" :items="props.speakers" create-item
                    :placeholder="t('transcription.placeholderSpeakerName')" @create="handleCreateSpeaker" />

                <div class="flex gap-2 items-center">
                    <UInput v-model="startTimeFormatted" type="number" class="w-25" :step="0.1">
                        <template #trailing>
                            <span class="text-xs">s</span>
                        </template>
                    </UInput>
                    <div class="text-gray-700">
                        <a @click="() => seekTo(start)">
                            {{ formatTime(start) }}
                        </a>
                        -
                        <a @click="() => seekTo(end)">{{
                            formatTime(end)
                        }}</a>
                    </div>
                    <UInput v-model="endTimeFormatted" type="number" class="w-25" :step="0.1">
                        <template #trailing>
                            <span class="text-xs">s</span>
                        </template>
                    </UInput>
                </div>

                <div class="flex gap-2">
                    <UTooltip :text="t('help.segments.deleteSegment')">
                        <UButton color="error" icon="i-lucide-trash-2" @click="removeSegment(props.segment)" />
                    </UTooltip>
                </div>
            </div>
        </div>
    </MotionCard>
</template>

<style lang="scss" scoped>
a {
    cursor: pointer;
    color: var(--color-primary-500);
}

a:hover {
    text-decoration: underline;
}
</style>
