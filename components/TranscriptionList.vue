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
</script>

<template>
    <div>
        <div
            v-for="segment in transcriptions"
            :key="segment.text + segment.start"
        >
            <UTextarea v-model="segment.text" />

            <div class="flex gap-2">
                <USelectMenu v-model="segment.speaker" :options="speakers" />
                <div>
                    <a @click="() => seekTo(segment.start)">
                        {{ segment.start }}
                    </a>
                    -
                    <a @click="() => seekTo(segment.end)">{{ segment.end }}</a>
                </div>
                <UButton
                    color="red"
                    icon="i-heroicons-trash"
                    @click="removeSegment(segment)"
                />
            </div>
        </div>
    </div>
</template>

<style></style>
