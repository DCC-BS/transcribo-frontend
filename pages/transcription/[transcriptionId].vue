<script lang="ts" setup>
import { UInput } from '#components';
import { TogglePlayCommand } from '~/types/commands';

const route = useRoute();
const transcriptionStore = useTranscriptionsStore();
const { executeCommand } = useCommandBus();

const transcriptionId = route.params.transcriptionId as string;

if (transcriptionId) {
    transcriptionStore.setCurrentTranscription(transcriptionId);
}

const currentTranscription = transcriptionStore.currentTranscription;

onMounted(() => {
    window.addEventListener('keydown', handleDownUp);
});

onUnmounted(() => {
    window.removeEventListener('keydown', handleDownUp);
});

function handleDownUp(event: KeyboardEvent): void {
    // Check for space key using both event.code and event.key for better browser compatibility
    if (event.code === 'Space' || event.key === ' ') {
        // Prevent default scrolling behavior when space is pressed
        event.preventDefault();
        // Execute the toggle play command
        executeCommand(new TogglePlayCommand());
    }
}

function handleNameChange(name: string | number): void {
    if (typeof name === 'string') {
        transcriptionStore.updateCurrentTrascription({
            name: name,
        });
    }
}
</script>

<template>
    <div class="p-2">
        <UInput :model-value="currentTranscription?.name" class="w-full p-2" @update:model-value="handleNameChange" />
        <SplitView>
            <template #a>
                <MediaEditor />
            </template>
            <template #b>
                <TranscriptionList class="p-2" />
            </template>
        </SplitView>
    </div>
</template>


<style></style>