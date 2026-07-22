<script lang="ts" setup>
import { createReusableTemplate } from "@vueuse/core";
import { motion } from "motion-v";
import { useSegments } from "~/composables/useSegments";
import { type ChangeEditorModeCommand, Cmds } from "~/types/commands";
import type { EditorMode } from "~/types/editor";

const route = useRoute();
const { t } = useI18n();
const [DefineMainContent, UseMainContent] = createReusableTemplate();
const { onCommand } = useCommandBus();

const transcriptionId = route.params.transcriptionId as string;

const { transcription } = useTranscription(transcriptionId);
const { segments } = useSegments(transcriptionId);

// single source of truth for speaker order and colors on this page —
// persists each speaker's stable lane/color slot
provideSpeakerRegistry(transcription, () => segments.value ?? []);

// fresh document, fresh playback position (the shared time otherwise
// survives across mode switches on purpose)
usePlaybackTime().value = 0;

const isTranscriptionLoading = computed(
    () => !transcription.value && !segments.value,
);

useTranscriptionCommandHandler();

const editorMode = ref<EditorMode>("view");

onCommand<ChangeEditorModeCommand>(
    Cmds.ChangeEditorModeCommand,
    async (command) => {
        editorMode.value = command.newMode;
    },
);

</script>

<template>
    <Onboarding />

    <Teleport defer to="#appbar-context">
        <ClientOnly>
            <TranscriptionInfoView
                v-if="transcription"
                :transcription="transcription"
            />
        </ClientOnly>
    </Teleport>

    <div class="flex min-h-0 grow flex-col overflow-hidden">
        <template v-if="isTranscriptionLoading">
            <LoadingView :loading-text="t('transcription.loading')" />
        </template>
        <template v-else-if="transcription && segments">
            <UseMainContent />
        </template>
        <template v-else>
                <motion.div
                    :animate="{ opacity: 1, scale: 1 }"
                    :initial="{ opacity: 0, scale: 0.95 }"
                    :transition="{ duration: 0.4 }"
                    class="flex flex-col items-center justify-center min-h-[60vh] p-8"
                >
                    <div
                        class="w-20 h-20 rounded-2xl bg-elevated flex items-center justify-center mb-4"
                    >
                        <UIcon
                            name="i-lucide-file-x"
                            class="w-10 h-10 text-dimmed"
                        />
                    </div>
                    <p
                        class="text-muted text-lg font-medium"
                    >
                        {{
                            t("transcription.notFound")
                        }}
                    </p>
                </motion.div>
            </template>
    </div>

    <DefineMainContent>
        <template v-if="transcription && segments">
            <div id="main-content" class="flex min-h-0 grow flex-col">
                <!-- toolbar: mode tabs on the left, the active mode's tools
                     teleport into the right side -->
                <div
                    class="flex flex-wrap items-center gap-3 border-b border-default bg-default px-3.5 py-1.5"
                >
                    <EditorModeSelector v-model="editorMode" />
                    <div class="grow" />
                    <div
                        id="editor-toolbar-tools"
                        class="flex flex-wrap items-center gap-3.5"
                    />
                    <ExportToolbar
                        :transcription="transcription"
                        :segments="segments"
                    />
                </div>

                <!-- Content Area with Mode Transition: opacity only — any
                     y-offset shifts the fixed toolrow/dock frame -->
                <motion.div
                    class="flex min-h-0 grow flex-col"
                    :key="editorMode"
                    :animate="{ opacity: 1 }"
                    :initial="{ opacity: 0 }"
                    :transition="{ duration: 0.25, ease: 'easeOut' }"
                >
                    <!-- Viewer Mode -->
                    <template v-if="editorMode === 'view'">
                        <TranscriptionViewer
                            :transcription="transcription"
                            :segments="segments"
                        />
                    </template>

                    <template v-else-if="editorMode === 'summary'">
                        <TranscriptionSummaryView
                            :transcription="transcription"
                            :segments="segments"
                        />
                    </template>

                    <!-- Editor Mode (script-style TipTap editor, former
                         "document" mode — the modes were consolidated) -->
                    <template v-else-if="editorMode === 'edit'">
                        <TranscriptDocumentView
                            :transcription="transcription"
                            :segments="segments"
                        />
                    </template>

                    <!-- Statistics Mode -->
                    <template v-else-if="editorMode === 'statistics'">
                        <SpeakerStatisticsView
                            :transcription="transcription"
                            :segments="segments"
                        />
                    </template>
                </motion.div>
            </div>
        </template>
    </DefineMainContent>
</template>
