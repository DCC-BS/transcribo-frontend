<script lang="ts" setup>
import { TaskStatusEnum, type TaskStatus } from '~/types/task';
import { TranscriptionFinishedCommand } from '~/types/commands';
import type { TranscriptionResponse } from '~/types/transcriptionResponse';

const props = defineProps<{
    initalTaskStatus?: TaskStatus;
}>();

const taskId = computed(() => props.initalTaskStatus?.task_id);
const status = ref<TaskStatus>();

const { executeCommand } = useCommandBus();

watch(
    () => props.initalTaskStatus,
    () => {
        status.value = props.initalTaskStatus;
        fetchTaskStatus();
    },
);

const fetchTaskStatus = async (): Promise<void> => {
    if (!taskId.value || !status.value) {
        return;
    }

    while (status.value?.status == TaskStatusEnum.IN_PROGRESS) {
        await loadTaskStatus(taskId.value);
        await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    let result: TranscriptionResponse | undefined = undefined;
    if (status.value?.status == TaskStatusEnum.SUCCESS) {
        result = await $fetch<TranscriptionResponse>(
            `/api/transcribe/${taskId.value}`,
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
        <div v-if="status">
            <p>Status: {{ status.status }}</p>
        </div>
    </div>
</template>
