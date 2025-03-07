<script lang="ts" setup>
import { TaskStatusEnum, type TaskStatus } from '~/types/task';
import { TranscriptionFinishedCommand } from '~/types/commands';
import type { TranscriptionResponse } from '~/types/transcriptionResponse';

const props = defineProps<{
    taskId: string;
}>();

const status = ref<TaskStatus>();
const { executeCommand } = useCommandBus();

onMounted(() => {
    status.value = { status: TaskStatusEnum.IN_PROGRESS, task_id: props.taskId, created_at: "", executed_at: "" };
    fetchTaskStatus();
});

watch(
    () => props.taskId,
    () => {
        status.value = { status: TaskStatusEnum.IN_PROGRESS, task_id: props.taskId, created_at: "", executed_at: "" };
        fetchTaskStatus();
    }
);

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
        <div v-if="status !== undefined">
            <p>Status: {{ status.status }}</p>
        </div>
    </div>
</template>
