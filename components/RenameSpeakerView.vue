<script lang="ts" setup>
import { UInput } from '#components';
import { RenameSpeakerCommand } from '~/types/commands';

// Get speakers from the current transcription
const { speakers } = useCurrentTranscription();
const { executeCommand } = useCommandBus();

// Create a mapping of original speaker names to their new names
// This allows us to track both the original name and the edited name
const speakerMappings = ref<{ original: string; new: string }[]>([]);

/**
 * Initialize speaker mappings when speakers change
 */
watch(speakers, () => {
    speakerMappings.value = speakers.value.map(speaker => ({
        original: speaker,
        new: speaker
    }));
}, { immediate: true });

/**
 * Handle speaker name change
 * @param originalName - The original speaker name
 * @param newName - The updated speaker name
 */
function handleSpeakerNameChange(originalName: string, newName: string): void {
    // Don't execute command if the name hasn't actually changed
    if (originalName === newName) {
        return;
    }

    // Execute the rename speaker command
    executeCommand(new RenameSpeakerCommand(originalName, newName));
}
</script>

<template>
    <div>
        <h2>Speakers</h2>
        <ul class="speaker-list">
            <li v-for="(speakerMap, index) in speakerMappings" :key="index" class="speaker-item">
                <UInput v-model="speakerMap.new" @change="handleSpeakerNameChange(speakerMap.original, speakerMap.new)"
                    placeholder="Speaker name" />
            </li>
        </ul>
    </div>
</template>

<style>
.speaker-list {
    list-style: none;
    padding: 0;
}

.speaker-item {
    margin-bottom: 10px;
}
</style>