<script setup lang="ts">
import type { StoredVocabularyEntry } from "~/types/storedVocabulary";
import {
    type KeywordType,
    KeywordTypeSchema,
} from "~/types/transcriptionResponse";

/*
    Vocabulary manager (settings): the words learned from editor
    corrections. Entries can be added, renamed, retyped and deleted; the
    list is live — silent captures from a parallel editing session appear
    immediately.
*/
const { t } = useI18n();
const { showToast } = useUserFeedback();
const vocabulary = getVocabularyService();

const { entries } = useVocabularyEntries();

const search = ref("");
const filteredEntries = computed(() => {
    const needle = search.value.trim().toLowerCase();
    const list = entries.value ?? [];
    if (!needle) {
        return list;
    }
    return list.filter((entry) =>
        entry.term.toLowerCase().includes(needle),
    );
});

const typeOptions = KeywordTypeSchema.options.map((value) => ({
    value,
    label: value,
}));

// ---- add -----------------------------------------------------------

const newTerm = ref("");
const newType = ref<KeywordType>("object");

async function addEntry(): Promise<void> {
    const term = newTerm.value.trim();
    if (!term) {
        return;
    }
    await vocabulary.rememberTerm(term, newType.value);
    newTerm.value = "";
    showToast(t("vocabulary.added", { term }), "success");
}

// ---- edit ----------------------------------------------------------

const editingTerm = ref<string | null>(null);
const editTermInput = ref("");

function beginEdit(entry: StoredVocabularyEntry): void {
    editingTerm.value = entry.term;
    editTermInput.value = entry.term;
}

async function confirmEdit(): Promise<void> {
    const original = editingTerm.value;
    const renamed = editTermInput.value.trim();
    if (original && renamed && renamed !== original) {
        await vocabulary.updateTerm(original, { term: renamed });
    }
    editingTerm.value = null;
}

async function changeType(
    entry: StoredVocabularyEntry,
    type: KeywordType,
): Promise<void> {
    await vocabulary.updateTerm(entry.term, { type });
}

async function removeEntry(entry: StoredVocabularyEntry): Promise<void> {
    await vocabulary.deleteTerm(entry.term);
    showToast(t("vocabulary.deleted", { term: entry.term }), "info");
}

const { formatDate } = useDateFormatter();
</script>

<template>
    <div class="grow overflow-y-auto px-4 py-10 sm:px-12">
        <div class="mx-auto w-full max-w-180">
            <div class="mb-1.5 flex items-center gap-3.5">
                <h2 class="flex-1 text-[1.35rem] font-bold tracking-tight">
                    {{ t("vocabulary.title") }}
                </h2>
                <UInput
                    v-model="search"
                    icon="i-lucide-search"
                    :placeholder="t('transcriptionList.searchPlaceholder')"
                    class="w-56"
                />
            </div>
            <p class="mb-5 text-sm text-muted">
                {{ t("vocabulary.description") }}
            </p>

            <UAlert
                class="mb-5"
                icon="i-lucide-info"
                color="info"
                variant="soft"
                :title="t('vocabulary.storageTitle')"
                :description="t('vocabulary.storageDescription')"
            />

            <!-- add row -->
            <UCard class="mb-4" :ui="{ body: 'flex flex-wrap items-center gap-2.5' }">
                <UInput
                    v-model="newTerm"
                    class="min-w-40 flex-1"
                    :placeholder="t('vocabulary.newPlaceholder')"
                    @keydown.enter="addEntry"
                />
                <USelect
                    v-model="newType"
                    :items="typeOptions"
                    value-key="value"
                    class="w-36"
                >
                    <template #default>
                        {{ t(`vocabulary.types.${newType}`) }}
                    </template>
                    <template #item-label="{ item }">
                        {{ t(`vocabulary.types.${item.value}`) }}
                    </template>
                </USelect>
                <UButton
                    icon="i-lucide-plus"
                    color="primary"
                    :disabled="!newTerm.trim()"
                    @click="addEntry"
                >
                    {{ t("vocabulary.add") }}
                </UButton>
            </UCard>

            <!-- entries -->
            <UCard v-if="filteredEntries.length" class="overflow-hidden" :ui="{ body: 'p-0 sm:p-0' }">
                <ul class="divide-y divide-default">
                    <li
                        v-for="entry in filteredEntries"
                        :key="entry.term"
                        class="flex flex-wrap items-center gap-2.5 px-4 py-2.5"
                    >
                        <template v-if="editingTerm === entry.term">
                            <UInput
                                v-model="editTermInput"
                                size="sm"
                                class="min-w-32 flex-1"
                                @keydown.enter="confirmEdit"
                                @keydown.escape="editingTerm = null"
                            />
                            <UButton
                                icon="i-lucide-check"
                                size="sm"
                                color="primary"
                                variant="soft"
                                :title="t('vocabulary.rename')"
                                @click="confirmEdit"
                            />
                        </template>
                        <template v-else>
                            <span class="min-w-0 flex-1 truncate font-medium">
                                {{ entry.term }}
                            </span>
                            <span
                                class="rounded-full bg-elevated px-2 py-0.5 text-[0.7rem] text-muted"
                                :title="t('vocabulary.editCountHint')"
                            >
                                {{ entry.editCount ?? 1 }}×
                            </span>
                            <span
                                class="hidden text-[0.72rem] tabular-nums text-dimmed sm:inline"
                                :title="t('vocabulary.updatedAtHint')"
                            >
                                {{ formatDate(entry.updatedAt) }}
                            </span>
                            <USelect
                                :model-value="entry.type"
                                :items="typeOptions"
                                value-key="value"
                                size="xs"
                                class="w-32"
                                @update:model-value="
                                    (type: KeywordType) =>
                                        changeType(entry, type)
                                "
                            >
                                <template #default>
                                    {{ t(`vocabulary.types.${entry.type}`) }}
                                </template>
                                <template #item-label="{ item }">
                                    {{ t(`vocabulary.types.${item.value}`) }}
                                </template>
                            </USelect>
                            <UButton
                                icon="i-lucide-pen-line"
                                size="xs"
                                variant="ghost"
                                color="neutral"
                                :title="t('vocabulary.rename')"
                                @click="beginEdit(entry)"
                            />
                            <UButton
                                icon="i-lucide-trash-2"
                                size="xs"
                                variant="ghost"
                                color="error"
                                :title="t('vocabulary.delete')"
                                @click="removeEntry(entry)"
                            />
                        </template>
                    </li>
                </ul>
            </UCard>

            <UCard
                v-else
                :ui="{ body: 'py-10 text-center text-sm text-muted' }"
            >
                {{ t("vocabulary.empty") }}
            </UCard>
        </div>
    </div>
</template>
