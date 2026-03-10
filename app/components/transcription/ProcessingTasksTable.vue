<script lang="ts" setup>
import type { TableColumn } from "@nuxt/ui";
import type { StoredTask } from "~/types/task";
import { TaskStatusEnum } from "~/types/task";

const props = defineProps<{
    tasks: StoredTask[];
    errors: Error[];
}>();

const emit = defineEmits<{
    refresh: [];
    "dismiss-error": [];
}>();

const { t } = useI18n();
const { formatDate } = useDateFormatter();
const { getStatusDisplay, getStatusColor, computeTaskProgress } =
    useTaskStatus();
const { deleteTask } = useTasks();

const columns = computed<TableColumn<StoredTask>[]>(() => [
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
            return formatDate(createdAt);
        },
    },
    {
        accessorKey: "status",
        header: t("processing.table.status"),
        enableSorting: true,
        enableResizing: true,
    },
]);
</script>

<template>
    <div v-if="props.tasks.length > 0" class="space-y-4 sm:space-y-6 mb-8">
        <div
            class="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3"
        >
            <div>
                <h2 class="text-lg sm:text-xl font-bold">
                    {{ t("processing.title") }}
                </h2>
                <p
                    class="text-gray-600 dark:text-gray-400 mt-1 text-sm sm:text-base"
                >
                    {{ t("processing.description") }}
                </p>
            </div>
        </div>

        <UAlert
            v-for="error in props.errors"
            icon="i-lucide-triangle-alert"
            color="error"
            variant="soft"
            :title="t('processing.errors.title')"
            :description="error.message"
            @dismiss="emit('dismiss-error')"
        />

        <!-- Mobile Card View -->
        <div class="space-y-3 md:hidden">
            <div
                v-for="task in props.tasks"
                :key="task.id"
                class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-3"
            >
                <div class="font-medium text-wrap">
                    {{ task.mediaFileName || t("processing.unknownFile") }}
                </div>
                <div class="text-sm text-gray-600 dark:text-gray-400">
                    <div class="flex justify-between">
                        <span>{{ t("processing.table.createdAt") }}:</span>
                        <span>{{ formatDate(task.createdAt) }}</span>
                    </div>
                </div>
                <div class="flex items-center gap-2 flex-wrap">
                    <UBadge
                        :color="getStatusColor(task.status.status)"
                        variant="subtle"
                    >
                        {{ getStatusDisplay(task.status.status) }}
                    </UBadge>
                    <template
                        v-if="task.status.status === TaskStatusEnum.IN_PROGRESS"
                    >
                        <UIcon
                            name="i-lucide-cog"
                            class="animate-spin text-blue-600"
                        />
                        <span class="text-sm text-blue-600">
                            ({{
                                Math.round(
                                    computeTaskProgress(task.status) * 100,
                                )
                            }}%)
                        </span>
                    </template>
                    <UButton
                        v-if="task.status.status !== TaskStatusEnum.IN_PROGRESS"
                        color="secondary"
                        @click="navigateTo(`/?taskId=${task.id}`)"
                    >
                        {{ t("processing.transcribe") }}
                    </UButton>
                    <UButton
                        color="error"
                        variant="outline"
                        size="xs"
                        @click="deleteTask(task.id)"
                    >
                        {{ t("processing.delete") }}
                    </UButton>
                </div>
            </div>
        </div>

        <!-- Desktop Table View -->
        <UTable
            class="hidden md:block"
            :columns="columns"
            :data="props.tasks"
            sticky
            :empty-state="{
                icon: 'i-lucide-clock',
                label: t('processing.noTasksFound'),
                description: t('processing.noTasksDescription'),
            }"
            :sorting-options="{ enableSorting: true }"
        >
            <template #mediaFileName-cell="{ row }">
                <div class="font-medium text-wrap">
                    {{
                        row.original.mediaFileName ||
                        t("processing.unknownFile")
                    }}
                </div>
            </template>

            <template #status-cell="{ row }">
                <div class="flex justify-end gap-2">
                    <UBadge
                        :color="getStatusColor(row.original.status.status)"
                        variant="subtle"
                    >
                        {{ getStatusDisplay(row.original.status.status) }}
                    </UBadge>
                    <template
                        v-if="
                            row.original.status.status ===
                            TaskStatusEnum.IN_PROGRESS
                        "
                    >
                        <UIcon
                            name="i-lucide-cog"
                            class="animate-spin text-blue-600"
                        />
                        <span class="text-sm text-blue-600">
                            ({{
                                Math.round(
                                    computeTaskProgress(row.original.status) *
                                        100,
                                )
                            }}%)
                        </span>
                    </template>
                    <UButton
                        color="secondary"
                        @click="navigateTo(`/?taskId=${row.original.id}`)"
                    >
                        {{ t("processing.transcribe") }}
                    </UButton>
                    <UButton
                        color="error"
                        variant="outline"
                        size="xs"
                        @click="deleteTask(row.original.id)"
                    >
                        {{ t("processing.delete") }}
                    </UButton>
                </div>
            </template>
        </UTable>
    </div>
</template>
