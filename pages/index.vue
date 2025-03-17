<script lang="ts" setup>
import type { UploadMediaView } from '#components';
import type { TaskStatus } from '~/types/task';

const tasksStore = useTasksStore();
const { t } = useI18n();

const uploadMediaView = ref<typeof UploadMediaView>();

async function handleUpload(status: TaskStatus, file: File): Promise<void> {
    const storedTask = await tasksStore.addTask(status, file, file.name);
    navigateTo(`task/${storedTask.id}`);
}

async function handleRecordingComplete(audioBlob: Blob): Promise<void> {
    const file = new File([audioBlob], 'recording.wav', { type: 'audio/wav' });
    await uploadMediaView.value?.uploadFile(audioBlob, file);
}
</script>

<template>
    <UContainer>
        <div class="flex flex-col items-center text-center pt-5">
            <div class="text-lg font-bold">{{ t('pages.index.uploadMedia') }}</div>
            <UploadMediaView @uploaded="handleUpload" ref="uploadMediaView" />

            <AudioRecorder @recording-complete="handleRecordingComplete" />
        </div>
    </UContainer>
</template>