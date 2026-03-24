<script lang="ts" setup>
import { motion } from "motion-v";
import type { WatchHandle } from "vue";
import { UCard, UTextarea } from "#components";
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
const internalSegment = ref<StoredSegment & { speaker: string }>({
    ...props.segment,
    speaker: props.segment.speaker ?? "NA",
});
const isDirty = ref(false);
const { t } = useI18n();
const progress = ref(0);
const duration = ref(0);

watch(
    () => props.segment,
    (segment) => {
        if (!isDirty.value) {
            internalSegment.value = {
                ...segment,
                speaker: segment.speaker ?? "NA",
            };
        }
    },
);

function markDirty(): void {
    isDirty.value = true;
}

let unsubscribe: WatchHandle | undefined;

watch(
    () => props.isActive,
    (isActive) => {
        if (isActive && props.showProgress) {
            unsubscribe = watch(
                () => props.currentTime,
                (tNew, tOld) => {
                    const { start, end } = internalSegment.value;
                    progress.value = (tNew - start) / (end - start);
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

function applyChanges(): void {
    isDirty.value = false;

    const newSegment = internalSegment.value as Record<string, unknown>;
    const oldSegment = props.segment as unknown as Record<string, unknown>;

    const updates = Object.keys(newSegment).reduce(
        (acc: Record<string, unknown>, key) => {
            if (newSegment[key] !== oldSegment[key]) {
                acc[key] = newSegment[key];
            }
            return acc;
        },
        {} as Partial<StoredSegment>,
    );

    executeCommand(new UpdateSegmentCommand(internalSegment.value.id, updates));
}

function unDoChanges(): void {
    isDirty.value = false;
    internalSegment.value = {
        ...props.segment,
        speaker: props.segment.speaker ?? "NA",
    };
}

function handleKeydown(event: KeyboardEvent): void {
    if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        if (isDirty.value) {
            applyChanges();
        }
    }
}

function handleCreateSpeaker(speaker: string): void {
    internalSegment.value.speaker = speaker;
    markDirty();
}

function roundToTwoDecimals(value: number): number {
    return Math.round(value * 100) / 100;
}

const startTimeFormatted = computed({
    get: () => roundToTwoDecimals(internalSegment.value.start),
    set: (value: number) => {
        internalSegment.value.start = value;
        markDirty();
    },
});

const endTimeFormatted = computed({
    get: () => roundToTwoDecimals(internalSegment.value.end),
    set: (value: number) => {
        internalSegment.value.end = value;
        markDirty();
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
            <UAlert v-if="isDirty" title="" :description="t('transcription.applySpeakerChanges')" color="info"
                variant="outline" :actions="[
                    {
                        label: t('transcription.undoChanges'),
                        onClick: unDoChanges,
                    },
                    {
                        label: t('transcription.applyChanges'),
                        color: 'neutral',
                        variant: 'subtle',
                        onClick: applyChanges,
                    },
                ]" />
            <UTextarea v-model="internalSegment.text" class="w-full" @keydown="handleKeydown" @input="markDirty" />

            <div class="flex justify-between gap-2 pt-2 flex-wrap" @keydown="handleKeydown">
                <USelectMenu v-model="internalSegment.speaker" :items="props.speakers" create-item
                    :placeholder="t('transcription.placeholderSpeakerName')" @create="handleCreateSpeaker"
                    @update:model-value="markDirty()" />

                <div class="flex gap-2 items-center">
                    <UInput v-model="startTimeFormatted" type="number" class="w-[100px]" :step="0.1"
                        @keydown="handleKeydown">
                        <template #trailing>
                            <span class="text-xs">s</span>
                        </template>
                    </UInput>
                    <div class="text-gray-700">
                        <a @click="() => seekTo(internalSegment.start)">
                            {{ formatTime(internalSegment.start) }}
                        </a>
                        -
                        <a @click="() => seekTo(internalSegment.end)">{{
                            formatTime(internalSegment.end)
                        }}</a>
                    </div>
                    <UInput v-model="endTimeFormatted" type="number" class="w-[100px]" :step="0.1"
                        @keydown="handleKeydown">
                        <template #trailing>
                            <span class="text-xs">s</span>
                        </template>
                    </UInput>
                </div>

                <div class="flex gap-2">
                    <UTooltip :text="t('help.segments.deleteSegment')">
                        <UButton color="error" icon="i-lucide-trash-2" @click="removeSegment(internalSegment)" />
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
