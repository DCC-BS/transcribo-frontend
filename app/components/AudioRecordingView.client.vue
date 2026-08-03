<script lang="ts" setup>
import type { AudioRecorder } from "#components";

const emit = defineEmits<(e: "onRecordingComplete", file: Blob) => void>();

/** Lets the parent hide the other recorder while this one is busy. */
const active = defineModel<boolean>("active", { default: false });

const { t } = useI18n();

const appLogger = useLogger();
const debugLog = (msg: string): void => {
    appLogger.debug(msg);
};

const { isReady, abandonedRecording } = useAudioSessions({
    deleteOldSessionsDaysInterval: 30,
    maxSessionsToKeep: 10,
    logger: debugLog,
});

const shouldRecord = ref(false);
const isRecording = ref(false);
const audioBlob = ref<Blob | undefined>(undefined);
const userRecording = ref(false);
const showAbandonedRecordings = ref(false);

/**
 * Takes over the finished recording and hands it to the parent.
 *
 * @param file - The recorded audio.
 * @param _ - Unused mime type reported by the recorder.
 */
function onRecordingStopped(file: Blob, _: string) {
    isRecording.value = false;
    audioBlob.value = file;
    userRecording.value = true;
    emitAudio();
}

/**
 * Emits the recorded audio, if there is any.
 */
function emitAudio(): void {
    if (audioBlob.value) {
        emit("onRecordingComplete", audioBlob.value);
    }
}

/**
 * Starts a new microphone recording.
 */
function startRecording(): void {
    shouldRecord.value = true;
    active.value = true;
}

const audioSessionActions = computed(() => [
    {
        label: "Process",
        icon: "i-lucide-play",
        handler: async (_: string, mp3Blob: Blob, __: () => Promise<void>) => {
            showAbandonedRecordings.value = false;
            emit("onRecordingComplete", mp3Blob);
        },
    },
]);
</script>

<template>
    <div class="flex flex-col justify-center items-center">
        <div
            v-if="
                abandonedRecording &&
                abandonedRecording.length > 0 &&
                !shouldRecord
            "
            class="mb-4"
        >
            <p class="mb-2">
                {{
                    t("audio.abandonedRecordings", {
                        count: abandonedRecording.length,
                    })
                }}
            </p>
            <UDrawer
                :title="t('media.recordings')"
                description="Abandoned audio recordings"
                v-model:open="showAbandonedRecordings"
            >
                <UButton
                    :label="t('audio.showAbandonedRecordings')"
                    color="neutral"
                    variant="subtle"
                    icon="i-lucide-history"
                />
                <template #content>
                    <div class="overflow-y-auto max-h-[90vh]">
                        <AudioSessionExplorer
                            ref="audioSessionExplorer"
                            :custom-actions="audioSessionActions"
                        />
                    </div>
                </template>
            </UDrawer>
        </div>
        <UButton
            v-if="!shouldRecord"
            icon="i-lucide-mic"
            @click="startRecording"
            >{{ t("pages.index.recordAudio") }}</UButton
        >
    </div>
    <div v-if="isReady && shouldRecord">
        <AudioRecorder
            :logger="debugLog"
            auto-start
            :show-result="true"
            @recording-stopped="onRecordingStopped"
        />
    </div>
</template>
