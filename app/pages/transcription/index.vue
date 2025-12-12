<script lang="ts" setup>
import { isApiError } from "@dcc-bs/communication.bs.js";
import { UButton, ULink } from "#components";
import type { StoredTask } from "~/stores/tasksStore";
import { TRANSCRIPTION_RETENTION_PERIOD_MS } from "~/stores/transcriptionsStore";
import type { TaskStatus } from "~/types/task";
import { TaskStatusEnum } from "~/types/task";
import type { StoredTranscription } from "~/types/storedTranscription";

const retentionDays = computed(() => {
    return Math.ceil(TRANSCRIPTION_RETENTION_PERIOD_MS / (1000 * 60 * 60 * 24));
});

const transcriptionStore = useTranscriptionsStore();
const taskStore = useTasksStore();
const { openDialog } = useDialog();
const { t } = useI18n();
const { apiFetch } = useApi();

// Define columns for the table
const columns = [
    {
        accessorKey: "name",
        header: t("transcription.table.name"),
        enableSorting: true,
        enableResizing: true,
        size: 200,
        maxSize: 300,
    },
    {
        accessorKey: "createdAt",
        header: t("transcription.table.createdAt"),
        enableResizing: true,
        enableSorting: true,
        cell: (props: { row: { original: StoredTranscription } }) => {
            return new Date(props.row.original.createdAt).toLocaleString(
                "de-CH",
                {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: false,
                },
            );
        },
    },
    {
        accessorKey: "updatedAt",
        header: t("transcription.table.updatedAt"),
        enableSorting: true,
        enableResizing: true,
        cell: (opts: unknown) => {
            const row = (
                opts as { row: { getValue: (key: string) => unknown } }
            ).row;
            return new Date(row.getValue("updatedAt") as number).toLocaleString(
                "de-CH",
                {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: false,
                },
            );
        },
    },
    {
        accessorKey: "actions",
        header: "",
    },
];

// Pending (in-progress) tasks state
const processingTasks = ref<StoredTask[]>([]);
const isProcessingLoading = ref(false);
const processingError = ref<string | null>(null);

// Columns for pending tasks table
const processingColumns = [
    {
        accessorKey: "mediaFileName",
        header: t("processing.table.fileName"),
        enableSorting: true,
        enableResizing: true,
        size: 200,
        maxSize: 300,
    },
    {
        accessorKey: "createdAt",
        header: t("processing.table.createdAt"),
        enableResizing: true,
        enableSorting: true,
        cell: (opts: unknown) => {
            const row = (
                opts as { row: { getValue: (key: string) => unknown } }
            ).row;
            const createdAt = row.getValue("createdAt") as number;
            return new Date(createdAt).toLocaleString("de-CH", {
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
            });
        },
    },
    {
        accessorKey: "status",
        header: t("processing.table.status"),
        enableSorting: true,
        enableResizing: true,
    },
];

// Filter to only show in-progress tasks in UI
const inProgressTasks = computed(() =>
    processingTasks.value.filter(
        (t) => t.status.status === TaskStatusEnum.IN_PROGRESS,
    ),
);

function getStatusDisplay(status: TaskStatusEnum): string {
    switch (status) {
        case TaskStatusEnum.IN_PROGRESS:
            return t("processing.status.inProgress");
        case TaskStatusEnum.COMPLETED:
            return t("processing.status.completed");
        case TaskStatusEnum.FAILED:
            return t("processing.status.failed");
        case TaskStatusEnum.CANCELLED:
            return t("processing.status.cancelled");
        default:
            return status;
    }
}

function getStatusColor(
    status: TaskStatusEnum,
):
    | "error"
    | "info"
    | "success"
    | "neutral"
    | "primary"
    | "secondary"
    | "warning" {
    switch (status) {
        case TaskStatusEnum.IN_PROGRESS:
            return "info";
        case TaskStatusEnum.COMPLETED:
            return "success";
        case TaskStatusEnum.FAILED:
            return "error";
        case TaskStatusEnum.CANCELLED:
            return "neutral";
        default:
            return "neutral";
    }
}

// Compute progress for a given task status using the same logic as TaskStatusView
function computeTaskProgress(taskStatus: TaskStatus): number {
    switch (taskStatus.status) {
        case TaskStatusEnum.IN_PROGRESS:
            return typeof taskStatus.progress === "number"
                ? taskStatus.progress
                : 0;
        case TaskStatusEnum.COMPLETED:
            return 1;
        case TaskStatusEnum.FAILED:
            return 1;
        case TaskStatusEnum.CANCELLED:
            return 0;
        default:
            return 0;
    }
}

// Check task status and convert to transcription if completed
async function checkTaskStatus(task: StoredTask): Promise<void> {
    try {
        const statusResponse = await apiFetch<TaskStatus>(
            `/api/transcribe/${task.id}/status`,
        );

        if (isApiError(statusResponse)) {
            throw new Error(statusResponse.debugMessage);
        }

        if (statusResponse.status === TaskStatusEnum.COMPLETED) {
            const transcriptionResponse = await apiFetch<
                import("~/types/transcriptionResponse").TranscriptionResponse
            >(`/api/transcribe/${task.id}`);

            const fullTask = await taskStore.getTask(task.id);
            if (!fullTask?.mediaFile) {
                throw new Error(t("task.errors.noMediaFile"));
            }

            if (isApiError(transcriptionResponse)) {
                // todo transalte error message
                processingError.value = transcriptionResponse.errorId;
                return;
            }

            await transcriptionStore.addTranscription(
                {
                    segments: transcriptionResponse.segments.map((segment) => ({
                        ...segment,
                        id: crypto.randomUUID(),
                    })),
                    name: task.mediaFileName || t("transcription.untitled"),
                },
                fullTask.mediaFile,
                task.mediaFileName,
            );

            await taskStore.deleteTask(task.id);
            await loadProcessingTasks();
        } else if (
            statusResponse.status === TaskStatusEnum.FAILED ||
            statusResponse.status === TaskStatusEnum.CANCELLED
        ) {
            // Update local status; cleanup will remove these after polling finishes
            await taskStore.updateTask(task.id, { status: statusResponse });
            processingTasks.value = processingTasks.value.map((t) =>
                t.id === task.id ? { ...t, status: statusResponse } : t,
            );
        } else if (statusResponse.status === TaskStatusEnum.IN_PROGRESS) {
            // Update local task status to reflect progress in UI
            await taskStore.updateTask(task.id, { status: statusResponse });
            processingTasks.value = processingTasks.value.map((t) =>
                t.id === task.id ? { ...t, status: statusResponse } : t,
            );
        }
    } catch (err: unknown) {
        if (
            err &&
            typeof err === "object" &&
            "statusCode" in err &&
            (err as { statusCode?: number }).statusCode === 404
        ) {
            // Task no longer exists on backend; remove locally
            await taskStore.deleteTask(task.id);
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

// Load tasks and poll in-progress ones
async function loadProcessingTasks(): Promise<void> {
    try {
        isProcessingLoading.value = true;
        processingError.value = null;
        const allTasks = await taskStore.loadAllTasks();
        processingTasks.value = allTasks;

        const tasksToCheck = allTasks.filter(
            (task) => task.status.status === TaskStatusEnum.IN_PROGRESS,
        );

        await Promise.allSettled(
            tasksToCheck.map((task) => checkTaskStatus(task)),
        );

        // After polling, cleanup failed and cancelled tasks from local storage
        await cleanupFailedAndCancelledTasks();
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

// Remove tasks with status FAILED or CANCELLED from local storage and UI
async function cleanupFailedAndCancelledTasks(): Promise<void> {
    try {
        const idsToDelete = processingTasks.value
            .filter(
                (t) =>
                    t.status.status === TaskStatusEnum.FAILED ||
                    t.status.status === TaskStatusEnum.CANCELLED,
            )
            .map((t) => t.id);

        if (idsToDelete.length === 0) return;

        await Promise.allSettled(
            idsToDelete.map((id) => taskStore.deleteTask(id)),
        );

        // Reflect deletions in local UI state
        processingTasks.value = processingTasks.value.filter(
            (t) => !idsToDelete.includes(t.id),
        );
    } catch (err: unknown) {
        const errorMsg =
            err instanceof Error
                ? err.message
                : t("processing.errors.loadFailed");
        if (!processingError.value) {
            processingError.value = errorMsg;
        }
    }
}

onMounted(() => {
    transcriptionStore.loadAllTranscriptions();
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

function handleDeletedTranscription(transcriptionId: string): void {
    openDialog({
        title: t("transcription.delete.title"),
        message: t("transcription.delete.confirmation"),
        onSubmit: () => transcriptionStore.deleteTranscription(transcriptionId),
    });
}
</script>

<template>
    <UContainer>
        <UAlert icon="i-lucide-info" color="info" variant="soft" :title="t('retention.title')" :description="t('retention.description', { retentionDays: retentionDays })
            " />
        <!-- Pending tasks section (shown only when there are in-progress tasks) -->
        <div v-if="inProgressTasks.length > 0" class="space-y-6 mb-8">
            <div class="flex justify-between items-center">
                <div>
                    <h2 class="text-xl font-bold">
                        {{ t("processing.title") }}
                    </h2>
                    <p class="text-gray-600 mt-1">
                        {{ t("processing.description") }}
                    </p>
                </div>
                <UButton icon="i-lucide-loader-circle" @click="refreshStatuses" :loading="isProcessingLoading">
                    {{ t("processing.refresh") }}
                </UButton>
            </div>

            <UAlert v-if="processingError" icon="i-lucide-triangle-alert" color="error" variant="soft"
                :title="t('processing.errors.title')" :description="processingError"
                @dismiss="processingError = null" />

            <UTable :columns="processingColumns" :data="inProgressTasks" sticky :loading="isProcessingLoading"
                :empty-state="{
                    icon: 'i-lucide-clock',
                    label: t('processing.noTasksFound'),
                    description: t('processing.noTasksDescription'),
                }" :sorting-options="{ enableSorting: true }">
                <template #mediaFileName-cell="{ row }">
                    <div class="font-medium text-wrap">
                        {{
                            row.original.mediaFileName ||
                            t("processing.unknownFile")
                        }}
                    </div>
                </template>

                <template #status-cell="{ row }">
                    <div class="flex items-center gap-2">
                        <UBadge :color="getStatusColor(row.original.status.status)" variant="subtle">
                            {{ getStatusDisplay(row.original.status.status) }}
                        </UBadge>
                        <template v-if="
                            row.original.status.status ===
                            TaskStatusEnum.IN_PROGRESS
                        ">
                            <UIcon name="i-lucide-cog" class="animate-spin text-blue-600" />
                            <span class="text-sm text-blue-600">({{
                                Math.round(
                                    computeTaskProgress(
                                        row.original.status,
                                    ) * 100,
                                )
                            }}%)</span>
                        </template>
                    </div>
                </template>
            </UTable>
        </div>

        <UTable :columns="columns" :data="transcriptionStore.transcriptions" sticky :empty-state="{
            icon: 'i-lucide-file-text',
            label: t('transcription.noTranscriptionsFound'),
            description: t('ui.emptyState.description'),
        }" :sorting-options="{ enableSorting: true }">
            <!-- Custom cell renderer for the name column -->
            <template #name-cell="{ row }">
                <div class="font-bold text-wrap">{{ row.original.name }}</div>
            </template>

            <!-- Custom cell renderer for the actions column -->
            <template #actions-cell="{ row }">
                <div class="flex gap-2 justify-end">
                    <ULink :to="`transcription/${row.original.id}`">
                        <UButton icon="i-lucide-pencil" color="primary">
                            {{ t("transcription.actions.edit") }}
                        </UButton>
                    </ULink>
                    <UButton icon="i-lucide-trash" color="error" @click="handleDeletedTranscription(row.original.id)">
                        {{ t("transcription.actions.delete") }}
                    </UButton>
                </div>
            </template>
        </UTable>
    </UContainer>
</template>
