<script lang="ts" setup>
import type {
    MediaConfigureData,
    MediaSelectionData,
} from "~/types/mediaStepInOut";

const { t } = useI18n();
const { getTask, deleteTask } = useTasks();
const route = useRoute();
const { showError } = useUserFeedback();
const logger = useLogger();

const taskId = route.query.taskId as string | undefined;

const step = ref(1);
const mediaSelectionData = ref<MediaSelectionData>();
const mediaPreviewData = ref<MediaConfigureData>();

if (taskId) {
    const task = await getTask(taskId);

    if (!task?.mediaFile || !task.mediaFileName) {
        const error = new Error("Task not found or has no media file");
        showError(error);
        logger.error(error, `Failed to load task with id ${taskId}`);
    } else {
        deleteTask(taskId);
        mediaSelectionData.value = {
            media: new File([task.mediaFile], task.mediaFileName),
        };
        step.value = 2;
    }
}

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
    <div class="mx-auto max-w-[95vw]">
        <p class="hidden md:block text-lg text-gray-600 dark:text-gray-300 m-4">
            {{ t("pages.index.subtitle") }}
        </p>

        <div class="flex items-center justify-center">
            <UButton
                icon="i-lucide-file-up"
                variant="link"
                :class="{ 'font-bold': step === 1 }"
                @click="step = 1"
            >
                <span class="hidden md:inline">
                    1. {{ t("pages.index.step1") }}
                </span>
            </UButton>
            <template v-if="step > 1">
                <UIcon name="i-lucide-chevron-right" />
                <UButton
                    icon="i-lucide-settings"
                    variant="link"
                    :class="{ 'font-bold': step === 2 }"
                    @click="step = 2"
                >
                    <span class="hidden md:inline">
                        2. {{ t("pages.index.step2") }}
                    </span>
                </UButton>
            </template>
            <template v-if="step > 2">
                <UIcon name="i-lucide-chevron-right" />
                <UButton
                    icon="i-lucide-cpu"
                    variant="link"
                    v-if="step > 2"
                    :class="{ 'font-bold': step === 3 }"
                >
                    <span class="hidden md:inline">
                        3. {{ t("pages.index.step3") }}
                    </span>
                </UButton>
            </template>
        </div>

        <div class="p-2">
            <MediaSelectionView
                v-if="step === 1"
                @onMediaSelected="onMediaSelected"
            />
            <MediaPreviewView
                v-if="step === 2 && mediaSelectionData"
                v-model:input="mediaSelectionData"
                @on-next="onMediaConfigure"
            />
            <MediaProcessingView
                v-if="step === 3 && mediaPreviewData"
                v-model:input="mediaPreviewData"
            />
        </div>
    </div>
</template>
