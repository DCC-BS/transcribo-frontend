<script lang="ts" setup>
import type { TaskStatus } from '~/types/task';

const tasksStore = useTasksStore();
const { t } = useI18n();

async function handleUpload(status: TaskStatus, file: File): Promise<void> {
    const storedTask = await tasksStore.addTask(status, file, file.name);
    navigateTo(`task/${storedTask.id}`);
}
</script>

<template>
    <UContainer>
        <div class="flex flex-col items-center text-center pt-5">
            <div class="text-lg font-bold">{{ t('pages.index.uploadMedia') }}</div>
            <UploadMediaView @uploaded="handleUpload" />
        </div>
    </UContainer>
</template>