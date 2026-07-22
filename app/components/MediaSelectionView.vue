<script lang="ts" setup>
import type { MediaSelectionData } from "~/types/mediaStepInOut";

const emit =
    defineEmits<(e: "onMediaSelected", data: MediaSelectionData) => void>();

const { t } = useI18n();

const uploadFile = ref<File>();

watch(uploadFile, () => {
    if (uploadFile.value) {
        emit("onMediaSelected", { media: uploadFile.value });
    }
});

function onRecodingComplete(audio: Blob) {
    const file = new File([audio], "Aufnahme.mp3", { type: "audio/mpeg" });
    emit("onMediaSelected", { media: file });
}

const acceptedMedia = [
    "audio/*",
    "video/*",
    "audio/aac",
    "audio/aacp",
    "audio/aiff",
    "audio/flac",
    "audio/mp4",
    "audio/mpeg",
    "audio/ogg",
    "audio/opus",
    "audio/wav",
    "audio/webm",
    "audio/x-aiff",
    "audio/x-m4a",
    "audio/x-wav",
    "video/3gpp",
    "video/3gpp2",
    "video/mp4",
    "video/mpeg",
    "video/ogg",
    "video/quicktime",
    "video/webm",
    "video/x-flv",
    "video/x-m4v",
    "video/x-matroska",
    "video/x-msvideo",
].join(",");
</script>

<template>
    <!-- two equal choice cards: upload media | record audio -->
    <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <UCard :ui="{ body: 'flex flex-col gap-4' }">
            <CardHead
                icon="i-lucide-upload"
                tone="primary"
                :title="t('pages.index.uploadMedia')"
                :subtitle="t('pages.index.uploadDescription')"
            />
            <UFileUpload
                v-model="uploadFile"
                :accept="acceptedMedia"
                icon="i-lucide-file-up"
                :label="t('pages.index.dropzoneLabel')"
                :description="t('pages.index.dropzoneFormats')"
                class="min-h-47.5 flex-1"
                :ui="{
                    base: 'rounded-2xl border-2 border-dashed border-default bg-default hover:border-primary hover:bg-(--ui-primary-soft) transition-colors',
                }"
            />
        </UCard>

        <UCard :ui="{ body: 'flex flex-col gap-4' }">
            <CardHead
                icon="i-lucide-mic"
                tone="secondary"
                :title="t('pages.index.recordAudio')"
                :subtitle="t('pages.index.recordDescription')"
            />
            <div class="grid min-h-47.5 flex-1 place-items-center">
                <AudioRecordingView
                    @on-recording-complete="onRecodingComplete"
                />
            </div>
        </UCard>
    </div>
</template>
