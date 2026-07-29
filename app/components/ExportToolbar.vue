<script lang="ts" setup>
import type { ExportOptions } from "~/composables/export";
import type { StoredSegment } from "~/types/storedSegments";
import type { StoredTranscription } from "~/types/storedTranscription";

interface InputProps {
    transcription: StoredTranscription;
    segments: StoredSegment[];
}

const props = defineProps<InputProps>();

const { t } = useI18n();
const { exportAsText, exportAsSrt, exportAsJson, exportAsDocx, exportMedia } =
    useExport();
const { displayName } = useSpeakerRegistry();

// exports print human names, not the SPEAKER_xx ids stored on segments
const namedSegments = computed(() =>
    props.segments.map((segment) => ({
        ...segment,
        speaker: displayName(segment.speaker ?? undefined),
    })),
);

// Export options state
const withSpeakers = useLocalStorage<boolean>("setting:show-speaker", true);
const withTimestamps = useLocalStorage<boolean>(
    "setting:show-timestamps",
    false,
);
const mergeSegments = useLocalStorage<boolean>("setting:merge-segments", true);
const withSummary = ref(false);

const exportOptions = computed<ExportOptions>(() => ({
    transcription: props.transcription,
    segments: namedSegments.value,
    withSpeakers: withSpeakers.value,
    withTimestamps: withTimestamps.value,
    mergeSegments: mergeSegments.value,
    withSummary: withSummary.value,
}));

// Functions to handle exports
/**
 * Exports the transcript as plain text with the selected options.
 */
function handleTextExport(): void {
    exportAsText({
        ...exportOptions.value,
        transcription: props.transcription,
    });
}

/**
 * Exports the transcript as an SRT subtitle file.
 */
function handleSubtitleExport(): void {
    exportAsSrt(
        props.transcription,
        namedSegments.value,
        exportOptions.value.withSpeakers,
    );
}

/**
 * Exports the transcript as JSON, preserving all metadata.
 */
function handleJsonExport(): void {
    exportAsJson(props.transcription, namedSegments.value);
}

/**
 * Exports the transcript as a Word document.
 */
async function handleDocxExport(): Promise<void> {
    await exportAsDocx(exportOptions.value);
}
</script>

<template>
    <UPopover>
        <UButton
            id="export-toolbar"
            icon="i-lucide-download"
            trailing-icon="i-lucide-chevron-down"
            color="primary"
            variant="soft"
            :title="t('export.export')"
            class="text-[0.82rem]"
            :ui="{
                leadingIcon: 'size-4',
                trailingIcon: 'hidden size-4 md:block',
            }"
        >
            <span class="hidden md:inline">{{ t("export.export") }}</span>
        </UButton>

        <template #content>
            <div class="p-4 w-80">
                <!-- Export Options Section -->
                <div class="mb-4">
                    <h4 class="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">
                        {{ t("export.optionsTitle") }}
                    </h4>

                    <!-- Speaker information toggle -->
                    <div class="flex items-center justify-between mb-2">
                        <span class="text-sm">{{
                            t("export.withSpeakers")
                        }}</span>
                        <USwitch v-model="withSpeakers" />
                    </div>

                    <!-- Timestamps toggle (text only) -->
                    <div class="flex items-center justify-between mb-2">
                        <div class="flex flex-col">
                            <span class="text-sm">{{
                                t("export.withTimestamps")
                            }}</span>
                            <span class="text-xs text-dimmed">{{
                                t("export.textOnly")
                            }}</span>
                        </div>
                        <USwitch v-model="withTimestamps" />
                    </div>

                    <!-- Merge segments toggle (text only) -->
                    <div class="flex items-center justify-between mb-2">
                        <div class="flex flex-col">
                            <span class="text-sm">{{
                                t("export.mergeSegments")
                            }}</span>
                            <span class="text-xs text-dimmed">{{
                                t("export.textOnly")
                            }}</span>
                        </div>
                        <USwitch v-model="mergeSegments" />
                    </div>

                    <!-- Meeting summary toggle (text only) -->
                    <div
                        v-if="props.transcription.summary"
                        class="flex items-center justify-between mb-3"
                    >
                        <div class="flex flex-col">
                            <span class="text-sm">{{
                                t("export.withSummary")
                            }}</span>
                            <span class="text-xs text-dimmed">{{
                                t("export.textOnly")
                            }}</span>
                        </div>
                        <USwitch v-model="withSummary" />
                    </div>
                </div>

                <!-- Divider -->
                <div class="border-t border-default my-3"></div>

                <!-- Export Format Buttons -->
                <div class="space-y-2">
                    <h4 class="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                        {{ t("export.formats.title") }}
                    </h4>

                    <!-- Text Format -->
                    <UButton
                        block
                        variant="ghost"
                        color="neutral"
                        icon="i-lucide-file-text"
                        :label="t('export.formats.text')"
                        @click="handleTextExport"
                        class="justify-start"
                    />

                    <!-- Subtitle Format -->
                    <UButton
                        block
                        variant="ghost"
                        color="neutral"
                        icon="i-lucide-message-square-text"
                        :label="t('export.formats.subtitle')"
                        @click="handleSubtitleExport"
                        class="justify-start"
                    />

                    <!-- Json Format -->
                    <UButton
                        block
                        variant="ghost"
                        color="neutral"
                        icon="i-lucide-file-braces"
                        :label="t('export.formats.json')"
                        @click="handleJsonExport"
                        class="justify-start"
                    />

                    <!-- Docx Format -->
                    <UButton
                        block
                        variant="ghost"
                        color="neutral"
                        icon="i-lucide-file-type"
                        :label="t('export.formats.docx')"
                        @click="handleDocxExport"
                        class="justify-start"
                    />

                    <!-- Original media file -->
                    <UButton
                        v-if="props.transcription.mediaFile"
                        block
                        variant="ghost"
                        color="neutral"
                        icon="i-lucide-file-audio"
                        :label="t('media.downloadMedia')"
                        @click="() => exportMedia(props.transcription)"
                        class="justify-start"
                    />
                </div>
            </div>
        </template>
    </UPopover>
</template>
