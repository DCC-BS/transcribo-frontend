<script setup lang="ts">
import { useClipboard, useStorage } from "@vueuse/core";
import { match } from "ts-pattern";
import type { SummaryType } from "#shared/types/summary";
import type { StoredTranscription } from "~/types/storedTranscription";

interface Props {
    transcription: StoredTranscription;
}

const props = defineProps<Props>();

const { isSummaryGenerating, generateSummary } = useTranscriptionSummary();
const { exportSummaryAsDocx } = useExport();
const { t } = useI18n();
const { copy, copied } = useClipboard();

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

const languageOptions = useLanguageOptions();

const summaryError = ref<string | null>(null);

/**
 * Generates the summary in the selected type and language, showing any failure inline.
 */
async function handleGenerateSummary(): Promise<void> {
    if (isSummaryGenerating.value || !props.transcription) return;

    summaryError.value = null;

    const language = match(selectedLanguage.value)
        .with("auto", () => undefined)
        .otherwise((lang) => lang);

    try {
        await generateSummary(
            props.transcription,
            summaryType.value,
            language,
        );
    } catch (error) {
        summaryError.value =
            error instanceof Error
                ? error.message
                : "Failed to generate summary";
    }
}
</script>

<template>
    <div class="flex min-h-0 grow flex-col">
        <Teleport defer to="#editor-toolbar-tools">
            <div id="generate-summary-button">
                <UPopover>
                    <UButton
                        :icon="
                            props.transcription.summary
                                ? 'i-lucide-refresh-cw'
                                : 'i-lucide-sparkles'
                        "
                        color="primary"
                        size="sm"
                        :label="
                            props.transcription.summary
                                ? t('summary.regenerate')
                                : t('summary.generate')
                        "
                    />

                    <template #content>
                        <div class="w-80 p-4">
                            <h4 class="mb-3 text-sm font-semibold">
                                {{ t("summary.selectType") }}
                            </h4>
                            <URadioGroup
                                v-model="summaryType"
                                :items="summaryOptions"
                                value-key="value"
                                class="mb-4"
                            />
                            <h4 class="mb-2 text-sm font-semibold">
                                {{ t("summary.selectLanguage") }}
                            </h4>
                            <USelectMenu
                                v-model="selectedLanguage"
                                :items="languageOptions"
                                label-key="label"
                                value-key="value"
                                class="mb-4 w-full"
                            />
                            <UButton
                                block
                                color="primary"
                                :label="t('summary.generate')"
                                :loading="isSummaryGenerating"
                                :disabled="isSummaryGenerating"
                                @click="handleGenerateSummary"
                            />
                        </div>
                    </template>
                </UPopover>
            </div>
        </Teleport>

        <div class="min-h-0 flex-1 overflow-y-auto px-5 py-8">
            <div class="mx-auto w-full max-w-225">
                <UAlert
                    v-if="summaryError"
                    class="mb-4"
                    color="error"
                    :title="t('summary.error')"
                    :description="summaryError"
                    icon="i-lucide-triangle-alert"
                    closable
                    @close="summaryError = null"
                />

                <UCard :ui="{ body: 'p-8 sm:p-12' }">
                    <div
                        v-if="
                            props.transcription.summary &&
                            !isSummaryGenerating
                        "
                        class="mb-4 flex items-center gap-3 border-b border-default pb-3"
                    >
                        <h3
                            class="min-w-0 flex-1 truncate text-[0.95rem] font-semibold text-default"
                            :title="props.transcription.name"
                        >
                            {{
                                props.transcription.name ||
                                t("transcription.info")
                            }}
                        </h3>
                        <div
                            v-if="props.transcription.summary"
                            class="flex items-center gap-1"
                        >
                            <UButton
                                :icon="
                                    copied
                                        ? 'i-lucide-clipboard-check'
                                        : 'i-lucide-clipboard'
                                "
                                variant="ghost"
                                color="neutral"
                                :title="
                                    copied
                                        ? t('summary.copied')
                                        : t('summary.copy')
                                "
                                @click="copy(props.transcription.summary)"
                            />
                            <UButton
                                icon="i-lucide-download"
                                variant="ghost"
                                color="neutral"
                                :title="t('summary.export')"
                                @click="
                                    () => exportSummaryAsDocx(props.transcription)
                                "
                            />
                        </div>
                    </div>

                    <div
                        v-if="isSummaryGenerating"
                        class="flex flex-col items-center gap-4 py-10 text-center text-muted"
                    >
                        <UIcon
                            name="i-lucide-loader-2"
                            class="size-8 animate-spin text-primary"
                        />
                        {{ t("summary.generating") }}
                    </div>

                    <div
                        v-else-if="props.transcription.summary"
                        id="summary-content"
                        class="prose prose-sm mt-4 max-w-none dark:prose-invert"
                    >
                        <MDCView :value="props.transcription.summary" />
                    </div>

                    <p
                        v-else
                        class="py-10 text-center text-sm text-muted"
                    >
                        {{ t("summary.empty") }}
                    </p>
                </UCard>
            </div>
        </div>
    </div>
</template>
