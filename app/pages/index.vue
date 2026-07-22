<script lang="ts" setup>
import { TRANSCRIPTION_RETENTION_PERIOD_MS } from "#imports";
import ProcessingTasksTable from "~/components/transcription/ProcessingTasksTable.vue";
import TranscriptionTable from "~/components/transcription/TranscriptionTable.vue";
import { useInProgressTasksListener } from "~/composables/useInProgressTasksListener";

const retentionDays = computed(() => {
    return Math.ceil(TRANSCRIPTION_RETENTION_PERIOD_MS / (1000 * 60 * 60 * 24));
});

const showRetentionHint = useLocalStorage("retention-hint-visible", true);

const { transcriptions } = useTranscriptions();
const { deleteTranscription } = getTranscriptionService();
const { taskErrors, unfinishedTasks } = useInProgressTasksListener();

const { t } = useI18n();

const search = ref("");
const filteredTranscriptions = computed(() => {
    const needle = search.value.trim().toLowerCase();
    if (!needle) {
        return transcriptions.value;
    }
    return transcriptions.value?.filter((transcription) =>
        transcription.name.toLowerCase().includes(needle),
    );
});
</script>

<template>
    <div class="grow overflow-y-auto px-4 py-10 sm:px-12">
        <div class="mx-auto w-full max-w-220">
            <div class="mb-5 flex flex-wrap items-center gap-3.5">
                <h2 class="flex-1 text-[1.35rem] font-bold tracking-tight">
                    {{ t("transcriptionList.title") }}
                </h2>
                <UInput
                    v-model="search"
                    icon="i-lucide-search"
                    :placeholder="t('transcriptionList.searchPlaceholder')"
                    class="w-56"
                />
                <UButton
                    to="/new-transcription"
                    color="primary"
                    icon="i-lucide-plus"
                >
                    {{ t("navigation.new") }}
                </UButton>
            </div>

            <UAlert
                v-if="showRetentionHint"
                icon="i-lucide-info"
                color="info"
                variant="soft"
                :title="t('retention.title')"
                :description="
                    t('retention.description', { retentionDays: retentionDays })
                "
                close
                @update:open="(open) => (showRetentionHint = open)"
            />

            <div class="mt-5">
                <ProcessingTasksTable
                    :tasks="unfinishedTasks"
                    :errors="taskErrors"
                    @dismiss-error="taskErrors = []"
                />
            </div>

            <div class="mt-5">
                <TranscriptionTable
                    :transcriptions="filteredTranscriptions"
                    @delete="deleteTranscription"
                />
            </div>
        </div>
    </div>
</template>
