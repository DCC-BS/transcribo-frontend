<script lang="ts" setup>
import { UInput } from '#components';
import { TogglePlayCommand, TranscriptonNameChangeCommand } from '~/types/commands';

const route = useRoute();
const transcriptionStore = useTranscriptionsStore();
const { executeCommand } = useCommandBus();

const transcriptionId = route.params.transcriptionId as string;
const { registerService, unRegisterServer } = useTranscriptionService(transcriptionId);

onMounted(() => {
    registerService();
    window.addEventListener('keydown', handleDownUp);
});

onUnmounted(() => {
    unRegisterServer();
    window.removeEventListener('keydown', handleDownUp);
});

function handleDownUp(event: KeyboardEvent): void {
    return;

    // Check for space key using both event.code and event.key for better browser compatibility
    if (event.code === 'Space' || event.key === ' ') {
        // Prevent default scrolling behavior when space is pressed
        event.preventDefault();
        // Execute the toggle play command
        executeCommand(new TogglePlayCommand());
    }
}

async function handleNameChange(name: string | number) {
    if (typeof name === 'string') {
        await executeCommand(new TranscriptonNameChangeCommand(name));
    }
}
</script>

<template>
    <div class="p-2" v-if="transcriptionStore.currentTranscription">
        <div class="flex justify-items-stretch p-2 gap-2">
            <UInput class="grow" :model-value="transcriptionStore.currentTranscription.name"
                @update:model-value="handleNameChange" />
            <ExportToolbar />
        </div>

        <SplitView>
            <template #a>
                <MediaEditor class="sticky" />
            </template>
            <template #b>
                <TranscriptionList class="p-2" />
            </template>
        </SplitView>
    </div>
    <div v-else>
        <p>Loading...</p>
    </div>
</template>