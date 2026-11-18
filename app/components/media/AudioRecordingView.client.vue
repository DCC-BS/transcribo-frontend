<script lang="ts" setup>
import type { AudioSession } from "@dcc-bs/audio-recorder.bs.js/prelude";
import type { AudioRecorder } from "#components";

const props = defineProps<{
    /** Stored recordings no tab is recording right now. */
    abandonedRecording?: AudioSession[];
    /** The paused recording, if any: only it may be continued. */
    pausedRecording?: AudioSession;
}>();

const emit = defineEmits<{
    (e: "onRecordingComplete", file: Blob): void;
    /** The record button was pressed; the parent decides via `record`. */
    (e: "startRequested"): void;
    /** "Continue recording" was chosen for a stored recording. */
    (e: "continueRequested", session: AudioSession): void;
    /** A stored recording was handed on for processing. */
    (e: "storedProcessed", sessionId: string): void;
    /** A recording was paused or stopped: stored recordings changed. */
    (e: "storedChanged"): void;
}>();

/** Lets the parent hide the other recorder while this one is in use. */
const active = defineModel<boolean>("active", { default: false });

const { t } = useI18n();

const appLogger = useLogger();
const debugLog = (msg: string): void => {
    appLogger.debug(msg);
};

const shouldRecord = ref(false);
/** The stored session the recorder continues, if any. */
const resumeId = ref<string>();
const showAbandonedRecordings = ref(false);
const recorder = ref<InstanceType<typeof AudioRecorder>>();

// in use while the recorder records, holds a pause or joins chunks: a
// start that fails (no microphone, permission denied) must not leave the
// parent believing a recording is running
watchEffect(() => {
    active.value = Boolean(
        recorder.value?.isRecording ||
            recorder.value?.isProcessing ||
            recorder.value?.isPaused,
    );
});

/**
 * Takes over the finished recording and hands it to the parent.
 *
 * @param file - The recorded audio.
 * @param _ - Unused object URL reported by the recorder.
 */
function onRecordingStopped(file: Blob, _: string) {
    emit("storedChanged");
    emit("onRecordingComplete", file);
}

/**
 * Starts the microphone recorder.
 *
 * @param sessionId - A stored session to continue instead of a new one.
 */
function record(sessionId?: string): void {
    showAbandonedRecordings.value = false;
    resumeId.value = sessionId;
    shouldRecord.value = true;
}

defineExpose({
    /** Reloading or closing the page now would lose audio. */
    busy: computed(() => Boolean(recorder.value?.isBusy)),
    /** The recording is being joined for upload. */
    finishing: computed(() => Boolean(recorder.value?.isProcessing)),
    record,
});

/** Stored recordings besides the paused one, which has its own banner. */
const otherStoredCount = computed(
    () =>
        props.abandonedRecording?.filter(
            (s) => s.id !== props.pausedRecording?.id,
        ).length ?? 0,
);

const audioSessionActions = computed(() => [
    {
        label: t("audio.continueAbandoned"),
        icon: "i-lucide-mic",
        color: "secondary",
        // continuing only needs the id, not the joined audio
        needsAudio: false,
        // only one recording may be paused: with one waiting, only it can
        // be continued
        visible: (session: AudioSession) =>
            !props.pausedRecording || props.pausedRecording.id === session.id,
        handler: (sessionId: string) => {
            const session = props.abandonedRecording?.find(
                (s) => s.id === sessionId,
            );
            if (session) {
                showAbandonedRecordings.value = false;
                emit("continueRequested", session);
            }
        },
    },
    {
        label: t("audio.processAbandoned"),
        icon: "i-lucide-play",
        handler: async (sessionId: string, mp3Blob: Blob) => {
            showAbandonedRecordings.value = false;
            emit("storedProcessed", sessionId);
            emit("onRecordingComplete", mp3Blob);
        },
    },
]);
</script>

<template>
    <div class="flex flex-col justify-center items-center">
        <div
            v-if="otherStoredCount > 0 && !shouldRecord"
            class="mb-4"
        >
            <p class="mb-2">
                {{
                    t("audio.abandonedRecordings", {
                        count: otherStoredCount,
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
            @click="emit('startRequested')"
            >{{ t("pages.index.recordAudio") }}</UButton
        >
    </div>
    <div v-if="shouldRecord">
        <AudioRecorder
            ref="recorder"
            :key="resumeId ?? 'new'"
            :logger="debugLog"
            auto-start
            :resume-session-id="resumeId"
            session-source="microphone"
            :show-result="true"
            @recording-paused="emit('storedChanged')"
            @recording-stopped="onRecordingStopped"
        />
    </div>
</template>
