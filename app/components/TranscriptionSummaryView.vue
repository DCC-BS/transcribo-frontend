<script setup lang="ts">
import { motion } from "motion-v";
import type { StoredTranscription } from "~/types/storedTranscription";

interface Props {
    transcription: StoredTranscription;
}

const props = defineProps<Props>();

const { isSummaryGenerating, generateSummary } = useTranscriptionSummary();
const { t } = useI18n();

const summaryError = ref<string | null>(null);

async function handleGenerateSummary(): Promise<void> {
    if (isSummaryGenerating.value || !props.transcription) return;

    summaryError.value = null;

    try {
        await generateSummary(props.transcription);
    } catch (error) {
        summaryError.value =
            error instanceof Error ? error.message : "Failed to generate summary";
    }
}
</script>

<template>
    <div
        class="border border-amber-200/60 dark:border-amber-800/40 rounded-xl bg-linear-to-br from-amber-50/80 to-orange-50/50 dark:from-amber-950/30 dark:to-orange-950/20 shadow-sm">
        <!-- Header -->
        <div class="flex items-center justify-between p-4">
            <div class="flex items-center gap-3">
                <div
                    class="w-9 h-9 rounded-lg bg-linear-to-br from-amber-400/20 to-orange-400/20 dark:from-amber-400/30 dark:to-orange-400/30 flex items-center justify-center ring-1 ring-amber-400/30 dark:ring-amber-400/20">
                    <UIcon name="i-lucide-sparkles" class="w-5 h-5 text-amber-600 dark:text-amber-400" />
                </div>
                <h3 class="text-lg font-semibold text-gray-800 dark:text-gray-100">
                    {{ t("summary.title") }}
                </h3>
            </div>

            <motion.div
                :whileHover="{ scale: 1.02 }"
                :whileTap="{ scale: 0.98 }"
                :transition="{ type: 'spring', stiffness: 400, damping: 17 }">
                <UButton
                    v-if="!props.transcription.summary"
                    icon="i-lucide-lightbulb"
                    variant="soft"
                    color="warning"
                    size="sm"
                    :label="isSummaryGenerating ? t('summary.generating') : t('summary.generate')"
                    :loading="isSummaryGenerating"
                    :disabled="isSummaryGenerating"
                    @click="handleGenerateSummary"
                    class="shadow-sm" />
                <UButton
                    v-else
                    icon="i-lucide-refresh-cw"
                    variant="ghost"
                    color="primary"
                    size="sm"
                    :label="isSummaryGenerating ? t('summary.regenerating') : t('summary.regenerate')"
                    :loading="isSummaryGenerating"
                    :disabled="isSummaryGenerating"
                    @click="handleGenerateSummary" />
            </motion.div>
        </div>

        <!-- Error Alert -->
        <motion.div
            v-if="summaryError"
            :animate="{ opacity: 1, y: 0 }"
            :initial="{ opacity: 0, y: -10 }"
            :transition="{ type: 'spring', stiffness: 300, damping: 25 }"
            class="px-4 pb-4">
            <UAlert
                color="error"
                :title="t('summary.error')"
                :description="summaryError"
                icon="i-lucide-triangle-alert"
                closable
                @close="summaryError = null"
                class="shadow-sm" />
        </motion.div>

        <!-- Summary Content -->
        <motion.div
            v-if="props.transcription.summary"
            :animate="{ opacity: 1, height: 'auto' }"
            :initial="{ opacity: 0, height: 0 }"
            :transition="{ duration: 0.35, ease: 'easeOut' }">
            <div
                class="p-4 border-t border-amber-200/50 dark:border-amber-800/30 bg-white/40 dark:bg-gray-900/20">
                <motion.div
                    :animate="{ opacity: 1 }"
                    :initial="{ opacity: 0 }"
                    :transition="{ duration: 0.4, delay: 0.1 }"
                    class="prose prose-sm max-w-none overflow-y-auto dark:prose-invert prose-amber">
                    <MDC :value="props.transcription.summary" />
                </motion.div>
            </div>
        </motion.div>

        <!-- Empty State -->
        <motion.div
            v-else-if="!isSummaryGenerating"
            :animate="{ opacity: 1 }"
            :initial="{ opacity: 0 }"
            class="p-6 text-center border-t border-amber-200/50 dark:border-amber-800/30">
            <p class="text-gray-500 dark:text-gray-400 text-sm">
                {{ t("summary.empty") || "No summary generated yet" }}
            </p>
        </motion.div>
    </div>
</template>
