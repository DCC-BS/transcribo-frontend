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
    const file = new File([audioBlob], 'recording.webm', { type: 'audio/webm' });
    await uploadMediaView.value?.uploadFile(audioBlob, file);
}
</script>

<template>
    <UContainer>
        <div class="flex flex-col items-center text-center pt-5">
            <div>
                <div class="text-lg font-bold my-4">{{ t('pages.index.uploadMedia') }}</div>
                <UploadMediaView ref="uploadMediaView" @uploaded="handleUpload" />
            </div>

            <div class="mt-5">
                <div class="text-lg font-bold my-4">{{ t('pages.index.recordAudio') }}</div>
                <UAlert
class="text-left" icon="i-heroicons-information-circle"
                    :title="t('pages.index.experimentalTitle')" color="info"
                    :description="t('pages.index.experimental')" />
                <AudioRecorder @recording-complete="handleRecordingComplete" />
            </div>

            <div class="pt-5 flex flex-col items-center gap-2">
                <DisclaimerLlm class="align-middle self-center" />
                <DataBsBanner />
            </div>
        </div>
    </UContainer>
</template>