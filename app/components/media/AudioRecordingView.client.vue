<script lang="ts" setup>
import {
    type AudioSession,
    isResumable,
} from "@dcc-bs/audio-recorder.bs.js/prelude";
import type { AudioRecorder } from "#components";

const props = defineProps<{
    abandonedRecording?: AudioSession[];
    pausedRecording?: AudioSession;
}>();

const emit = defineEmits<{
    (e: "onRecordingComplete", file: Blob): void;
    /** The record button was pressed; the parent decides via `record`. */
    (e: "startRequested"): void;
    (e: "continueRequested", session: AudioSession): void;
    /** A stored recording to hand on once it is marked stopped. */
    (
        e: "storedProcessed",
        sessionId: string,
        audio: Blob,
        chunkCount?: number,
    ): void;
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
const resumeId = ref<string>();
/** Why the last attempt to continue a stored recording failed. */
const resumeError = ref<string>();
const showAbandonedRecordings = ref(false);
const recorder = ref<InstanceType<typeof AudioRecorder>>();

// a failed start only ends isStarting, so both recorders are offered again
watchEffect(() => {
    active.value = Boolean(
        recorder.value?.isStarting ||
            recorder.value?.isRecording ||
            recorder.value?.isProcessing ||
            recorder.value?.isPaused,
    );
});

// a stored recording that could not be continued (e.g. finished in another
// tab meanwhile): offer the normal controls and the current list again
watch(
    () => recorder.value?.isStarting,
    (starting, wasStarting) => {
        const r = recorder.value;
        if (
            wasStarting &&
            !starting &&
            resumeId.value &&
            r &&
            !r.isRecording &&
            !r.isPaused &&
            !r.isProcessing
        ) {
            resumeError.value = r.error || undefined;
            shouldRecord.value = false;
            resumeId.value = undefined;
            emit("storedChanged");
        }
    },
);

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
    resumeError.value = undefined;
    resumeId.value = sessionId;
    shouldRecord.value = true;
}

defineExpose({
    /** Reloading or closing the page now would lose audio. */
    busy: computed(() => Boolean(recorder.value?.isBusy)),
    /** The recording is being joined for upload. */
    finishing: computed(() => Boolean(recorder.value?.isProcessing)),
    record,
    /** Pauses and stores the recording; false if part of it was not stored. */
    saveForLeave: async (): Promise<boolean> => {
        const r = recorder.value;
        if (r?.isRecording) {
            await r.pauseRecording();
        }
        return !r?.pauseSaveFailed;
    },
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
        needsAudio: false,
        // only the paused recording, if there is one; never a stopped backup
        visible: (session: AudioSession) =>
            isResumable(session) &&
            (!props.pausedRecording ||
                props.pausedRecording.id === session.id),
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
        label: t("audio.deleteAbandoned"),
        icon: "i-lucide-trash-2",
        color: "error",
        needsAudio: false,
        // the built-in delete would not tell the parent, which may still
        // offer the deleted recording as paused
        handler: async (_sessionId: string, _mp3: Blob, deleteSession: () => Promise<void>) => {
            try {
                await deleteSession();
            } finally {
                emit("storedChanged");
            }
        },
    },
    {
        label: t("audio.processAbandoned"),
        icon: "i-lucide-play",
        handler: async (
            sessionId: string,
            mp3Blob: Blob,
            _deleteSession: () => Promise<void>,
            chunkCount?: number,
        ) => {
            showAbandonedRecordings.value = false;
            emit("storedProcessed", sessionId, mp3Blob, chunkCount);
        },
    },
]);
</script>

<template>
    <div class="flex flex-col justify-center items-center">
        <UAlert
            v-if="resumeError && !shouldRecord"
            color="error"
            variant="subtle"
            role="alert"
            class="mb-4"
            :description="resumeError"
            close
            @update:open="resumeError = undefined"
        />
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
                            :show-delete-button="false"
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
