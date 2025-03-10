<script lang="ts" setup>
import type { TaskStatus } from '~/types/task';
import { convertToWav } from '~/utils/mediaConverter';

const emit = defineEmits<{
    'uploaded': [task: TaskStatus, file: File];
}>();

// Track the conversion progress
const conversionProgress = ref(0);
const isConverting = ref(false);
const errorMessage = ref('');

/**
 * Handles the file upload and conversion process
 */
const loadAudio = async (event: Event): Promise<void> => {
    if (!event.target) {
        return;
    }

    const target = event.target as HTMLInputElement;
    if (!target.files || target.files.length === 0) {
        return;
    }

    const mediaFile = target.files[0];
    errorMessage.value = '';

    try {
        // If it's already a WAV file, use it directly
        if (mediaFile.type === 'audio/wav') {
            await uploadFile(mediaFile);
            return;
        }

        // Otherwise convert to WAV
        isConverting.value = true;
        conversionProgress.value = 0;

        // Convert the file to WAV format
        const result = await convertToWav(mediaFile, {
            onProgress: (progress) => {
                conversionProgress.value = progress;
            }
        });

        await uploadFile(result.wavFile);
    } catch (error) {
        console.error('Error processing media file:', error);
        errorMessage.value = 'Failed to process the media file. Please try again.';
    } finally {
        isConverting.value = false;
    }
};

/**
 * Uploads the file to the server
 */
async function uploadFile(file: File): Promise<void> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await $fetch<TaskStatus>('/api/transcribe/submit', {
        body: formData,
        method: 'POST',
    });

    emit('uploaded', response, file);
}
</script>

<template>
    <div>
        <UInput type="file" accept="audio/*,video/*" size="xl" icon="i-heroicons-document-arrow-up" @change="loadAudio"
            :disabled="isConverting" />

        <div v-if="isConverting" class="mt-4">
            <p>Converting media to WAV format...</p>
            <UProgress :value="conversionProgress * 100" class="mt-2" />
        </div>

        <p v-if="errorMessage" class="text-red-500 mt-2">{{ errorMessage }}</p>
    </div>
</template>

<style scoped></style>