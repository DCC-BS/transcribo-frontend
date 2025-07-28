<script lang="ts" setup>
import type { UploadMediaView } from "#components";
import type { TaskStatus } from "~/types/task";

const tasksStore = useTasksStore();
const { t } = useI18n();

const uploadMediaView = ref<typeof UploadMediaView>();

async function handleUpload(status: TaskStatus, file: File): Promise<void> {
    const storedTask = await tasksStore.addTask(status, file, file.name);
    navigateTo(`task/${storedTask.id}`);
}

async function handleRecordingComplete(audioBlob: Blob): Promise<void> {
    const file = new File([audioBlob], "recording.webm", {
        type: "audio/webm",
    });
    await uploadMediaView.value?.uploadFile(audioBlob, file);
}
</script>

<template>
    <UContainer>
        <div class="flex flex-col items-center text-center pt-5">
            <div>
                <div class="text-lg font-bold my-4">
                    {{ t('pages.index.uploadMedia') }}
                </div>
                <UploadMediaView
                    ref="uploadMediaView"
                    @uploaded="handleUpload"
                />
            </div>

            <div class="mt-5">
                <div class="text-lg font-bold my-4">
                    {{ t('pages.index.recordAudio') }}
                </div>
                <AudioRecorder @recording-complete="handleRecordingComplete" />
            </div>

            <div class="pt-5 flex flex-col items-center gap-2">
                <DisclaimerButton app-name="Transcribo" />
                <DataBsBanner />
            </div>
        </div>
    </UContainer>
</template>
