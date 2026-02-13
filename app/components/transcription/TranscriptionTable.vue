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

const columns = [
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
        cell: (props: { row: { original: StoredTranscription } }) => {
            return formatDate(props.row.original.createdAt);
        },
    },
    {
        accessorKey: "updatedAt",
        header: t("transcription.table.updatedAt"),
        enableSorting: true,
        enableResizing: true,
        cell: (opts: unknown) => {
            const row = (
                opts as { row: { getValue: (key: string) => unknown } }
            ).row;
            return formatDate(row.getValue("updatedAt") as number);
        },
    },
    {
        accessorKey: "actions",
        header: "",
    },
];

function handleDeleteClick(transcriptionId: string): void {
    openDialog({
        title: t("transcription.delete.title"),
        message: t("transcription.delete.confirmation"),
        onSubmit: () => emit("delete", transcriptionId),
    });
}
</script>

<template>
    <UTable
        :columns="columns"
        :data="props.transcriptions"
        sticky
        :empty-state="{
            icon: 'i-lucide-file-text',
            label: t('transcription.noTranscriptionsFound'),
            description: t('ui.emptyState.description'),
        }"
        :sorting-options="{ enableSorting: true }"
    >
        <template #name-cell="{ row }">
            <div class="font-bold text-wrap">
                {{ row.original.name }}
            </div>
        </template>

        <template #actions-cell="{ row }">
            <div class="flex gap-2 justify-end">
                <ULink :to="`transcription/${row.original.id}`">
                    <UButton icon="i-lucide-pencil" color="primary">
                        {{ t("transcription.actions.edit") }}
                    </UButton>
                </ULink>
                <UButton
                    icon="i-lucide-trash-2"
                    color="error"
                    @click="handleDeleteClick(row.original.id)"
                >
                    {{ t("transcription.actions.delete") }}
                </UButton>
            </div>
        </template>
    </UTable>
</template>
