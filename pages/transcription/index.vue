<script lang="ts" setup>
import { UButton, ULink } from "#components";
import type { TableColumn } from "@nuxt/ui/runtime/components/Table.vue";

const transcriptionStore = useTranscriptionsStore();
const { openDialog } = useDialog();
const { t } = useI18n();

// Define columns for the table
const columns: TableColumn<StoredTranscription>[] = [
    {
        accessorKey: "name",
        header: t("transcription.table.name"),
        enableSorting: true,
        enableResizing: true,
        size: 200,
        maxSize: 300,
    },
    {
        accessorKey: "createdAt",
        header: t("transcription.table.createdAt"),
        enableResizing: true,
        enableSorting: true,
        cell: ({ row }) => {
            return new Date(row.getValue("createdAt")).toLocaleString("de-CH", {
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
            });
        },
    },
    {
        accessorKey: "updatedAt",
        header: t("transcription.table.updatedAt"),
        enableSorting: true,
        enableResizing: true,
        cell: ({ row }) => {
            return new Date(row.getValue("updatedAt")).toLocaleString("de-CH", {
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
            });
        },
    },
    {
        accessorKey: "actions",
        header: "",
    },
];

onMounted(() => {
    transcriptionStore.loadAllTranscriptions();
});

function handleDeletedTranscription(transcriptionId: string): void {
    openDialog({
        title: t("transcription.delete.title"),
        message: t("transcription.delete.confirmation"),
        onSubmit: () => transcriptionStore.deleteTranscription(transcriptionId),
    });
}
</script>

<template>
    <UContainer>
        <UTable
            :columns="columns"
            :data="transcriptionStore.transcriptions"
            sticky
            :empty-state="{
                icon: 'i-heroicons-document-text',
                label: t('transcription.noTranscriptionsFound'),
                description: t('ui.emptyState.description'),
            }"
            :sorting-options="{ enableSorting: true }"
        >
            <!-- Custom cell renderer for the name column -->
            <template #name-cell="{ row }">
                <div class="font-bold text-wrap">{{ row.original.name }}</div>
            </template>

            <!-- Custom cell renderer for the actions column -->
            <template #actions-cell="{ row }">
                <div class="flex gap-2 justify-end">
                    <ULink :to="`transcription/${row.original.id}`">
                        <UButton icon="i-heroicons-pencil" color="primary">
                            {{ t('transcription.actions.edit') }}
                        </UButton>
                    </ULink>
                    <UButton
                        icon="i-heroicons-trash"
                        color="error"
                        @click="handleDeletedTranscription(row.original.id)"
                    >
                        {{ t('transcription.actions.delete') }}
                    </UButton>
                </div>
            </template>
        </UTable>
    </UContainer>
</template>
