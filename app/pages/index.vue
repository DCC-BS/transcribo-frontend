<script lang="ts" setup>
import { Cmds, type UploadFileCommand } from "~/types/commands";
import type { MediaSelectionData, MediaConfigureData } from "~/types/mediaStepInOut";

const tasksStore = useTasksStore();
const { t } = useI18n();
const { onCommand } = useCommandBus();
const { uploadFile } = useAudioUpload();

const step = ref(1);
const mediaSelectionData = ref<MediaSelectionData>();
const mediaPreviewData = ref<MediaConfigureData>();

onCommand<UploadFileCommand>(Cmds.UploadFileCommand, async (command) => {
    const file = command.file;
    const status = command.status;

    const storedTask = await tasksStore.addTask(status, file, file.name);
    navigateTo(`task/${storedTask.id}`);
});

function onMediaSelected(data: MediaSelectionData) {
    mediaSelectionData.value = data;
    step.value = 2;
}

function onMediaConfigure(data: MediaConfigureData) {

}

async function handleRecordingComplete(audioBlob: Blob): Promise<void> {
    const file = new File([audioBlob], "recording.webm", {
        type: "audio/webm",
    });

    uploadFile(file, file);
}
</script>

<template>
    <UContainer class="py-12 space-y-12">
        <p class="text-lg text-gray-600 dark:text-gray-300">
            {{ t('pages.index.subtitle') }}
        </p>

        <div class="ring-1 ring-default rounded-md shadow-[2px_2px_1px_1px_#0000000D]">
            <div class="border-b border-default p-2">
                <div class="w-full flex justify-center items-center">
                    <UButton variant="soft" icon="i-lucide-plus">{{ t("navigation.new") }}</UButton>
                    <UButton variant="ghost" icon="i-lucide-list">{{ t("navigation.transcriptions") }}</UButton>
                </div>
            </div>

            <div>
                <div class="flex items-center justify-center">
                    <UButton variant="link" :class="{ 'font-bold': step === 1 }" @click="step = 1">
                        1. Upload Media
                    </UButton>
                    <template v-if="step > 1">
                        <UIcon name="i-lucide-chevron-right" />
                        <UButton variant="link" :class="{ 'font-bold': step === 2 }" @click="step = 2">
                            2. Settings
                        </UButton>
                    </template>
                    <template v-if="step > 2">
                        <UIcon name="i-lucide-chevron-right" />
                        <UButton variant="link" v-if="step > 2" :class="{ 'font-bold': step === 3 }">
                            3. Process Media
                        </UButton>
                    </template>
                </div>

                <MediaSelectionView v-if="step === 1" @onMediaSelected="onMediaSelected" />
                <MediaPreviewView v-if="step === 2 && mediaSelectionData" :data="mediaSelectionData" />
                <MediaProcessingView v-if="step === 3 && mediaPreviewData" :data="mediaPreviewData" />
            </div>
        </div>
    </UContainer>
</template>
