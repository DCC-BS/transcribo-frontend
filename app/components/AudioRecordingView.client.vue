<script lang="ts" setup>
import type { AudioRecorder } from "#components";

const emit = defineEmits<(e: "onRecordingComplete", file: Blob) => void>();

const { t } = useI18n();

const appLogger = useLogger();
const debugLog = (msg: string): void => {
    appLogger.debug(msg);
};

const { isReady, abandonedRecording } =
    useAudioSessions({
        deleteOldSessionsDaysInterval: 30,
        maxSessionsToKeep: 10,
        logger: debugLog,
    });

const audioRecorder = ref<typeof AudioRecorder>();
const shouldRecord = ref(false);
const isRecording = ref(false);
const audioBlob = ref<Blob | undefined>(undefined);
const userRecording = ref(false);

function onRecordingStopped(file: Blob, _: string) {
    isRecording.value = false;
    audioBlob.value = file;
    userRecording.value = true;
}

function emitAudio(): void {
    if (audioBlob.value) {
        emit("onRecordingComplete", audioBlob.value);
    }
}

const audioSessionActions = computed(() => [
    {
        label: "Process",
        icon: "i-lucide-play",
        handler: async (_: string, mp3Blob: Blob, __: () => Promise<void>) => {
            emit("onRecordingComplete", mp3Blob);
        },
    },
]);
</script>

<template>
    <div class="flex flex-col justify-center items-center">
        <div v-if="abandonedRecording && abandonedRecording.length > 0 && !shouldRecord" class="mb-4">
            <p class="mb-2">{{ t("audio.abandonedRecordings", { count: abandonedRecording.length }) }}</p>
            <UDrawer title="Audio Recordings" description="Abondend audio recodings">
                <UButton :label="t('audio.showAbandonedRecordings')" color="neutral" variant="subtle"
                    icon="i-lucide-history" />
                <template #content>
                    <AudioSessionExplorer ref="audioSessionExplorer" :custom-actions="audioSessionActions" />
                </template>
            </UDrawer>
        </div>
        <UButton v-if="!shouldRecord" icon="i-lucide-mic" @click="shouldRecord = true">{{
            t("pages.index.recordAudio") }}</UButton>
    </div>
    <div v-if="isReady && shouldRecord">
        <AudioRecorder ref="audioRecorder" :logger="debugLog" auto-start :show-result="true"
            @recording-stopped="onRecordingStopped" />
        <div v-if="audioBlob" class="flex flex-col justify-center items-center mt-4">
            <UButton @click="emitAudio">{{ t("audioRecorder.useRecording") }}</UButton>
        </div>
    </div>
</template>