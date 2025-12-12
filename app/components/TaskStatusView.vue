<script lang="ts" setup>
import { isApiError } from "@dcc-bs/communication.bs.js";
import { match, P } from "ts-pattern";
import { TranscriptionFinishedCommand } from "~/types/commands";
import { type TaskStatus, TaskStatusEnum, TaskStatusSchema } from "~/types/task";
import { TranscriptionResponseSchema, type TranscriptionResponse } from "~/types/transcriptionResponse";

const $router = useRouter();
const { apiFetch } = useApi();
const { showError } = useUserFeedback();

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
        .with(TaskStatusEnum.COMPLETED, () => 1)
        .with(TaskStatusEnum.FAILED, () => 1)
        .with(TaskStatusEnum.CANCELLED, () => 0)
        .otherwise(() => 0),
);

// Computed property to determine if task is completed successfully
const isSuccessful = computed(
    () => status.value?.status === TaskStatusEnum.COMPLETED,
);

// Computed property to determine if task has failed
const hasFailed = computed(
    () =>
        status.value?.status === TaskStatusEnum.FAILED ||
        status.value?.status === TaskStatusEnum.CANCELLED,
);

// Computed property to determine if task is still in progress
const isInProgress = computed(
    () => status.value?.status === TaskStatusEnum.IN_PROGRESS,
);

onMounted(() => {
    status.value = {
        status: TaskStatusEnum.IN_PROGRESS,
        task_id: props.taskId,
        created_at: "",
        executed_at: "",
        progress: 0,
    };
    fetchTaskStatus();
});

const fetchTaskStatus = async (): Promise<void> => {
    if (!props.taskId || !status.value) {
        return;
    } loadTaskStatus

    try {
        let pollCount = 0;
        const maxPolls = 300; // 5 minutes maximum (300 seconds)

        while (
            status.value?.status === TaskStatusEnum.IN_PROGRESS &&
            pollCount < maxPolls
        ) {
            await loadTaskStatus(props.taskId);
            pollCount++;

            // Break the loop if status is no longer IN_PROGRESS
            if (status.value?.status !== TaskStatusEnum.IN_PROGRESS) {
                break;
            }

            await new Promise((resolve) => setTimeout(resolve, 5000));
        }

        if (pollCount >= maxPolls) {
            if (status.value) {
                status.value.status = TaskStatusEnum.FAILED;
            }
        }

        let result: TranscriptionResponse | undefined;
        if (status.value?.status === TaskStatusEnum.COMPLETED) {
            try {
                const response = await apiFetch(
                    `/api/transcribe/${props.taskId}`,
                    {
                        schema: TranscriptionResponseSchema,
                    },
                );

                if (isApiError(response)) {
                    throw response;
                }

                result = response;
            } catch (error) {
                // If we can't fetch the result, mark as failed
                if (status.value) {
                    status.value.status = TaskStatusEnum.FAILED;
                }
            }
        }

        executeCommand(new TranscriptionFinishedCommand(status.value, result));
    } catch (error) {
        // Set status to failed if there's an error
        if (status.value) {
            status.value.status = TaskStatusEnum.FAILED;
        }
    }
};

const loadTaskStatus = async (taskId: string): Promise<void> => {
    const newStatus = await apiFetch(
        `/api/transcribe/${taskId}/status`,
        {
            schema: TaskStatusSchema,
        }
    );

    if (isApiError(newStatus)) {
        showError(newStatus);
        return;
    }

    status.value = newStatus;
};
</script>

<template>
    <div>
        <!-- Show loading animation when in progress -->
        <div v-if="isInProgress" class="loading-container">
            <UIcon name="i-lucide-loader-circle" class="loading-spinner" />
            <p class="loading-text">{{ t('taskStatus.processing') }}</p>
        </div>

        <!-- Success animation shown when status is COMPLETED -->
        <div v-else-if="isSuccessful" class="success-container">
            <div class="success-circle">
                <UIcon name="i-lucide-check" class="success-icon" />
            </div>
            <p class="success-text">{{ t('taskStatus.completed') }}</p>
        </div>

        <!-- Error animation shown when status is FAILED or CANCELLED -->
        <div v-else-if="hasFailed" class="error-container">
            <div class="error-circle">
                <UIcon name="i-lucide-x" class="error-icon" />
            </div>
            <p class="error-text">{{ t('taskStatus.failed') }}</p>
            <p class="error-description">{{ t('taskStatus.failedDescription') }}</p>
            <UButton @click="$router.push('/')" variant="outline" color="error" size="sm" class="mt-4">
                {{ t('taskStatus.goBack') }}
            </UButton>
        </div>

        <div v-if="status && (isInProgress || isSuccessful)">
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
    border: 2px solid var(--color-green-500);
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

/* Error animation styles */
.error-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 1.5rem 0;
}

.error-circle {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 60px;
    height: 60px;
    border-radius: 50%;
    border: 2px solid var(--color-red-500);
    animation: scale-in 0.5s ease-out;
    margin-bottom: 1rem;
    background-color: var(--color-red-50);
}

.error-icon {
    font-size: 2rem;
    color: var(--color-red-500);
    animation: check-mark 0.3s ease-out 0.2s both;
}

.error-text {
    font-size: 1rem;
    font-weight: 600;
    color: var(--color-red-700, #b91c1c);
    animation: fade-in 0.6s ease-out 0.5s both;
    margin-bottom: 0.5rem;
}

.error-description {
    font-size: 0.875rem;
    color: var(--color-gray-600, #4b5563);
    text-align: center;
    max-width: 300px;
    animation: fade-in 0.6s ease-out 0.7s both;
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
