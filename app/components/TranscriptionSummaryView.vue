<script setup lang="ts">
import type { SummaryType } from "#shared/types/summary";
import type { StoredTranscription } from "~/types/storedTranscription";

interface Props {
    transcription: StoredTranscription;
}

const props = defineProps<Props>();

const { isSummaryGenerating, generateSummary } = useTranscriptionSummary();
const { exportSummaryAsDocx } = useExport();
const { t } = useI18n();

const summaryOptions: {
    label: string;
    value: SummaryType;
    description?: string;
}[] = [
        {
            label: t("summary.types.kurzprotokoll"),
            value: "kurzprotokoll",
            description: t("summary.types.kurzprotokollDesc"),
        },
        {
            label: t("summary.types.ergebnisprotokoll"),
            value: "ergebnisprotokoll",
            description: t("summary.types.ergebnisprotokollDesc"),
        },
        {
            label: t("summary.types.verhandlungsprotokoll"),
            value: "verhandlungsprotokoll",
            description: t("summary.types.verhandlungsprotokollDesc"),
        },
    ];
const summaryType = ref<SummaryType>("kurzprotokoll");

const summaryError = ref<string | null>(null);

async function handleGenerateSummary(): Promise<void> {
    if (isSummaryGenerating.value || !props.transcription) return;

    summaryError.value = null;

    try {
        await generateSummary(props.transcription, summaryType.value);
    } catch (error) {
        summaryError.value =
            error instanceof Error
                ? error.message
                : "Failed to generate summary";
    }
}
</script>

<template>
    <div class="bg-linear-to-br">
        <!-- Header -->
        <div class="flex flex-wrap items-center justify-between p-4">
            <div class="flex items-center gap-3">
                <div
                    class="w-9 h-9 rounded-lg bg-linear-to-br from-amber-400/20 to-orange-400/20 flex items-center justify-center ring-1 ring-amber-400/30">
                    <UIcon name="i-lucide-sparkles" class="w-5 h-5 text-amber-600" />
                </div>
                <h3 class="text-lg font-semibold text-gray-800">
                    {{ t("summary.title") }}
                </h3>
            </div>

            <div class="flex-1 flex gap-2 justify-end">
                <UPopover v-if="!props.transcription.summary">
                    <UButton icon="i-lucide-lightbulb" variant="soft" color="warning" size="sm"
                        :label="t('summary.generate')" class="shadow-sm" />

                    <template #content>
                        <div class="p-4 w-80">
                            <h4 class="font-medium text-sm mb-3">
                                {{ t("summary.selectType") }}
                            </h4>
                            <URadioGroup v-model="summaryType" :items="summaryOptions" value-key="value" class="mb-4" />
                            <UButton block color="warning" :label="t('summary.generate')" :loading="isSummaryGenerating"
                                :disabled="isSummaryGenerating" @click="handleGenerateSummary" />
                        </div>
                    </template>
                </UPopover>

                <template v-else>
                    <UPopover>
                        <UButton icon="i-lucide-refresh-cw" variant="ghost" color="primary" size="sm"
                            :label="t('summary.regenerate')" />

                        <template #content>
                            <div class="p-4 w-80">
                                <h4 class="font-medium text-sm mb-3">
                                    {{ t("summary.selectType") }}
                                </h4>
                                <URadioGroup v-model="summaryType" :items="summaryOptions" value-key="value"
                                    class="mb-4" />
                                <UButton block color="primary" :label="t('summary.regenerate')"
                                    :loading="isSummaryGenerating" :disabled="isSummaryGenerating"
                                    @click="handleGenerateSummary" />
                            </div>
                        </template>
                    </UPopover>

                    <UButton icon="i-lucide-download" variant="ghost" color="primary" size="sm"
                        :label="t('summary.export')" @click="() => exportSummaryAsDocx(props.transcription)" />
                </template>
            </div>
        </div>

        <!-- Error Alert -->
        <div v-if="summaryError" class="px-4 pb-4">
            <UAlert color="error" :title="t('summary.error')" :description="summaryError" icon="i-lucide-triangle-alert"
                closable @close="summaryError = null" class="shadow-sm" />
        </div>

        <!-- Summary Content -->
        <div v-if="props.transcription.summary">
            <div class="p-4 border-t border-amber-200/50 bg-white/40">
                <div class="prose prose-sm max-w-none overflow-y-auto prose-amber">
                    <MDC :value="props.transcription.summary" />
                </div>
            </div>
        </div>

        <!-- Empty State -->
        <div v-else-if="!isSummaryGenerating" class="p-6 text-center border-t border-amber-200/50">
            <p class="text-gray-500 text-sm">
                {{ t("summary.empty") || "No summary generated yet" }}
            </p>
        </div>
    </div>
</template>
