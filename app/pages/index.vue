<script lang="ts" setup>
import type {
    MediaConfigureData,
    MediaSelectionData,
} from "~/types/mediaStepInOut";
import { TaskStatusEnum } from "~/types/task";

const { t } = useI18n();
const { getTask, deleteTask, getTasksByStatus } = useTasks();
const route = useRoute();
const { showError } = useUserFeedback();
const logger = useLogger();

const taskId = route.query.taskId as string | undefined;

const step = ref(1);
const mediaSelectionData = ref<MediaSelectionData>();
const mediaPreviewData = ref<MediaConfigureData>();
const hasPendingTasks = ref(false);

onMounted(async () => {
    if (taskId) {
        const task = await getTask(taskId.trim());
        if (!task?.mediaFile || !task.mediaFileName) {
            const error = new Error("Task not found or has no media file");
            showError(error);
            logger.error(error, `Failed to load task with id ${taskId}`);
        } else {
            deleteTask(taskId);
            mediaSelectionData.value = {
                media: new File([task.mediaFile], task.mediaFileName, {
                    type: task.mediaFile.type,
                }),
                taskId: taskId,
            };
            step.value = 2;
        }
    } else {
        const pendingTasks = await getTasksByStatus(TaskStatusEnum.PENDING);
        hasPendingTasks.value = pendingTasks.length > 0;
    }
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
    <div class="mx-auto max-w-[95vw]">
        <p class="hidden md:block text-lg text-gray-600 dark:text-gray-300 m-4">
            {{ t("pages.index.subtitle") }}
        </p>

        <UAlert
            v-if="hasPendingTasks"
            @update:open="(o) => (hasPendingTasks = o)"
            color="info"
            icon="i-lucide-info"
            variant="soft"
            :title="t('pages.index.pendingTitle')"
            :description="t('pages.index.pendingDescription')"
            :actions="[
                {
                    label: t('pages.index.goToTranscriptions'),
                    href: '/transcription',
                    color: 'secondary',
                },
            ]"
            close
        >
        </UAlert>

        <div class="flex items-center justify-center">
            <UButton
                icon="i-lucide-file-up"
                variant="link"
                :aria-label="t('pages.index.step1')"
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
                    :aria-label="t('pages.index.step2')"
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
                    :aria-label="t('pages.index.step3')"
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
