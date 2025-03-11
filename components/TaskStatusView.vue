<script lang="ts" setup>
import { TaskStatusEnum, type TaskStatus } from '~/types/task';
import { TranscriptionFinishedCommand } from '~/types/commands';
import type { TranscriptionResponse } from '~/types/transcriptionResponse';
import { match, P } from 'ts-pattern';

const props = defineProps<{
    taskId: string;
}>();

const status = ref<TaskStatus>();
const { executeCommand } = useCommandBus();
const { t } = useI18n();

const progress = computed(() =>
    match(status.value?.status)
        .returnType<number>()
        .with(TaskStatusEnum.IN_PROGRESS, () => status.value?.progress ?? 0)
        .with(TaskStatusEnum.SUCCESS, () => 1)
        .with(TaskStatusEnum.FAILURE, () => 1)
        .with(TaskStatusEnum.CANCELLED, () => 0)
        .otherwise(() => 0));

// Computed property to determine if task is completed successfully
const isSuccessful = computed(() => status.value?.status === TaskStatusEnum.SUCCESS);

onMounted(() => {
    status.value = { status: TaskStatusEnum.IN_PROGRESS, task_id: props.taskId, created_at: "", executed_at: "", progress: 0 };
    fetchTaskStatus();
});

const fetchTaskStatus = async (): Promise<void> => {
    if (!props.taskId || !status.value) {
        return;
    }

    while (status.value?.status == TaskStatusEnum.IN_PROGRESS) {
        await loadTaskStatus(props.taskId);
        await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    let result: TranscriptionResponse | undefined = undefined;
    if (status.value?.status == TaskStatusEnum.SUCCESS) {
        result = await $fetch<TranscriptionResponse>(
            `/api/transcribe/${props.taskId}`,
        );
    }

    executeCommand(new TranscriptionFinishedCommand(status.value, result));
};

const loadTaskStatus = async (taskId: string): Promise<void> => {
    status.value = await $fetch<TaskStatus>(`/api/transcribe/${taskId}/status`);
};
</script>

<template>
    <div>
        <!-- Show loading or success animation based on status -->
        <div v-if="!isSuccessful" class="loading-container">
            <UIcon name="i-heroicons-arrow-path" class="loading-spinner" />
            <p class="loading-text">{{ t('taskStatus.processing') }}</p>
        </div>
        <!-- Success animation shown when status is SUCCESS -->
        <div v-else class="success-container">
            <div class="success-circle">
                <UIcon name="i-heroicons-check" class="success-icon" />
            </div>
            <p class="success-text">{{ t('taskStatus.completed') }}</p>
        </div>

        <div v-if="status">
            <UProgress v-model="progress" status :max="1" />
        </div>
    </div>
</template>

<style scoped>
.loading-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 2rem;
}

.loading-spinner {
    font-size: 2rem;
    animation: spin 1.5s infinite linear;
    margin-bottom: 1rem;
    color: var(--color-primary-500, #3b82f6);
}

.loading-text {
    font-size: 1rem;
    color: var(--color-gray-600, #4b5563);
}

/* Success animation styles */
.success-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 1.5rem 0;
}

.success-circle {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 60px;
    height: 60px;
    border-radius: 50%;
    background-color: var(--color-green-500, #10B981);
    animation: scale-in 0.5s ease-out;
    margin-bottom: 1rem;
}

.success-icon {
    font-size: 2rem;
    color: white;
    animation: check-mark 0.3s ease-out 0.2s both;
}

.success-text {
    font-size: 1rem;
    font-weight: 600;
    color: var(--color-green-700, #047857);
    animation: fade-in 0.6s ease-out 0.5s both;
}

@keyframes spin {
    from {
        transform: rotate(0deg);
    }

    to {
        transform: rotate(360deg);
    }
}

@keyframes scale-in {
    0% {
        transform: scale(0);
    }

    70% {
        transform: scale(1.1);
    }

    100% {
        transform: scale(1);
    }
}

@keyframes check-mark {
    0% {
        transform: scale(0);
        opacity: 0;
    }

    100% {
        transform: scale(1);
        opacity: 1;
    }
}

@keyframes fade-in {
    0% {
        opacity: 0;
        transform: translateY(10px);
    }

    100% {
        opacity: 1;
        transform: translateY(0);
    }
}
</style>
