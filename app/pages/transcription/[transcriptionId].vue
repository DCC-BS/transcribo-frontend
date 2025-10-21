<script lang="ts" setup>
import { UInput } from "#components";
import { TranscriptonNameChangeCommand } from "~/types/commands";

const route = useRoute();
const transcriptionStore = useTranscriptionsStore();
const { executeCommand } = useCommandBus();
const { t } = useI18n();
const mediaUrl = computed(() => {
    if (transcriptionStore.currentTranscription?.mediaFile) {
        return URL.createObjectURL(
            transcriptionStore.currentTranscription?.mediaFile,
        );
    }

    return undefined;
});

const mediaName = computed(() => {
    if (transcriptionStore.currentTranscription?.mediaFileName) {
        return transcriptionStore.currentTranscription?.mediaFileName;
    }

    return undefined;
});

const transcriptionId = route.params.transcriptionId as string;
const { registerService, unRegisterServer, error, isInited } =
    useTranscriptionService(transcriptionId);
const isHelpViewOpen = ref(false);

// Summary state
const summaryError = ref<string | null>(null);
const isSummaryExpanded = ref(false);

// View mode state - default to viewer mode as requested
const isViewMode = ref(false);

onMounted(() => {
    registerService();
});

onUnmounted(() => {
    unRegisterServer();
});

async function handleNameChange(name: string | number) {
    if (typeof name === "string") {
        await executeCommand(new TranscriptonNameChangeCommand(name));
    }
}

async function handleGenerateSummary(): Promise<void> {
    if (transcriptionStore.isSummaryGenerating) return;

    summaryError.value = null;
    // Collapse summary section when regenerating (it will expand again after new summary is generated)
    isSummaryExpanded.value = false;

    try {
        await transcriptionStore.generateSummary();
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
        <div v-if="transcriptionStore.currentTranscription && isInited" class="p-2">
            <!-- Single line with Download Media, File Name edit, Export, and Help -->
            <div class="flex items-center gap-2 mb-4">
                <!-- Download Media Button -->
                <a v-if="mediaUrl && mediaName" :href="mediaUrl" :download="mediaName">
                    <UButton icon="i-heroicons-arrow-down-tray" variant="ghost" :label="t('media.downloadMedia')"
                        color="info" size="sm" />
                </a>

                <!-- File Name Input -->
                <UInput class="flex-1 min-w-0" :model-value="transcriptionStore.currentTranscription.name"
                    @update:model-value="handleNameChange" placeholder="Transcription name" />

                <!-- Mode Toggle Button -->
                <div class="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                    <UButton :icon="isViewMode ? 'i-heroicons-eye' : 'i-heroicons-pencil-square'"
                        :variant="isViewMode ? 'solid' : 'ghost'" :label="t('mode.viewer')"
                        :color="isViewMode ? 'primary' : 'neutral'" size="sm" @click="isViewMode = true"
                        class="min-w-20 font-medium" :class="{ 'shadow-sm': isViewMode }" />
                    <UButton :icon="!isViewMode ? 'i-heroicons-pencil-square' : 'i-heroicons-eye'"
                        :variant="!isViewMode ? 'solid' : 'ghost'" :label="t('mode.editor')"
                        :color="!isViewMode ? 'primary' : 'neutral'" size="sm" @click="isViewMode = false"
                        class="min-w-20 font-medium ml-1" :class="{ 'shadow-sm': !isViewMode }" />
                </div>

                <!-- Generate Summary Button -->
                <UButton v-if="!transcriptionStore.currentTranscription.summary" icon="i-heroicons-light-bulb"
                    variant="ghost"
                    :label="transcriptionStore.isSummaryGenerating ? t('summary.generating') : t('summary.generate')"
                    color="primary" size="sm" :loading="transcriptionStore.isSummaryGenerating"
                    :disabled="transcriptionStore.isSummaryGenerating" @click="handleGenerateSummary" />

                <!-- Summary buttons when summary exists -->
                <template v-else>
                    <!-- Regenerate Summary Button -->
                    <UButton icon="i-heroicons-arrow-path" variant="ghost"
                        :label="transcriptionStore.isSummaryGenerating ? t('summary.regenerating') : t('summary.regenerate')"
                        color="primary" size="sm" :loading="transcriptionStore.isSummaryGenerating"
                        :disabled="transcriptionStore.isSummaryGenerating" @click="handleGenerateSummary" />
                </template>

                <!-- Export Toolbar -->
                <ExportToolbar />
            </div>

            <!-- Summary Section -->
            <div v-if="transcriptionStore.currentTranscription.summary" class="mb-4">
                <UCollapsible v-model:open="isSummaryExpanded" class="border border-gray-200 rounded-lg">
                    <UButton :label="t('summary.title')"
                        :trailing-icon="isSummaryExpanded ? 'i-heroicons-chevron-up' : 'i-heroicons-chevron-down'"
                        variant="ghost" color="neutral" class="w-full justify-between p-4 text-lg font-semibold" :ui="{
                            trailingIcon: 'transition-transform duration-200'
                        }" block />

                    <template #content>
                        <div class="p-4 border-t border-gray-200">
                            <div class="prose prose-sm max-w-none max-h-96 overflow-y-auto">
                                <MDC :value="transcriptionStore.currentTranscription.summary" />
                            </div>
                        </div>
                    </template>
                </UCollapsible>
            </div>

            <!-- Summary Error Alert -->
            <div v-if="summaryError" class="mb-4">
                <UAlert color="error" :title="t('summary.error')" :description="summaryError"
                    icon="i-heroicons-exclamation-triangle" @close="summaryError = null" closable />
            </div>

            <!-- Viewer Mode -->
            <div v-if="isViewMode" class="h-[calc(100vh-12rem)]">
                <TranscriptionViewer />
            </div>

            <!-- Editor Mode -->
            <SplitView v-else>
                <template #a>
                    <MediaEditor />
                </template>
                <template #b>
                    <div class="overflow-y-auto max-h-[calc(100vh-12rem)]">
                        <TranscriptionList class="p-2" />
                    </div>
                </template>
            </SplitView>

        </div>
        <div v-else-if="error" class="p-4 text-center">
            <UAlert color="error" title="Error" :description="t('transcription.notFound')"
                icon="i-heroicons-exclamation-triangle" />
        </div>
        <div v-else class="p-4 text-center">
            <p>{{ t('transcription.loading') }}</p>
        </div>
    </div>
</template>
