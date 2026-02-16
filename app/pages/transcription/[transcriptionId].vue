<script lang="ts" setup>
import { UInput } from "#components";
import { useTranscriptionSummary } from "~/composables/useTranscriptionSummary";
import { TranscriptionNameChangeCommand } from "~/types/commands";
import type { StoredTranscription } from "~/types/storedTranscription";

definePageMeta({ layout: "edit" });

const route = useRoute();
const { executeCommand } = useCommandBus();
const { t } = useI18n();
const { getTranscription } = useTranscription();
const { isSummaryGenerating, generateSummary } = useTranscriptionSummary()

const transcriptionId = route.params.transcriptionId as string;

const currentTranscription = ref<StoredTranscription>();

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

// Summary state
const summaryError = ref<string | null>(null);
const isSummaryExpanded = ref(false);

// View mode state - default to viewer mode as requested
const isViewMode = ref(false);

onMounted(async () => {
    currentTranscription.value = await getTranscription(transcriptionId);
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
</script>

<template>
    <div>
        <div v-if="currentTranscription" class="p-2">
            <!-- Single line with Download Media, File Name edit, Export, and Help -->
            <div class="flex items-center gap-2 mb-4">
                <!-- Download Media Button -->
                <a v-if="mediaUrl && mediaName" :href="mediaUrl" :download="mediaName">
                    <UButton icon="i-lucide-download" variant="ghost" :label="t('media.downloadMedia')" color="info"
                        size="sm" />
                </a>

                <!-- File Name Input -->
                <UInput class="flex-1 min-w-0" :model-value="currentTranscription.name"
                    @update:model-value="handleNameChange" placeholder="Transcription name" />

                <!-- Mode Toggle Button -->
                <div class="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                    <UButton icon="i-lucide-eye" :variant="isViewMode ? 'solid' : 'ghost'" :label="t('mode.viewer')"
                        :color="isViewMode ? 'primary' : 'neutral'" size="sm" @click="isViewMode = true"
                        class="min-w-20 font-medium" :class="{ 'shadow-sm': isViewMode }" />
                    <UButton icon="i-lucide-square-pen" :variant="!isViewMode ? 'solid' : 'ghost'"
                        :label="t('mode.editor')" :color="!isViewMode ? 'primary' : 'neutral'" size="sm"
                        @click="isViewMode = false" class="min-w-20 font-medium ml-1"
                        :class="{ 'shadow-sm': !isViewMode }" />
                </div>

                <!-- Generate Summary Button -->
                <UButton v-if="!currentTranscription.summary" icon="i-lucide-lightbulb" variant="ghost" :label="isSummaryGenerating
                    ? t('summary.generating')
                    : t('summary.generate')
                    " color="primary" size="sm" :loading="isSummaryGenerating" :disabled="isSummaryGenerating"
                    @click="handleGenerateSummary" />

                <!-- Summary buttons when summary exists -->
                <template v-else>
                    <!-- Regenerate Summary Button -->
                    <UButton icon="i-lucide-loader-circle" variant="ghost" :label="isSummaryGenerating
                        ? t('summary.regenerating')
                        : t('summary.regenerate')
                        " color="primary" size="sm" :loading="isSummaryGenerating" :disabled="isSummaryGenerating"
                        @click="handleGenerateSummary" />
                </template>

                <!-- Export Toolbar -->
                <ExportToolbar :transcription="currentTranscription" />
            </div>

            <!-- Summary Section -->
            <div v-if="currentTranscription.summary" class="mb-4">
                <UCollapsible v-model:open="isSummaryExpanded" class="border border-gray-200 rounded-lg">
                    <UButton :label="t('summary.title')" :trailing-icon="isSummaryExpanded
                        ? 'i-lucide-chevron-up'
                        : 'i-lucide-chevron-down'
                        " variant="ghost" color="neutral" class="w-full justify-between p-4 text-lg font-semibold" :ui="{
                            trailingIcon: 'transition-transform duration-200',
                        }" block />

                    <template #content>
                        <div class="p-4 border-t border-gray-200">
                            <div class="prose prose-sm max-w-none max-h-96 overflow-y-auto">
                                <MDC :value="currentTranscription
                                    .summary
                                    " />
                            </div>
                        </div>
                    </template>
                </UCollapsible>
            </div>

            <!-- Summary Error Alert -->
            <div v-if="summaryError" class="mb-4">
                <UAlert color="error" :title="t('summary.error')" :description="summaryError"
                    icon="i-lucide-triangle-alert" @close="summaryError = null" closable />
            </div>

            <!-- Viewer Mode -->
            <div v-if="isViewMode" class="h-[calc(100vh-12rem)]">
                <TranscriptionViewer :transcription="currentTranscription" />
            </div>

            <!-- Editor Mode -->
            <div v-else>
                <TranscriptionEditView :transcription="currentTranscription" />
            </div>
        </div>
        <div v-else class="p-4 text-center">
            <p>{{ t("transcription.loading") }}</p>
        </div>
    </div>
</template>
