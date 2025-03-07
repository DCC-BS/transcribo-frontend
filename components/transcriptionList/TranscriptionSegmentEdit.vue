<script lang="ts" setup>
import { UCard, UTextarea } from '#components';
import { SeekToSecondsCommand, DeleteSegementCommand, InsertSegementCommand, UpdateSegementCommand } from '~/types/commands';
import type { SegementWithId } from '~/types/transcriptionResponse';

interface TranscriptionListProps {
    segment: SegementWithId;
    speakers: string[];
}

const props = defineProps<TranscriptionListProps>();

const { executeCommand } = useCommandBus();
const internalSegment = ref<SegementWithId>({ ...props.segment });
const isDirty = ref(false);

watch(() => props.segment, (segment) => {
    internalSegment.value = { ...segment };
    isDirty.value = false;
});

watch(internalSegment, () => {
    if (isDirty.value) {
        return;
    }

    if (JSON.stringify(internalSegment.value) !== JSON.stringify(props.segment)) {
        isDirty.value = true;
    }
}, { deep: true });

function removeSegment(segment: SegementWithId): void {
    executeCommand(new DeleteSegementCommand(segment.id))
}

function addSegmentAfter(segment: SegementWithId): void {
    executeCommand(new InsertSegementCommand(segment.id, {}, 'after'));
}

function addSegmentBefore(segment: SegementWithId): void {
    executeCommand(new InsertSegementCommand(segment.id, {}, 'before'));
}

function seekTo(time: number): void {
    executeCommand(new SeekToSecondsCommand(time));
}

function applyChanges(): void {
    isDirty.value = false;

    executeCommand(new UpdateSegementCommand(internalSegment.value.id, internalSegment.value));
}

function unDoChanges(): void {
    isDirty.value = false;
    internalSegment.value = { ...props.segment };
}

// Function to handle keydown events in the textarea
function handleKeydown(event: KeyboardEvent): void {
    // Check if Enter is pressed without Shift (Shift+Enter creates a new line)
    if (event.key === 'Enter' && !event.shiftKey) {
        // Prevent the default newline insertion
        event.preventDefault();
        // Apply changes if there are any
        if (isDirty.value) {
            applyChanges();
        }
    }
}

function handleCreateSpeaker(speaker: string): void {
    // Add the new speaker to the list of speakers
    props.speakers.push(speaker);
    // Set the new speaker as the current speaker
    internalSegment.value.speaker = speaker;
}
</script>

<template>
    <UCard>
        <UAlert v-if="isDirty" title="" description="Do you want to apply your changes?" color="info" variant="outline"
            :actions="[
                {
                    label: 'Undo',
                    onClick: unDoChanges,
                },
                {
                    label: 'Apply',
                    color: 'neutral',
                    variant: 'subtle',
                    onClick: applyChanges,
                }
            ]" />
        <UTextarea v-model="internalSegment.text" class="w-full" @keydown="handleKeydown" />

        <div class="flex gap-2" @keydown="handleKeydown">
            <USelectMenu v-model="internalSegment.speaker" :items="props.speakers" create-item
                @create="handleCreateSpeaker" />
            <div>
                <!-- <UInputNumber v-model="internalSegment.start" type="number" :step="0.1" @keydown="handleKeydown" /> -->
                <a @click="() => seekTo(internalSegment.start)">
                    {{ formatTime(internalSegment.start) }}
                </a>
                -
                <a @click="() => seekTo(internalSegment.end)">{{ formatTime(internalSegment.end) }}</a>
                <!-- <UInputNumber v-model="internalSegment.end" type="number" :step="0.1" @keydown="handleKeydown" /> -->
            </div>
            <UButton color="primary" icon="i-heroicons-arrow-up-on-square-stack"
                @click="addSegmentBefore(internalSegment)" />
            <UButton color="primary" icon="i-heroicons-arrow-down-on-square-stack"
                @click="addSegmentAfter(internalSegment)" />
            <UButton color="error" icon="i-heroicons-trash" @click="removeSegment(internalSegment)" />
        </div>
    </UCard>
</template>

<style lang="scss" scoped></style>