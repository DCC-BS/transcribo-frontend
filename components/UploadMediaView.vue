<script lang="ts" setup>
import type { TaskStatus } from '~/types/task';
import { convertToWav } from '~/utils/mediaConverter';

const emit = defineEmits<{
    'uploaded': [task: TaskStatus, file: File];
}>();

const { t } = useI18n();

// Track the conversion progress
const conversionProgress = ref(0);
const progressMessage = ref('');
const showProgress = ref(false);
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
            await uploadFile(mediaFile, mediaFile);
            return;
        }

        // Otherwise convert to WAV
        showProgress.value = true;
        conversionProgress.value = 0;
        progressMessage.value = t('upload.convertingMedia');

        // Convert the file to WAV format
        const result = await convertToWav(mediaFile, {
            onProgress: (progress) => {
                console.log('progress', progress);
                conversionProgress.value = progress;
            }
        });

        progressMessage.value = t('upload.uploadingMedia');
        await uploadFile(result.wavFile, mediaFile);
    } catch (error) {
        console.error('Error processing media file:', error);
        errorMessage.value = t('upload.processingError');
    } finally {
        showProgress.value = false;
    }
};

/**
 * Uploads the file to the server
 */
async function uploadFile(file: File, originalFile: File): Promise<void> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await $fetch<TaskStatus>('/api/transcribe/submit', {
        body: formData,
        method: 'POST',
    });

    emit('uploaded', response, originalFile);
}
</script>

<template>
    <div>
        <UInput type="file" accept="audio/*,video/*" size="xl" icon="i-heroicons-document-arrow-up" @change="loadAudio"
            :disabled="showProgress" />

        <div v-if="showProgress" class="mt-4">
            <p>{{ progressMessage }}</p>
            <UProgress v-model="conversionProgress" :max="1" class="mt-2" />
        </div>

        <p v-if="errorMessage" class="text-red-500 mt-2">{{ errorMessage }}</p>
    </div>
</template>

<style scoped></style>