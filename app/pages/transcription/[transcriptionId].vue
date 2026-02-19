<script lang="ts" setup>
import { createReusableTemplate } from "@vueuse/core";
import { motion } from "motion-v";
import { useTranscriptionSummary } from "~/composables/useTranscriptionSummary";
import type { StoredTranscription } from "~/types/storedTranscription";

definePageMeta({ layout: "edit" });

const route = useRoute();
const { t } = useI18n();
const { getTranscription } = useTranscription();
const [DefineMainContent, UseMainContent] = createReusableTemplate();

const transcriptionId = route.params.transcriptionId as string;

const currentTranscription = ref<StoredTranscription>();
const isTranscriptionLoading = ref(true);

useTranscriptionService(currentTranscription);



// Editor mode state - default to view mode
type EditorMode = "view" | "summary" | "edit";
const editorMode = ref<EditorMode>("view");

onMounted(async () => {
    currentTranscription.value = await getTranscription(transcriptionId);
    isTranscriptionLoading.value = false;
});

</script>

<template>
    <HContainer>
        <template #top>
            <div class="flex md:hidden items-center justify-center mb-2">
                <EditorModeSelector v-model="editorMode" />
            </div>
            <div class="w-full flex flex-wrap justify-between items-center gap-2">
                <!-- Transcription Info Portal Target (left-aligned) -->
                <div class="flex-1 min-w-0">
                    <TranscriptionInfoView v-if="currentTranscription" :transcription="currentTranscription" />
                </div>

                <!-- Center: Mode selector -->
                <div class="hidden md:flex items-center justify-center shrink-0">
                    <EditorModeSelector v-model="editorMode" />
                </div>

                <!-- Export Portal Target (right-aligned) -->
                <div class="flex-1 min-w-0 flex justify-end">
                    <ExportToolbar v-if="currentTranscription" :transcription="currentTranscription"/>
                </div>
            </div>
        </template>
        <div>
            <div v-if="isTranscriptionLoading">
                <LoadingView :loadingText="t('transcription.loading')" />
            </div>
            <div v-else-if="currentTranscription">
                <UseMainContent />
            </div>
            <div v-else>
                <motion.div :animate="{ opacity: 1, scale: 1 }" :initial="{ opacity: 0, scale: 0.95 }"
                    :transition="{ duration: 0.4 }" class="flex flex-col items-center justify-center min-h-[60vh] p-8">
                    <div class="w-20 h-20 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
                        <UIcon name="i-lucide-file-x" class="w-10 h-10 text-gray-400 dark:text-gray-500" />
                    </div>
                    <p class="text-gray-500 dark:text-gray-400 text-lg font-medium">
                        {{ t("transcription.notFound") || "Transcription not found" }}
                    </p>
                </motion.div>
            </div>
        </div>
    </HContainer>

    <DefineMainContent>
        <template v-if="currentTranscription">
            <motion.div :animate="{ opacity: 1, y: 0 }" :initial="{ opacity: 0, y: 20 }"
                :transition="pageTransition" class="p-2 sm:p-4">

                <!-- Content Area with Mode Transition -->
                <motion.div :key="editorMode" :animate="{ opacity: 1, y: 0 }"
                    :initial="{ opacity: 0, y: 10 }" :transition="{ duration: 0.25, ease: 'easeOut' }">
                    <!-- Viewer Mode -->
                    <div v-if="editorMode === 'view'" class="h-[calc(100vh-12rem)]">
                        <TranscriptionViewer :transcription="currentTranscription" />
                    </div>

                    <div v-else-if="editorMode === 'summary'" class="h-[calc(100vh-12rem)]">
                        <TranscriptionSummaryView :transcription="currentTranscription" />
                    </div>

                    <!-- Editor Mode -->
                    <div v-else-if="editorMode === 'edit'">
                        <TranscriptionEditView :transcription="currentTranscription" />
                    </div>
                </motion.div>
            </motion.div>
        </template>
    </DefineMainContent>
</template>
