<script lang="ts" setup>
import { UButton, ULink } from '#components';

const transcriptionStore = useTranscriptionsStore();
const { openDialog } = useDialog();

onMounted(() => {
    transcriptionStore.loadAllTranscriptions();
});

function handleDeletedTranscription(transcriptionId: string): void {
    openDialog({
        title: 'Delete Transcription',
        message: 'Are you sure you want to delete this transcription?',
        onSubmit: () => transcriptionStore.deleteTranscription(transcriptionId),
    });
}
</script>

<template>
    <div>
        <div v-for="transcription in transcriptionStore.transcriptions" :key="transcription.id">
            <div class="test-lg font-bold">{{ transcription.name }}</div>
            <ULink as="button" :to="`transcription/${transcription.id}`">Edit</ULink>
            <UButton color="error" @click="() => handleDeletedTranscription(transcription.id)">Delete
            </UButton>
        </div>

        <div v-if="transcriptionStore.transcriptions.length === 0">
            <div>No transcriptions found</div>
        </div>
    </div>
</template>