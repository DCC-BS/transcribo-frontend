<script lang="ts" setup>
import type { StoredTask } from "~/types/task";
import { TaskStatusEnum } from "~/types/task";

const props = defineProps<{
    tasks: StoredTask[];
    loading: boolean;
    error?: string;
}>();

const emit = defineEmits<{
    refresh: [];
    "dismiss-error": [];
}>();

const { t } = useI18n();
const { formatDate } = useDateFormatter();
const { getStatusDisplay, getStatusColor, computeTaskProgress } = useTaskStatus();

const columns = [
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
];
</script>

<template>
    <div v-if="props.tasks.length > 0" class="space-y-6 mb-8">
        <div class="flex justify-between items-center">
            <div>
                <h2 class="text-xl font-bold">
                    {{ t("processing.title") }}
                </h2>
                <p class="text-gray-600 mt-1">
                    {{ t("processing.description") }}
                </p>
            </div>
            <UButton
                icon="i-lucide-loader-circle"
                :loading="props.loading"
                @click="emit('refresh')"
            >
                {{ t("processing.refresh") }}
            </UButton>
        </div>

        <UAlert
            v-if="props.error"
            icon="i-lucide-triangle-alert"
            color="error"
            variant="soft"
            :title="t('processing.errors.title')"
            :description="props.error"
            @dismiss="emit('dismiss-error')"
        />

        <UTable
            :columns="columns"
            :data="props.tasks"
            sticky
            :loading="props.loading"
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
                <div class="flex items-center gap-2">
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
                            ({{ Math.round(computeTaskProgress(row.original.status) * 100) }}%)
                        </span>
                    </template>
                </div>
            </template>
        </UTable>
    </div>
</template>
