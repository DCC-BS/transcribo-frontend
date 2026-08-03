<script lang="ts" setup>
import { navigateTo } from "#app";
import type { StoredTask } from "~/types/storedTasks";
import { TaskStatusEnum } from "~/types/storedTasks";

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
</script>

<template>
    <div v-if="props.tasks.length > 0" class="mb-8 space-y-4">
        <div>
            <h2 class="text-lg font-bold tracking-tight">
                {{ t("processing.title") }}
            </h2>
            <p class="mt-1 text-sm text-muted">
                {{ t("processing.description") }}
            </p>
        </div>

        <UAlert
            v-for="(error, index) in props.errors"
            :key="index"
            icon="i-lucide-triangle-alert"
            color="error"
            variant="soft"
            :title="t('processing.errors.title')"
            :description="error.message"
            @dismiss="emit('dismiss-error')"
        />

        <UCard class="overflow-hidden" :ui="{ body: 'p-0 sm:p-0' }">
            <div
                v-for="task in props.tasks"
                :key="task.id"
                class="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-default px-5 py-3 text-[0.88rem] last:border-b-0 sm:grid-cols-[minmax(0,1fr)_150px_auto]"
            >
                <div class="flex min-w-0 items-center gap-3">
                    <span
                        class="grid size-7.5 flex-none place-items-center rounded-lg bg-(--ui-warning-soft) text-warning"
                    >
                        <UIcon name="i-lucide-file-audio" class="size-4" />
                    </span>
                    <span
                        class="truncate font-medium"
                        :title="task.mediaFileName || undefined"
                    >
                        {{ task.mediaFileName || t("processing.unknownFile") }}
                    </span>
                </div>
                <div
                    class="hidden tabular-nums text-muted sm:block"
                >
                    {{ formatDate(task.createdAt) }}
                </div>
                <div class="flex items-center justify-end gap-2">
                    <!-- in progress: the status badge itself opens the live
                         status pane -->
                    <UButton
                        v-if="task.status.status === TaskStatusEnum.IN_PROGRESS"
                        :color="getStatusColor(task.status.status)"
                        variant="subtle"
                        size="sm"
                        icon="i-lucide-loader-circle"
                        class="rounded-full"
                        :ui="{ leadingIcon: 'animate-spin' }"
                        :title="t('processing.viewStatus')"
                        @click="navigateTo(`/task/${task.id}`)"
                    >
                        {{ getStatusDisplay(task.status.status) }}
                        {{ Math.round(computeTaskProgress(task.status) * 100) }}%
                    </UButton>
                    <template v-else>
                        <UBadge
                            :color="getStatusColor(task.status.status)"
                            variant="subtle"
                            class="rounded-full"
                        >
                            {{ getStatusDisplay(task.status.status) }}
                        </UBadge>
                        <UButton
                            color="secondary"
                            size="sm"
                            @click="
                                navigateTo(`/new-transcription?taskId=${task.id}`)
                            "
                        >
                            {{ t("processing.transcribe") }}
                        </UButton>
                    </template>
                    <UButton
                        icon="i-lucide-trash-2"
                        variant="ghost"
                        color="error"
                        size="sm"
                        :title="t('processing.delete')"
                        @click="deleteTask(task.id)"
                    />
                </div>
            </div>
        </UCard>
    </div>
</template>
