<script lang="ts" setup>
import type { UploadFileCommand } from "~/types/commands";
import { Cmds } from "~/types/commands";
import type {
    MediaConfigureData,
    MediaSelectionData,
} from "~/types/mediaStepInOut";

const { t } = useI18n();
const { onCommand } = useCommandBus();
const { addTask } = useTasks();

const step = ref(1);
const mediaSelectionData = ref<MediaSelectionData>();
const mediaPreviewData = ref<MediaConfigureData>();

onCommand<UploadFileCommand>(Cmds.UploadFileCommand, async (command) => {
    const file = command.file;
    const status = command.status;

    const storedTask = await addTask(status, file, file.name);
    navigateTo(`task/${storedTask.id}`);
});

function onMediaSelected(data: MediaSelectionData) {
    mediaSelectionData.value = data;
    step.value = 2;
}

function onMediaConfigure(payload: MediaConfigureData) {
    mediaPreviewData.value = payload;
    step.value = 3;
}
</script>

<template>
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

        <div class="p-2">
            <MediaSelectionView v-if="step === 1" @onMediaSelected="onMediaSelected" />
            <MediaPreviewView v-if="step === 2 && mediaSelectionData" v-model:input="mediaSelectionData"
                @on-next="onMediaConfigure" />
            <MediaProcessingView v-if="step === 3 && mediaPreviewData" v-model:input="mediaPreviewData" />
        </div>
    </div>
</template>
