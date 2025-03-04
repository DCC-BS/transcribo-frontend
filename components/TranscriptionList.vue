<script lang="ts" setup>
import { useTranscriptionsStore } from '~/stores/transcriptionsStore';
import { SeekToSecondsCommand } from '~/types/commands';
import type { SegementWithId } from '~/types/transcriptionResponse';

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

const { executeCommand } = useCommandBus();

watch(
    () => transcriptionsStore.currentTranscription,
    (currentTranscription) => {
        transcriptions.value = currentTranscription?.segments ?? [];
    },
);

function seekTo(time: number): void {
    executeCommand(new SeekToSecondsCommand(time));
}

async function removeSegment(segment: SegementWithId): Promise<void> {
    await transcriptionsStore.updateCurrentTrascription({
        segments: transcriptions.value.filter((s) => s !== segment),
    });
}

function onSegmentChange(): void {
    transcriptionsStore.updateCurrentTrascription({
        segments: transcriptions.value,
    });
}
</script>

<template>
    <div class="flex flex-col gap-4">
        <div v-for="segment in transcriptions" :key="segment.text + segment.start">
            <DelayedSyncTextarea v-model="segment.text" class="w-full" @update:model-value="onSegmentChange" />

            <div class="flex gap-2">
                <USelectMenu v-model="segment.speaker" :items="speakers" />
                <div>
                    <a @click="() => seekTo(segment.start)">
                        {{ formatTime(segment.start) }}
                    </a>
                    -
                    <a @click="() => seekTo(segment.end)">{{ formatTime(segment.end) }}</a>
                </div>
                <UButton color="error" icon="i-heroicons-trash" @click="removeSegment(segment)" />
            </div>
        </div>
    </div>
</template>

<style></style>
