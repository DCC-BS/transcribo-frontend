<script setup lang="ts">
import { motion } from "motion-v";
import type { SummaryType } from "#shared/types/summary";
import type { StoredTranscription } from "~/types/storedTranscription";

interface Props {
    transcription: StoredTranscription;
}

const props = defineProps<Props>();

const { isSummaryGenerating, generateSummary } = useTranscriptionSummary();
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

            <div class="flex-1 flex gap-2 justify-end">
                <USelectMenu
                    v-model="summaryType"
                    :items="summaryOptions"
                    valueKey="value"
                    labelKey="label"
                    descriptionKey="description"
                    :popper="{
                        strategy: 'absolute',
                        placement: 'bottom-start',
                    }"
                    class="min-w-100"
                    :ui="{
                        itemDescription: 'overflow-visible text-wrap',
                    }"
                />

                <motion.div
                    :whileHover="{ scale: 1.02 }"
                    :whileTap="{ scale: 0.98 }"
                    :transition="{
                        type: 'spring',
                        stiffness: 400,
                        damping: 17,
                    }"
                >
                    <UButton
                        v-if="!props.transcription.summary"
                        icon="i-lucide-lightbulb"
                        variant="soft"
                        color="warning"
                        size="sm"
                        :label="
                            isSummaryGenerating
                                ? t('summary.generating')
                                : t('summary.generate')
                        "
                        :loading="isSummaryGenerating"
                        :disabled="isSummaryGenerating"
                        @click="handleGenerateSummary"
                        class="shadow-sm"
                    />
                    <UButton
                        v-else
                        icon="i-lucide-refresh-cw"
                        variant="ghost"
                        color="primary"
                        size="sm"
                        :label="
                            isSummaryGenerating
                                ? t('summary.regenerating')
                                : t('summary.regenerate')
                        "
                        :loading="isSummaryGenerating"
                        :disabled="isSummaryGenerating"
                        @click="handleGenerateSummary"
                    />
                </motion.div>
            </div>
        </div>

        <!-- Error Alert -->
        <motion.div
            v-if="summaryError"
            :animate="{ opacity: 1, y: 0 }"
            :initial="{ opacity: 0, y: -10 }"
            :transition="{ type: 'spring', stiffness: 300, damping: 25 }"
            class="px-4 pb-4"
        >
            <UAlert
                color="error"
                :title="t('summary.error')"
                :description="summaryError"
                icon="i-lucide-triangle-alert"
                closable
                @close="summaryError = null"
                class="shadow-sm"
            />
        </motion.div>

        <!-- Summary Content -->
        <motion.div
            v-if="props.transcription.summary"
            :animate="{ opacity: 1, height: 'auto' }"
            :initial="{ opacity: 0, height: 0 }"
            :transition="{ duration: 0.35, ease: 'easeOut' }"
        >
            <div class="p-4 border-t border-amber-200/50 bg-white/40">
                <motion.div
                    :animate="{ opacity: 1 }"
                    :initial="{ opacity: 0 }"
                    :transition="{ duration: 0.4, delay: 0.1 }"
                    class="prose prose-sm max-w-none overflow-y-auto prose-amber"
                >
                    <MDC :value="props.transcription.summary" />
                </motion.div>
            </div>
        </motion.div>

        <!-- Empty State -->
        <motion.div
            v-else-if="!isSummaryGenerating"
            :animate="{ opacity: 1 }"
            :initial="{ opacity: 0 }"
            class="p-6 text-center border-t border-amber-200/50"
        >
            <p class="text-gray-500 text-sm">
                {{ t("summary.empty") || "No summary generated yet" }}
            </p>
        </motion.div>
    </div>
</template>
