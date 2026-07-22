<script lang="ts" setup>
import type { StoredTranscription } from "~/types/storedTranscription";

const props = defineProps<{
    transcriptions?: StoredTranscription[];
}>();

const emit = defineEmits<{
    delete: [id: string];
}>();

const { t } = useI18n();
const { formatDate } = useDateFormatter();
const { openDialog } = useDialog();

const rowGrid =
    "grid grid-cols-[minmax(0,1fr)_84px] items-center gap-3 sm:grid-cols-[minmax(0,1fr)_150px_150px_84px]";

function handleDeleteClick(transcriptionId: string): void {
    openDialog({
        title: t("transcription.delete.title"),
        message: t("transcription.delete.confirmation"),
        onSubmit: () => emit("delete", transcriptionId),
    });
}
</script>

<template>
    <UCard class="overflow-hidden" :ui="{ body: 'p-0 sm:p-0' }">
        <!-- head row -->
        <div
            class="border-b border-default bg-muted px-5 py-2.5 text-[0.72rem] font-medium uppercase tracking-wider text-dimmed"
            :class="rowGrid"
        >
            <div>{{ t("transcription.table.name") }}</div>
            <div class="hidden sm:block">
                {{ t("transcription.table.createdAt") }}
            </div>
            <div class="hidden sm:block">
                {{ t("transcription.table.updatedAt") }}
            </div>
            <div />
        </div>

        <div
            v-if="!props.transcriptions?.length"
            class="px-5 py-10 text-center text-muted"
        >
            <UIcon
                name="i-lucide-file-text"
                class="mx-auto mb-2 size-10 opacity-50"
            />
            <p>{{ t("transcription.noTranscriptionsFound") }}</p>
            <p class="mt-1 text-sm text-dimmed">
                {{ t("ui.emptyState.description") }}
            </p>
        </div>

        <NuxtLink
            v-for="transcription in props.transcriptions"
            :key="transcription.id"
            :to="`/transcription/${transcription.id}`"
            class="border-b border-default px-5 py-3 text-[0.88rem] transition-colors last:border-b-0 hover:bg-muted"
            :class="rowGrid"
        >
            <div class="flex min-w-0 items-center gap-3">
                <span
                    class="grid size-7.5 flex-none place-items-center rounded-lg bg-(--ui-primary-soft) text-(--ui-primary-strong)"
                >
                    <UIcon name="i-lucide-file-audio" class="size-4" />
                </span>
                <span
                    class="truncate font-medium"
                    :title="transcription.name"
                >
                    {{ transcription.name }}
                </span>
            </div>
            <div
                class="hidden tabular-nums text-muted sm:block"
            >
                {{ formatDate(transcription.createdAt) }}
            </div>
            <div
                class="hidden tabular-nums text-muted sm:block"
            >
                {{ formatDate(transcription.updatedAt) }}
            </div>
            <div class="flex justify-end gap-1">
                <UButton
                    icon="i-lucide-trash-2"
                    variant="ghost"
                    color="error"
                    size="sm"
                    :title="t('transcription.actions.delete')"
                    @click.prevent.stop="handleDeleteClick(transcription.id)"
                />
            </div>
        </NuxtLink>
    </UCard>
</template>
