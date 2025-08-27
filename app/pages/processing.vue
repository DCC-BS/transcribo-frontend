<script lang="ts" setup>
import type { TableColumn } from "@nuxt/ui/runtime/components/Table.vue";
import { UButton, ULink } from "#components";
import type { StoredTask } from "~/stores/tasksStore";
import type { TaskStatus, TaskStatusEnum } from "~/types/task";
import type { TranscriptionResponse } from "~/types/transcriptionResponse";

// Store and composables setup
const taskStore = useTasksStore();
const transcriptionStore = useTranscriptionsStore();
const { openDialog } = useDialog();
const { t } = useI18n();
const { $api } = useNuxtApp();

// Reactive state
const isLoading = ref(false);
const processingTasks = ref<StoredTask[]>([]);
const error = ref<string | null>(null);

// Define columns for the table
const columns: TableColumn<StoredTask>[] = [
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
        cell: ({ row }) => {
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
        cell: ({ row }) => {
            const task = row.original;
            return getStatusDisplay(task.status.status);
        },
    },
    {
        accessorKey: "actions",
        header: "",
    },
];

/**
 * Get display text for task status
 */
function getStatusDisplay(status: TaskStatusEnum): string {
    switch (status) {
        case "in_progress":
            return t("processing.status.inProgress");
        case "completed":
            return t("processing.status.completed");
        case "failed":
            return t("processing.status.failed");
        case "cancelled":
            return t("processing.status.cancelled");
        default:
            return status;
    }
}

/**
 * Get status badge color based on task status
 */
function getStatusColor(status: TaskStatusEnum): "error" | "info" | "success" | "neutral" | "primary" | "secondary" | "warning" {
    switch (status) {
        case "in_progress":
            return "info";
        case "completed":
            return "success";
        case "failed":
            return "error";
        case "cancelled":
            return "neutral";
        default:
            return "neutral";
    }
}

/**
 * Check task status via API and update if completed
 */
async function checkTaskStatus(task: StoredTask): Promise<void> {
    try {
        const statusResponse = await $api<TaskStatus>(
            `/api/transcribe/${task.id}/status`,
        );

        if (statusResponse.status === "completed") {
            // Get the transcription result
            const transcriptionResponse = await $api<TranscriptionResponse>(
                `/api/transcribe/${task.id}`,
            );

            // Get the media file from the task
            const fullTask = await taskStore.getTask(task.id);
            if (!fullTask?.mediaFile) {
                throw new Error(t("task.errors.noMediaFile"));
            }

            // Create transcription entry
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

            // Remove task from tasks store
            await taskStore.deleteTask(task.id);

            // Refresh the processing list
            await loadProcessingTasks();
        } else if (
            statusResponse.status === "failed" ||
            statusResponse.status === "cancelled"
        ) {
            // Update task status in store
            await taskStore.updateTask(task.id, { status: statusResponse });
            await loadProcessingTasks();
        }
    } catch (err: unknown) {
        // Handle 404 errors gracefully - task no longer exists on backend
        if (err && typeof err === 'object' && 'statusCode' in err && err.statusCode === 404) {
            console.warn(`Task ${task.id} not found on backend (likely removed after restart), cleaning up locally`);
            // Remove task from local store since it no longer exists on backend
            await taskStore.deleteTask(task.id);
            await loadProcessingTasks();
            return;
        }
        
        console.error(`Failed to check status for task ${task.id}:`, err);
        error.value =
            err instanceof Error
                ? err.message
                : t("processing.errors.statusCheckFailed");
    }
}

/**
 * Load all processing tasks and check their status
 */
async function loadProcessingTasks(): Promise<void> {
    try {
        isLoading.value = true;
        error.value = null;

        // Load all tasks from the store
        const allTasks = await taskStore.loadAllTasks();
        processingTasks.value = allTasks;

        // Check status for each task that's not already completed/failed/cancelled
        const tasksToCheck = allTasks.filter(
            (task) => task.status.status === "in_progress",
        );

        // Check status for all in-progress tasks in parallel
        await Promise.allSettled(
            tasksToCheck.map((task) => checkTaskStatus(task)),
        );
    } catch (err: unknown) {
        console.error("Failed to load processing tasks:", err);
        error.value =
            err instanceof Error
                ? err.message
                : t("processing.errors.loadFailed");
    } finally {
        isLoading.value = false;
    }
}

/**
 * Handle opening a completed transcription
 */
async function handleOpenTranscription(taskId: string): Promise<void> {
    try {
        // Find corresponding transcription by searching for the task's media file name
        const task = processingTasks.value.find((t) => t.id === taskId);
        if (!task?.mediaFileName) return;

        const transcription = transcriptionStore.transcriptions.find(
            (t) =>
                t.name === task.mediaFileName ||
                t.mediaFileName === task.mediaFileName,
        );

        if (transcription) {
            await navigateTo(`/transcription/${transcription.id}`);
        }
    } catch (err: unknown) {
        console.error("Failed to open transcription:", err);
    }
}

/**
 * Handle deleting a failed/cancelled task
 */
function handleDeleteTask(taskId: string): void {
    openDialog({
        title: t("processing.delete.title"),
        message: t("processing.delete.confirmation"),
        onSubmit: async () => {
            await taskStore.deleteTask(taskId);
            await loadProcessingTasks();
        },
    });
}

/**
 * Refresh task statuses
 */
async function refreshStatuses(): Promise<void> {
    await loadProcessingTasks();
}

// Load tasks on component mount and set up auto-refresh
onMounted(() => {
    loadProcessingTasks();
    
    // Set up auto-refresh for in-progress tasks every 10 seconds
    const refreshInterval = setInterval(() => {
        const hasInProgressTasks = processingTasks.value.some(
            (task) => task.status.status === "in_progress",
        );

        if (hasInProgressTasks) {
            refreshStatuses();
        }
    }, 10000);

    // Clear interval on unmount
    onUnmounted(() => {
        clearInterval(refreshInterval);
    });
});
</script>

<template>
    <UContainer>
        <div class="space-y-6">
            <!-- Header -->
            <div class="flex justify-between items-center">
                <div>
                    <h1 class="text-2xl font-bold">{{ t('processing.title') }}</h1>
                    <p class="text-gray-600 mt-1">{{ t('processing.description') }}</p>
                </div>
                <UButton 
                    icon="i-heroicons-arrow-path" 
                    @click="refreshStatuses"
                    :loading="isLoading"
                >
                    {{ t('processing.refresh') }}
                </UButton>
            </div>

            <!-- 24h Deletion Notice -->
            <UAlert
                icon="i-heroicons-information-circle"
                color="info"
                variant="soft"
                :title="t('processing.notice.title')"
                :description="t('processing.notice.description')"
            />

            <!-- Error Alert -->
            <UAlert
                v-if="error"
                icon="i-heroicons-exclamation-triangle"
                color="error"
                variant="soft"
                :title="t('processing.errors.title')"
                :description="error"
                @dismiss="error = null"
            />

            <!-- Tasks Table -->
            <UTable
                :columns="columns"
                :data="processingTasks"
                sticky
                :loading="isLoading"
                :empty-state="{
                    icon: 'i-heroicons-clock',
                    label: t('processing.noTasksFound'),
                    description: t('processing.noTasksDescription'),
                }"
                :sorting-options="{ enableSorting: true }"
            >
                <!-- Custom cell renderer for the file name column -->
                <template #mediaFileName-cell="{ row }">
                    <div class="font-medium text-wrap">
                        {{ row.original.mediaFileName || t('processing.unknownFile') }}
                    </div>
                </template>

                <!-- Custom cell renderer for the status column -->
                <template #status-cell="{ row }">
                    <UBadge 
                        :color="getStatusColor(row.original.status.status)"
                        variant="subtle"
                    >
                        {{ getStatusDisplay(row.original.status.status) }}
                    </UBadge>
                </template>

                <!-- Custom cell renderer for the actions column -->
                <template #actions-cell="{ row }">
                    <div class="flex gap-2 justify-end">
                        <!-- Show "Open Transcription" for completed tasks -->
                        <UButton
                            v-if="row.original.status.status === 'completed'"
                            icon="i-heroicons-document-text"
                            color="primary"
                            @click="handleOpenTranscription(row.original.id)"
                        >
                            {{ t('processing.actions.openTranscription') }}
                        </UButton>
                        
                        <!-- Show "Delete" for failed/cancelled tasks -->
                        <UButton
                            v-if="row.original.status.status === 'failed' || row.original.status.status === 'cancelled'"
                            icon="i-heroicons-trash"
                            color="error"
                            @click="handleDeleteTask(row.original.id)"
                        >
                            {{ t('processing.actions.delete') }}
                        </UButton>
                        
                        <!-- Show progress indicator for in-progress tasks -->
                        <div 
                            v-if="row.original.status.status === 'in_progress'"
                            class="flex items-center gap-2 text-blue-600"
                        >
                            <UIcon name="i-heroicons-cog-6-tooth" class="animate-spin" />
                            <span class="text-sm">{{ t('processing.status.processing') }}</span>
                        </div>
                    </div>
                </template>
            </UTable>
        </div>
    </UContainer>
</template>
