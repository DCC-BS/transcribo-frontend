<script lang="ts" setup>
import { TRANSCRIPTION_RETENTION_PERIOD_MS } from "#imports";
import ProcessingTasksTable from "~/components/transcription/ProcessingTasksTable.vue";
import TranscriptionTable from "~/components/transcription/TranscriptionTable.vue";
import { useInProgressTasksListener } from "~/composables/useInProgressTasksListener";

const retentionDays = computed(() => {
    return Math.ceil(TRANSCRIPTION_RETENTION_PERIOD_MS / (1000 * 60 * 60 * 24));
});

const { transcriptions } = useTranscriptions();
const { deleteTranscription } = getTranscriptionService();
const { taskErrors, unfinishedTasks } = useInProgressTasksListener();

const { t } = useI18n();

const isProcessingLoading = ref(false);
</script>

<template>
    <div class="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <UAlert icon="i-lucide-info" color="info" variant="soft" :title="t('retention.title')" :description="t('retention.description', { retentionDays: retentionDays })
            " />

        <div class="mt-4 sm:mt-6 lg:mt-8">
            <ProcessingTasksTable :tasks="unfinishedTasks" :loading="isProcessingLoading" :errors="taskErrors"
                @dismiss-error="taskErrors = []" />
        </div>

        <div class="mt-4 sm:mt-6 lg:mt-8">
            <TranscriptionTable :transcriptions="transcriptions" @delete="deleteTranscription" />
        </div>
    </div>
</template>
