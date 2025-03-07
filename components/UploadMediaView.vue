<script lang="ts" setup>
import type { TaskStatus } from '~/types/task';

const emit = defineEmits<{
    'uploaded': [task: TaskStatus, file: File];
}>();

const loadAudio = async (event: Event): Promise<void> => {
    if (!event.target) {
        return;
    }

    const target = event.target as HTMLInputElement;
    if (!target.files || target.files.length === 0) {
        return;
    }

    const audioFile = target.files[0]; // Update the reference to the uploaded audio file

    const formData = new FormData();
    formData.append('file', audioFile);

    const response = await $fetch<TaskStatus>('/api/transcribe/submit', {
        body: formData,
        method: 'POST',
    });

    emit('uploaded', response, audioFile);
};
</script>

<template>
    <div>
        <UInput type="file" accept="audio/*,video/*" size="xl" icon="i-heroicons-document-arrow-up"
            @change="loadAudio" />
    </div>
</template>

<style scoped></style>