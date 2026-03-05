<script setup lang="ts">
import type { SelectMenuItem } from "@nuxt/ui";
import { useStorage } from "@vueuse/core";
import { match } from "ts-pattern";
import type { SummaryType } from "#shared/types/summary";
import type { StoredTranscription } from "~/types/storedTranscription";
import { languages } from "~/utils/languages";

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

// Language selection with persistence
const selectedLanguage = useStorage<string | undefined>(
    "summary-language",
    "auto",
);

// Language options for the select menu
const languageOptions = computed<SelectMenuItem[]>(() => [
    {
        label: t("languages.autoDetect"),
        value: "auto",
        icon: "i-lucide-languages",
    },
    ...languages.map((lang) => ({
        label: t(`languages.${lang.code}`),
        value: lang.code,
        icon: lang.icon,
    })),
]);

const summaryError = ref<string | null>(null);

async function handleGenerateSummary(): Promise<void> {
    if (isSummaryGenerating.value || !props.transcription) return;

    summaryError.value = null;

    const language = match(selectedLanguage.value)
        .with("auto", () => undefined)
        .otherwise((lang) => lang);

    try {
        await generateSummary(props.transcription, summaryType.value, language);
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
        <div class="flex gap-2 flex-wrap items-center justify-between p-4">
            <!--  Icon and Title -->
            <div class="flex items-center gap-3">
                <div
                    class="w-9 h-9 rounded-lg bg-linear-to-br from-amber-400/20 to-orange-400/20 flex items-center justify-center ring-1 ring-amber-400/30"
                >
                    <UIcon
                        name="i-lucide-sparkles"
                        class="w-5 h-5 text-amber-600"
                    />
                </div>
                <h3 class="text-lg font-semibold text-gray-800">
                    {{ t("summary.title") }}
                </h3>
            </div>

            <!-- Action Buttons -->
            <div class="flex-1 flex flex-wrap gap-2 justify-end">
                <div id="generate-summary-button">
                    <UPopover>
                        <UButton
                            :icon="
                                props.transcription.summary
                                    ? 'i-lucide-refresh-cw'
                                    : 'i-lucide-lightbulb'
                            "
                            variant="soft"
                            color="warning"
                            size="sm"
                            :label="
                                props.transcription.summary
                                    ? t('summary.regenerate')
                                    : t('summary.generate')
                            "
                            class="shadow-sm"
                        />

                        <template #content>
                            <div class="p-4 w-80">
                                <h4 class="font-medium text-sm mb-3">
                                    {{ t("summary.selectType") }}
                                </h4>
                                <URadioGroup
                                    v-model="summaryType"
                                    :items="summaryOptions"
                                    value-key="value"
                                    class="mb-4"
                                />
                                <h4 class="font-medium text-sm mb-2">
                                    {{ t("summary.selectLanguage") }}
                                </h4>
                                <USelectMenu
                                    v-model="selectedLanguage"
                                    :items="languageOptions"
                                    label-key="label"
                                    value-key="value"
                                    class="mb-4"
                                />
                                <UButton
                                    block
                                    color="warning"
                                    :label="t('summary.generate')"
                                    :loading="isSummaryGenerating"
                                    :disabled="isSummaryGenerating"
                                    @click="handleGenerateSummary"
                                />
                            </div>
                        </template>
                    </UPopover>
                </div>
                <template v-if="props.transcription.summary">
                    <UButton
                        icon="i-lucide-download"
                        variant="ghost"
                        color="primary"
                        size="sm"
                        :label="t('summary.export')"
                        @click="() => exportSummaryAsDocx(props.transcription)"
                    />
                </template>
            </div>
        </div>

        <!-- Error Alert -->
        <div v-if="summaryError" class="px-4 pb-4">
            <UAlert
                color="error"
                :title="t('summary.error')"
                :description="summaryError"
                icon="i-lucide-triangle-alert"
                closable
                @close="summaryError = null"
                class="shadow-sm"
            />
        </div>

        <div
            v-if="isSummaryGenerating"
            class="p-6 text-center border-t border-amber-200/50"
        >
            <UIcon
                name="i-lucide-loader-2"
                class="w-8 h-8 text-amber-500 animate-spin mx-auto mb-4"
            />
            <p class="text-gray-500">
                {{ t("summary.generating") || "Generating summary..." }}
            </p>
        </div>

        <!-- Summary Content -->
        <div v-if="props.transcription.summary">
            <div
                id="summary-content"
                class="p-4 border-t border-amber-200/50 bg-white/40"
            >
                <div class="prose prose-sm overflow-y-auto prose-amber">
                    <MDC :value="props.transcription.summary" />
                </div>
            </div>
        </div>

        <!-- Empty State -->
        <div
            v-else-if="!isSummaryGenerating"
            class="p-6 text-center border-t border-amber-200/50"
        >
            <p class="text-gray-500 text-sm">
                {{ t("summary.empty") || "No summary generated yet" }}
            </p>
        </div>
    </div>
</template>
