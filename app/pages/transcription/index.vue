<script lang="ts" setup>
import { isApiError } from "@dcc-bs/communication.bs.js";
import { TRANSCRIPTION_RETENTION_PERIOD_MS } from "#imports";
import ProcessingTasksTable from "~/components/transcription/ProcessingTasksTable.vue";
import TranscriptionTable from "~/components/transcription/TranscriptionTable.vue";
import type { StoredTranscription } from "~/types/storedTranscription";
import type { StoredTask } from "~/types/task";
import { TaskStatusEnum, TaskStatusSchema } from "~/types/task";
import { TranscriptionResponseSchema } from "~/types/transcriptionResponse";

const retentionDays = computed(() => {
    return Math.ceil(TRANSCRIPTION_RETENTION_PERIOD_MS / (1000 * 60 * 60 * 24));
});

const { getTranscriptions, addTranscription, deleteTranscription } = useTranscription();
const { getTask, getTasks, updateTaskStatus, deleteTask, cleanupFailedAndCanceledTasks } = useTasks();
const { t } = useI18n();
const { apiFetch } = useApi();

const transcriptions = shallowRef<StoredTranscription[]>();

const processingTasks = ref<StoredTask[]>([]);
const isProcessingLoading = ref(false);
const processingError = ref<string>();

const inProgressTasks = computed(() =>
    processingTasks.value.filter(
        (task) => task.status.status === TaskStatusEnum.IN_PROGRESS,
    ),
);

async function checkTaskStatus(task: StoredTask): Promise<void> {
    try {
        const statusResponse = await apiFetch(
            `/api/transcribe/${task.id}/status`,
            { schema: TaskStatusSchema },
        );

        if (isApiError(statusResponse)) {
            throw statusResponse;
        }

        if (statusResponse.status === TaskStatusEnum.COMPLETED) {
            const transcriptionResponse = await apiFetch(
                `/api/transcribe/${task.id}`,
                { schema: TranscriptionResponseSchema },
            );

            const fullTask = await getTask(task.id);
            if (!fullTask?.mediaFile) {
                throw new Error(t("task.errors.noMediaFile"));
            }

            if (isApiError(transcriptionResponse)) {
                processingError.value = t(`errors.${transcriptionResponse.errorId}`);
                return;
            }

            await addTranscription({
                segments: transcriptionResponse.segments.map((segment) => ({
                    ...segment,
                    id: crypto.randomUUID(),
                })),
                name: task.mediaFileName || t("transcription.untitled"),
                mediaFile: fullTask.mediaFile,
                mediaFileName: task.mediaFileName,
            });

            await deleteTask(task.id);
            await loadProcessingTasks();
        } else if (
            statusResponse.status === TaskStatusEnum.FAILED ||
            statusResponse.status === TaskStatusEnum.CANCELLED
        ) {
            await updateTaskStatus(task.id, statusResponse);
            processingTasks.value = processingTasks.value.map((taskItem) =>
                taskItem.id === task.id
                    ? { ...taskItem, status: statusResponse }
                    : taskItem,
            );
        } else if (statusResponse.status === TaskStatusEnum.IN_PROGRESS) {
            updateTaskStatus(task.id, statusResponse);
            processingTasks.value = processingTasks.value.map((taskItem) =>
                taskItem.id === task.id
                    ? { ...taskItem, status: statusResponse }
                    : taskItem,
            );
        }
    } catch (err: unknown) {
        if (
            err &&
            typeof err === "object" &&
            "statusCode" in err &&
            (err as { statusCode?: number }).statusCode === 404
        ) {
            await deleteTask(task.id);
            await loadProcessingTasks();
            return;
        }

        const errorMsg =
            err instanceof Error
                ? err.message
                : t("processing.errors.statusCheckFailed");
        if (!processingError.value) {
            processingError.value = errorMsg;
        }
    }
}

async function loadProcessingTasks(): Promise<void> {
    try {
        isProcessingLoading.value = true;
        processingError.value = undefined;
        const allTasks = await getTasks();
        processingTasks.value = allTasks;

        const tasksToCheck = allTasks.filter(
            (task) => task.status.status === TaskStatusEnum.IN_PROGRESS,
        );

        await Promise.allSettled(
            tasksToCheck.map((task) => checkTaskStatus(task)),
        );

        await cleanupFailedAndCanceledTasks();
    } catch (err: unknown) {
        processingError.value =
            err instanceof Error
                ? err.message
                : t("processing.errors.loadFailed");
    } finally {
        isProcessingLoading.value = false;
    }
}

async function refreshStatuses(): Promise<void> {
    await loadProcessingTasks();
}

onMounted(async () => {
    transcriptions.value = await getTranscriptions();
    loadProcessingTasks();

    const refreshInterval = setInterval(() => {
        const hasInProgressTasks = processingTasks.value.some(
            (task) => task.status.status === TaskStatusEnum.IN_PROGRESS,
        );
        if (hasInProgressTasks) {
            refreshStatuses();
        }
    }, 10000);

    onUnmounted(() => {
        clearInterval(refreshInterval);
    });
});
</script>

<template>
    <UContainer>
        <UAlert icon="i-lucide-info" color="info" variant="soft" :title="t('retention.title')"
            :description="t('retention.description', { retentionDays: retentionDays })" />

        <ProcessingTasksTable :tasks="inProgressTasks" :loading="isProcessingLoading" :error="processingError"
            @refresh="refreshStatuses" @dismiss-error="processingError = undefined" />

        <TranscriptionTable :transcriptions="transcriptions" @delete="deleteTranscription" />
    </UContainer>
</template>
