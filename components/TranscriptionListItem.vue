<script lang="ts" setup>
import { UCard, UTextarea } from '#components';
import { SeekToSecondsCommand } from '~/types/commands';
import type { SegementWithId } from '~/types/transcriptionResponse';

interface TranscriptionListProps {
    segment: SegementWithId;
    speakers: string[];
}

const props = defineProps<TranscriptionListProps>();
const emit = defineEmits<{
    'remove-segment': [segment: SegementWithId];
    'add-segment-after': [segment: SegementWithId];
    'update-segment': [segment: SegementWithId];
}>();

const { executeCommand } = useCommandBus();
const internalSegment = ref<SegementWithId>({ ...props.segment });
const isDirty = ref(false);

watch(() => props.segment, (segment) => {
    console.log('watching props.segment');
    internalSegment.value = { ...segment };
    isDirty.value = false;
});

watch(internalSegment, () => {
    console.log('watching internalSegment');

    if (isDirty.value) {
        return;
    }

    console.log(internalSegment.value !== props.segment);

    if (JSON.stringify(internalSegment.value) !== JSON.stringify(props.segment)) {
        isDirty.value = true;
    }
}, { deep: true });

function removeSegment(segment: SegementWithId): void {
    emit('remove-segment', segment);
}

function addSegmentAfter(segment: SegementWithId): void {
    emit('add-segment-after', segment);
}

function seekTo(time: number): void {
    executeCommand(new SeekToSecondsCommand(time));
}

function applyChanges(): void {
    isDirty.value = false;
    emit('update-segment', internalSegment.value);
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
</script>

<template>
    <UCard>
        <UAlert
v-if="isDirty" title="" description="Do you want to apply your changes?" color="info" variant="outline"
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
            <USelectMenu v-model="internalSegment.speaker" :items="props.speakers" />
            <div>
                <!-- <UInputNumber v-model="internalSegment.start" type="number" :step="0.1" @keydown="handleKeydown" /> -->
                <a @click="() => seekTo(internalSegment.start)">
                    {{ formatTime(internalSegment.start) }}
                </a>
                -
                <a @click="() => seekTo(internalSegment.end)">{{ formatTime(internalSegment.end) }}</a>
                <!-- <UInputNumber v-model="internalSegment.end" type="number" :step="0.1" @keydown="handleKeydown" /> -->
            </div>
            <UButton color="primary" icon="i-heroicons-plus" @click="addSegmentAfter(internalSegment)" />
            <UButton color="error" icon="i-heroicons-trash" @click="removeSegment(internalSegment)" />
        </div>
    </UCard>
</template>

<style lang="scss" scoped></style>