<script lang="ts" setup>
import type { MediaSelectionData } from '~/types/mediaStepInOut';

const emit = defineEmits<(e: "onMediaSelected", data: MediaSelectionData) => void>();

const logger = useLogger();
const debugLog = (msg: string): void => {
    logger.debug(msg);
};

const uploadFile = ref<File>();

watch(uploadFile, () => {
    if (uploadFile.value) {
        emit("onMediaSelected", { media: uploadFile.value })
    }
});

function onRecodingComplete(audio: Blob) {
    const file = new File([audio], "recoding.mp3");
    emit("onMediaSelected", { media: file });
}
</script>

<template>
    <UFileUpload accept="audio/*, video/*" icon="i-lucide-file-up" v-model="uploadFile"
        label="Audio- oder Videodatei hierher ziehen oder klicken zum Hochladen"></UFileUpload>

    <USeparator label="Oder" />

    <AudioRecordingView @on-recording-complete="onRecodingComplete" />
</template>
