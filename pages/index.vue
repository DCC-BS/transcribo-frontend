<script lang="ts" setup>
import type { TaskStatus } from '~/types/task';

const tasksStore = useTasksStore();

async function handleUpload(status: TaskStatus, file: File): Promise<void> {
    const storedTask = await tasksStore.addTask(status, file, file.name);
    navigateTo(`task/${storedTask.id}`);
}
</script>

<template>
    <div class="p-4 justify-center test-center">
        <div class="text-lg font-bold">Upload Media</div>
        <UploadMediaView @uploaded="handleUpload"/>
    </div>
</template>

<style></style>