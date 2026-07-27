<script lang="ts" setup>
import type {
    MediaConfigureData,
    MediaSelectionData,
} from "~/types/mediaStepInOut";
import { TaskStatusEnum } from "~/types/storedTasks";

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
    <div
        class="flex grow items-start justify-center overflow-y-auto px-5 py-10"
    >
        <div class="w-full max-w-215">
            <h2 class="mb-1.5 text-[1.35rem] font-bold tracking-tight">
                {{ t("navigation.new") }}
            </h2>
            <p class="mb-4 text-sm text-muted">
                {{ t("pages.index.subtitle") }}
            </p>

            <UAlert
                v-if="hasPendingTasks"
                class="mb-4"
                color="info"
                icon="i-lucide-info"
                variant="soft"
                :title="t('pages.index.pendingTitle')"
                :description="t('pages.index.pendingDescription')"
                :actions="[
                    {
                        label: t('pages.index.goToTranscriptions'),
                        href: '/',
                        color: 'secondary',
                    },
                ]"
                close
                @update:open="(o) => (hasPendingTasks = o)"
            />

            <UploadStepChips
                v-model="step"
                :labels="[
                    t('pages.index.step1'),
                    t('pages.index.step2'),
                    t('pages.index.step3'),
                ]"
            />

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
                class="mx-auto w-full md:w-2/3"
            />
        </div>
    </div>
</template>
