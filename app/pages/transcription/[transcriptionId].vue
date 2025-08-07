<script lang="ts" setup>
import { SplitView } from "@dcc-bs/common-ui.bs.js";
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
const isSummaryGenerating = ref(false);
const summaryError = ref<string | null>(null);
const isSummaryExpanded = ref(false);

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
    if (isSummaryGenerating.value) return;

    isSummaryGenerating.value = true;
    summaryError.value = null;

    try {
        await transcriptionStore.generateSummary();
        // Expand the summary section after generation
        isSummaryExpanded.value = false;
    } catch (error) {
        summaryError.value =
            error instanceof Error
                ? error.message
                : "Failed to generate summary";
    } finally {
        isSummaryGenerating.value = false;
    }
}
</script>

<template>
    <div>
        <div
            v-if="transcriptionStore.currentTranscription && isInited"
            class="p-2"
        >
            <!-- Single line with Download Media, File Name edit, Export, and Help -->
            <div class="flex items-center gap-2 mb-4">
                <!-- Download Media Button -->
                <a
                    v-if="mediaUrl && mediaName"
                    :href="mediaUrl"
                    :download="mediaName"
                >
                    <UButton
                        icon="i-heroicons-arrow-down-tray"
                        variant="ghost"
                        :label="t('media.downloadMedia')"
                        color="info"
                        size="sm"
                    />
                </a>

                <!-- File Name Input -->
                <UInput
                    class="flex-1 min-w-0"
                    :model-value="transcriptionStore.currentTranscription.name"
                    @update:model-value="handleNameChange"
                    placeholder="Transcription name"
                />

                <!-- Generate Summary Button -->
                <UButton
                    v-if="!transcriptionStore.currentTranscription.summary"
                    icon="i-heroicons-light-bulb"
                    variant="ghost"
                    :label="isSummaryGenerating ? t('summary.generating') : t('summary.generate')"
                    color="primary"
                    size="sm"
                    :loading="isSummaryGenerating"
                    :disabled="isSummaryGenerating"
                    @click="handleGenerateSummary"
                />
                
                <!-- View Summary Button (if summary exists) -->
                <UButton
                    v-else
                    icon="i-heroicons-light-bulb"
                    variant="ghost"
                    :label="isSummaryExpanded ? t('summary.hide') : t('summary.show')"
                    color="success"
                    size="sm"
                    @click="isSummaryExpanded = !isSummaryExpanded"
                />

                <!-- Export Toolbar -->
                <ExportToolbar />

                <!-- Help Button -->
                <UModal v-model:open="isHelpViewOpen" fullscreen close>
                    <UButton
                        icon="i-heroicons-question-mark-circle"
                        variant="ghost"
                        :label="t('help.help')"
                        color="info"
                        size="sm"
                    />
                    <template #content>
                        <div class="flex justify-end p-2">
                            <UButton
                                icon="i-heroicons-x-circle"
                                variant="ghost"
                                label="Close"
                                color="error"
                                @click="isHelpViewOpen = false"
                            />
                        </div>
                        <div class="overflow-y-scroll w-full h-full">
                            <HelpView />
                        </div>
                    </template>
                </UModal>
            </div>

            <!-- Summary Section -->
            <div v-if="transcriptionStore.currentTranscription.summary" class="mb-4">
                <UCollapsible v-model:open="isSummaryExpanded" class="border border-gray-200 rounded-lg">
                    <UButton
                        :label="t('summary.title')"
                        :trailing-icon="isSummaryExpanded ? 'i-heroicons-chevron-up' : 'i-heroicons-chevron-down'"
                        variant="ghost"
                        color="neutral"
                        class="w-full justify-between p-4 text-lg font-semibold"
                        :ui="{
                            trailingIcon: 'transition-transform duration-200'
                        }"
                        block
                    />
                    
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
                <UAlert
                    color="error"
                    :title="t('summary.error')"
                    :description="summaryError"
                    icon="i-heroicons-exclamation-triangle"
                    @close="summaryError = null"
                    closable
                />
            </div>

            <SplitView>
                <template #a>
                    <MediaEditor class="sticky" />
                </template>
                <template #b>
                    <TranscriptionList class="p-2" />
                </template>
            </SplitView>
        </div>
        <div v-else-if="error" class="p-4 text-center">
            <UAlert
                color="error"
                title="Error"
                :description="t('transcription.notFound')"
                icon="i-heroicons-exclamation-triangle"
            />
        </div>
        <div v-else class="p-4 text-center">
            <p>{{ t('transcription.loading') }}</p>
        </div>
    </div>
</template>
