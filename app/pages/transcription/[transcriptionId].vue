<script lang="ts" setup>
import { motion } from "motion-v";
import { UInput } from "#components";
import { useTranscriptionSummary } from "~/composables/useTranscriptionSummary";
import { TranscriptionNameChangeCommand } from "~/types/commands";
import type { StoredTranscription } from "~/types/storedTranscription";

definePageMeta({ layout: "edit" });

const route = useRoute();
const { executeCommand } = useCommandBus();
const { t } = useI18n();
const { getTranscription } = useTranscription();
const { isSummaryGenerating, generateSummary } = useTranscriptionSummary();

const transcriptionId = route.params.transcriptionId as string;

const currentTranscription = ref<StoredTranscription>();
const isTranscriptionLoading = ref(true);
const isMounted = ref(false);

const mediaUrl = computed(() => {
    if (currentTranscription.value?.mediaFile) {
        return URL.createObjectURL(
            currentTranscription.value?.mediaFile,
        );
    }

    return undefined;
});

const mediaName = computed(() => {
    if (currentTranscription.value?.mediaFileName) {
        return currentTranscription.value?.mediaFileName;
    }

    return undefined;
});

useTranscriptionService(currentTranscription);
const isHelpViewOpen = ref(false);

// Info section state - collapsed by default
const isInfoExpanded = ref(false);

// Summary state
const summaryError = ref<string | null>(null);
const isSummaryExpanded = ref(false);

// View mode state - default to viewer mode
const isViewMode = ref(true);

onMounted(async () => {
    isMounted.value = true;
    currentTranscription.value = await getTranscription(transcriptionId);
    isTranscriptionLoading.value = false;
});

async function handleNameChange(name: string | number) {
    if (typeof name === "string") {
        await executeCommand(new TranscriptionNameChangeCommand(name));
    }
}

async function handleGenerateSummary(): Promise<void> {
    if (isSummaryGenerating.value || !currentTranscription.value) return;

    summaryError.value = null;
    // Collapse summary section when regenerating (it will expand again after new summary is generated)
    isSummaryExpanded.value = false;

    try {
        await generateSummary(currentTranscription.value);
        // Expand the summary section after successful generation/regeneration
        isSummaryExpanded.value = true;
    } catch (error) {
        summaryError.value =
            error instanceof Error
                ? error.message
                : "Failed to generate summary";
    }
}

// Animation variants
const pageTransition = {
    type: "spring" as const,
    stiffness: 200,
    damping: 25,
};

const staggerDelay = 0.1;
</script>

<template>
    <div class="min-h-screen">
        <!-- Loading State with Animation -->
        <div v-if="isTranscriptionLoading" class="flex items-center justify-center min-h-[60vh]">
            <motion.div
                :animate="{ opacity: 1, scale: 1 }"
                :initial="{ opacity: 0, scale: 0.9 }"
                :transition="{ duration: 0.3 }"
                class="flex flex-col items-center gap-4"
            >
                <div class="relative">
                    <div class="w-16 h-16 border-4 border-primary-200 dark:border-primary-900 rounded-full" />
                    <div class="absolute top-0 left-0 w-16 h-16 border-4 border-transparent border-t-primary-500 rounded-full animate-spin" />
                </div>
                <p class="text-gray-500 dark:text-gray-400 font-medium animate-pulse">
                    {{ t("transcription.loading") }}
                </p>
            </motion.div>
        </div>

        <!-- Main Content with Entrance Animation -->
        <motion.div
            v-else-if="currentTranscription"
            :animate="{ opacity: 1, y: 0 }"
            :initial="{ opacity: 0, y: 20 }"
            :transition="pageTransition"
            class="p-2 sm:p-4"
        >
            <!-- Transcription Info Section - Teleported to layout header -->
            <ClientOnly>
                <Teleport v-if="isMounted" to="#transcription-info-portal">
                    <motion.div
                        :animate="{ opacity: 1, x: 0 }"
                        :initial="{ opacity: 0, x: -10 }"
                        :transition="{ ...pageTransition, delay: staggerDelay }"
                    >
                        <UPopover
                            v-model:open="isInfoExpanded"
                            :ui="{ content: 'p-0 min-w-72' }"
                        >
                        <UButton
                            variant="ghost"
                            color="neutral"
                            size="sm"
                            class="gap-2"
                        >
                            <template #leading>
                                <div class="w-6 h-6 rounded-md bg-gradient-to-br from-blue-500/10 to-purple-500/10 dark:from-blue-400/20 dark:to-purple-400/20 flex items-center justify-center">
                                    <UIcon name="i-lucide-info" class="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
                                </div>
                            </template>
                            <span class="truncate max-w-32 sm:max-w-48">{{ currentTranscription.name || t('transcription.info') }}</span>
                            <template #trailing>
                                <UIcon name="i-lucide-chevron-down" class="w-4 h-4 transition-transform duration-200" :class="{ 'rotate-180': isInfoExpanded }" />
                            </template>
                        </UButton>

                        <template #content>
                            <motion.div
                                :animate="{ opacity: 1, y: 0 }"
                                :initial="{ opacity: 0, y: -5 }"
                                :transition="{ duration: 0.2 }"
                                class="p-4 space-y-4 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700"
                            >
                                <!-- File Name Input -->
                                <div class="space-y-1.5">
                                    <label class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                                        {{ t('transcription.nameLabel') || 'Name' }}
                                    </label>
                                    <UInput
                                        class="w-full"
                                        :model-value="currentTranscription.name"
                                        @update:model-value="handleNameChange"
                                        :placeholder="t('transcription.namePlaceholder')"
                                        size="sm"
                                    />
                                </div>

                                <!-- Download Media Button -->
                                <div class="pt-2 border-t border-gray-200 dark:border-gray-700">
                                    <a v-if="mediaUrl && mediaName" :href="mediaUrl" :download="mediaName">
                                        <motion.div
                                            :whileHover="{ scale: 1.02 }"
                                            :whileTap="{ scale: 0.98 }"
                                            :transition="{ type: 'spring' as const, stiffness: 400, damping: 17 }"
                                        >
                                            <UButton
                                                icon="i-lucide-download"
                                                variant="soft"
                                                :label="t('media.downloadMedia')"
                                                color="info"
                                                size="sm"
                                                block
                                            />
                                        </motion.div>
                                    </a>
                                    <div
                                        v-else
                                        class="flex items-center gap-2 text-sm text-gray-400 dark:text-gray-500 italic"
                                    >
                                        <UIcon name="i-lucide-file-x" class="w-4 h-4" />
                                        {{ t('media.noMedia') }}
                                    </div>
                                </div>
                            </motion.div>
                        </template>
                    </UPopover>
                </motion.div>
            </Teleport>

            <!-- Export Toolbar - Teleported to layout header (right side) -->
            <Teleport v-if="isMounted" to="#export-portal">
                <motion.div
                    :animate="{ opacity: 1, x: 0 }"
                    :initial="{ opacity: 0, x: 10 }"
                    :transition="{ ...pageTransition, delay: staggerDelay }"
                    :whileHover="{ scale: 1.02 }"
                    :whileTap="{ scale: 0.98 }"
                >
                    <ExportToolbar :transcription="currentTranscription" />
                </motion.div>
            </Teleport>
            </ClientOnly>

            <!-- Main Toolbar Row with Staggered Animation -->
            <motion.div
                :animate="{ opacity: 1, y: 0 }"
                :initial="{ opacity: 0, y: 10 }"
                :transition="{ ...pageTransition, delay: staggerDelay * 2 }"
                class="flex flex-wrap items-center gap-3 mb-4"
            >
                <!-- Mode Toggle with Sliding Indicator -->
                <div class="relative flex items-center bg-gray-100 dark:bg-gray-800/80 rounded-xl p-1.5 shrink-0 shadow-inner">
                    <!-- Sliding Background Indicator -->
                    <motion.div
                        :animate="isViewMode ? { x: 0 } : { x: 'calc(100% + 0.25rem)' }"
                        :transition="{ type: 'spring' as const, stiffness: 400, damping: 30 }"
                        class="absolute left-1.5 w-[calc(50%-0.125rem)] h-[calc(100%-0.75rem)] bg-white dark:bg-gray-700 rounded-lg shadow-sm"
                    />
                    
                    <!-- Viewer Button -->
                    <motion.button
                        :whileHover="{ scale: 1.02 }"
                        :whileTap="{ scale: 0.98 }"
                        :transition="{ type: 'spring' as const, stiffness: 400, damping: 17 }"
                        @click="isViewMode = true"
                        type="button"
                        class="relative z-10 flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-lg text-sm font-medium transition-colors duration-200 min-w-16 sm:min-w-20"
                        :class="isViewMode
                            ? 'text-primary-600 dark:text-primary-400'
                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'"
                    >
                        <UIcon name="i-lucide-eye" class="w-4 h-4" />
                        <span class="hidden sm:inline">{{ t('mode.viewer') }}</span>
                    </motion.button>
                    
                    <!-- Editor Button -->
                    <motion.button
                        :whileHover="{ scale: 1.02 }"
                        :whileTap="{ scale: 0.98 }"
                        :transition="{ type: 'spring' as const, stiffness: 400, damping: 17 }"
                        @click="isViewMode = false"
                        type="button"
                        class="relative z-10 flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-lg text-sm font-medium transition-colors duration-200 min-w-16 sm:min-w-20"
                        :class="!isViewMode
                            ? 'text-primary-600 dark:text-primary-400'
                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'"
                    >
                        <UIcon name="i-lucide-square-pen" class="w-4 h-4" />
                        <span class="hidden sm:inline">{{ t('mode.editor') }}</span>
                    </motion.button>
                </div>

                <!-- Summary Buttons - only in view mode -->
                <template v-if="isViewMode">
                    <!-- Generate Summary Button -->
                    <motion.div
                        v-if="!currentTranscription.summary"
                        :whileHover="{ scale: 1.02 }"
                        :whileTap="{ scale: 0.98 }"
                        :transition="{ type: 'spring' as const, stiffness: 400, damping: 17 }"
                    >
                        <UButton
                            icon="i-lucide-lightbulb"
                            variant="soft"
                            :label="isSummaryGenerating ? t('summary.generating') : t('summary.generate')"
                            color="warning"
                            size="sm"
                            :loading="isSummaryGenerating"
                            :disabled="isSummaryGenerating"
                            @click="handleGenerateSummary"
                            class="shadow-sm"
                        />
                    </motion.div>

                    <!-- Regenerate Summary Button -->
                    <motion.div
                        v-else
                        :whileHover="{ scale: 1.02 }"
                        :whileTap="{ scale: 0.98 }"
                        :transition="{ type: 'spring' as const, stiffness: 400, damping: 17 }"
                    >
                        <UButton
                            icon="i-lucide-loader-circle"
                            variant="ghost"
                            :label="isSummaryGenerating ? t('summary.regenerating') : t('summary.regenerate')"
                            color="primary"
                            size="sm"
                            :loading="isSummaryGenerating"
                            :disabled="isSummaryGenerating"
                            @click="handleGenerateSummary"
                        />
                    </motion.div>
                </template>
            </motion.div>

            <!-- Summary Section with Staggered Animation -->
            <motion.div
                v-if="isViewMode && currentTranscription.summary"
                :key="'summary-' + currentTranscription.summary"
                :animate="{ opacity: 1, y: 0, scale: 1 }"
                :initial="{ opacity: 0, y: 15, scale: 0.98 }"
                :transition="{ ...pageTransition, delay: staggerDelay * 3 }"
                class="mb-4"
            >
                <UCollapsible
                    v-model:open="isSummaryExpanded"
                    class="group border border-amber-200/60 dark:border-amber-800/40 rounded-xl overflow-hidden bg-gradient-to-br from-amber-50/80 to-orange-50/50 dark:from-amber-950/30 dark:to-orange-950/20 shadow-sm hover:shadow-md transition-shadow duration-300"
                >
                    <!-- Summary Header -->
                    <UButton
                        :trailing-icon="isSummaryExpanded ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
                        variant="ghost"
                        color="neutral"
                        class="w-full justify-between p-4 text-lg font-semibold"
                        :ui="{
                            trailingIcon: 'transition-transform duration-300 ease-out',
                        }"
                        block
                    >
                        <template #leading>
                            <div class="flex items-center gap-3">
                                <div class="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-400/20 to-orange-400/20 dark:from-amber-400/30 dark:to-orange-400/30 flex items-center justify-center ring-1 ring-amber-400/30 dark:ring-amber-400/20">
                                    <UIcon name="i-lucide-sparkles" class="w-5 h-5 text-amber-600 dark:text-amber-400" />
                                </div>
                                <span class="text-gray-800 dark:text-gray-100">{{ t('summary.title') }}</span>
                            </div>
                        </template>
                    </UButton>

                    <template #content>
                        <motion.div
                            :animate="{ opacity: 1, height: 'auto' }"
                            :initial="{ opacity: 0, height: 0 }"
                            :transition="{ duration: 0.35, ease: 'easeOut' }"
                            class="overflow-hidden"
                        >
                            <div class="p-4 border-t border-amber-200/50 dark:border-amber-800/30 bg-white/40 dark:bg-gray-900/20">
                                <motion.div
                                    :animate="{ opacity: 1 }"
                                    :initial="{ opacity: 0 }"
                                    :transition="{ duration: 0.4, delay: 0.1 }"
                                    class="prose prose-sm max-w-none max-h-96 overflow-y-auto dark:prose-invert prose-amber"
                                >
                                    <MDC :value="currentTranscription.summary" />
                                </motion.div>
                            </div>
                        </motion.div>
                    </template>
                </UCollapsible>
            </motion.div>

            <!-- Summary Error Alert with Animation -->
            <motion.div
                v-if="summaryError"
                :animate="{ opacity: 1, x: 0, scale: 1 }"
                :initial="{ opacity: 0, x: -20, scale: 0.95 }"
                :exit="{ opacity: 0, x: 20, scale: 0.95 }"
                :transition="{ type: 'spring' as const, stiffness: 300, damping: 25 }"
                class="mb-4"
            >
                <UAlert
                    color="error"
                    :title="t('summary.error')"
                    :description="summaryError"
                    icon="i-lucide-triangle-alert"
                    @close="summaryError = null"
                    closable
                    class="shadow-sm"
                />
            </motion.div>

            <!-- Content Area with Mode Transition -->
            <motion.div
                :key="isViewMode ? 'viewer' : 'editor'"
                :animate="{ opacity: 1, y: 0 }"
                :initial="{ opacity: 0, y: 10 }"
                :transition="{ duration: 0.25, ease: 'easeOut' }"
            >
                <!-- Viewer Mode -->
                <div v-if="isViewMode" class="h-[calc(100vh-12rem)]">
                    <TranscriptionViewer :transcription="currentTranscription" />
                </div>

                <!-- Editor Mode -->
                <div v-else>
                    <TranscriptionEditView :transcription="currentTranscription" />
                </div>
            </motion.div>
        </motion.div>

        <!-- Empty State (no transcription found) -->
        <motion.div
            v-else
            :animate="{ opacity: 1, scale: 1 }"
            :initial="{ opacity: 0, scale: 0.95 }"
            :transition="{ duration: 0.4 }"
            class="flex flex-col items-center justify-center min-h-[60vh] p-8"
        >
            <div class="w-20 h-20 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
                <UIcon name="i-lucide-file-x" class="w-10 h-10 text-gray-400 dark:text-gray-500" />
            </div>
            <p class="text-gray-500 dark:text-gray-400 text-lg font-medium">
                {{ t("transcription.notFound") || "Transcription not found" }}
            </p>
        </motion.div>
    </div>
</template>
