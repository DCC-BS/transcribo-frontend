<script lang="ts" setup>
import type { TaskStatus } from '~/types/task';

const emit = defineEmits<{
    'uploaded': [task: TaskStatus, file: File];
}>();

const { t } = useI18n();
const logger = useLogger();

// Track the conversion progress
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
        await uploadFile(mediaFile, mediaFile);
    } catch (error) {
        logger.error('Error processing media file:', error);
        errorMessage.value = t('upload.processingError');
    } finally {
        showProgress.value = false;
    }
};

/**
 * Uploads the file to the server
 */
async function uploadFile(file: File, originalFile: File): Promise<void> {
    showProgress.value = true;
    progressMessage.value = t('upload.uploadingMedia');

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
            <UProgress class="mt-2" />
        </div>

        <p v-if="errorMessage" class="text-red-500 mt-2">{{ errorMessage }}</p>
    </div>
</template>

<style scoped></style>