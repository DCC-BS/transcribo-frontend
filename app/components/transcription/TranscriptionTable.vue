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
    <div>
        <!-- Mobile Card View -->
        <div class="space-y-3 md:hidden">
            <div
                v-if="!props.transcriptions?.length"
                class="text-center py-8 text-gray-500"
            >
                <UIcon name="i-lucide-file-text" class="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>{{ t("transcription.noTranscriptionsFound") }}</p>
            </div>
            <div
                v-for="transcription in props.transcriptions"
                :key="transcription.id"
                class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-3"
            >
                <div class="font-bold text-wrap">
                    {{ transcription.name }}
                </div>
                <div class="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                    <div class="flex justify-between">
                        <span>{{ t("transcription.table.createdAt") }}:</span>
                        <span>{{ formatDate(transcription.createdAt) }}</span>
                    </div>
                    <div class="flex justify-between">
                        <span>{{ t("transcription.table.updatedAt") }}:</span>
                        <span>{{ formatDate(transcription.updatedAt) }}</span>
                    </div>
                </div>
                <div class="flex gap-2 pt-2">
                    <ULink :to="`transcription/${transcription.id}`" class="flex-1">
                        <UButton icon="i-lucide-pencil" color="primary" block>
                            {{ t("transcription.actions.edit") }}
                        </UButton>
                    </ULink>
                    <UButton
                        icon="i-lucide-trash-2"
                        color="error"
                        @click="handleDeleteClick(transcription.id)"
                    />
                </div>
            </div>
        </div>

        <!-- Desktop Table View -->
        <UTable
            class="hidden md:block"
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
    </div>
</template>
