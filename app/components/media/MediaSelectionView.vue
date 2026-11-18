<script lang="ts" setup>
import {
    type AudioSession,
    isIOS,
    isStandalone,
    SessionChanged,
    SessionInUse,
} from "@dcc-bs/audio-recorder.bs.js/prelude";
import type {
    AudioRecordingView,
    MeetingRecordingView,
} from "#components";
import type { MediaSelectionData } from "~/types/mediaStepInOut";
import { formatTime } from "~/utils/time";

const emit =
    defineEmits<(e: "onMediaSelected", data: MediaSelectionData) => void>();

const { t } = useI18n();
const appLogger = useLogger();

const uploadFile = ref<File>();
const audioActive = ref(false);
const meetingActive = ref(false);
const audioView = ref<InstanceType<typeof AudioRecordingView>>();
const meetingView = ref<InstanceType<typeof MeetingRecordingView>>();

/** A recorder is in use (recording, paused or finishing). */
const recording = computed(() => audioActive.value || meetingActive.value);
/** Reloading or closing the page now would lose audio. */
const busy = computed(() =>
    Boolean(audioView.value?.busy || meetingView.value?.busy),
);
/** A recording is being joined for upload. */
const finishing = computed(() =>
    Boolean(audioView.value?.finishing || meetingView.value?.finishing),
);

// leaving inside the app pauses and stores a running recording, so the
// router only asks while one is being finished
useRecordingLeaveGuard(busy, finishing, async () => {
    const saved = await Promise.all([
        audioView.value?.saveForLeave() ?? true,
        meetingView.value?.saveForLeave() ?? true,
    ]);
    return saved.every(Boolean);
});

const {
    isReady: storedReady,
    loadFailed: storedLoadFailed,
    abandonedRecording,
    pausedRecording,
    refresh: refreshStored,
    exportSession,
    markAsStopped,
} = useStoredRecordings({
    deleteOldSessionsDaysInterval: 30,
    maxSessionsToKeep: 10,
    logger: (msg) => appLogger.debug(msg),
});

/** The paused recording, unless it is the one on screen right now. */
const waitingPausedRecording = computed(() =>
    recording.value ? undefined : pausedRecording.value,
);

/** Which recorder asked to start while a recording was paused. */
const pendingStart = ref<"audio" | "meeting">();
const transcribingPaused = ref(false);
const transcribeFailed = ref(false);
/** An abandoned recording is being marked stopped before it is handed on. */
const processingStored = ref(false);
/**
 * Stored recordings are known, so a paused one cannot be missed (not before
 * the first read, nor after a later read failed), and no stored recording
 * is being handed on.
 */
const canStart = computed(
    () =>
        storedReady.value &&
        !storedLoadFailed.value &&
        !processingStored.value &&
        !transcribingPaused.value,
);
/** The first read of the stored recordings is still running. */
const storedLoading = computed(
    () => !storedReady.value && !storedLoadFailed.value,
);

/** Why handing on an abandoned recording failed (an i18n key). */
const processError = ref<string>();
const retryingLoad = ref(false);

/** Reads the stored recordings again after a failed first read. */
async function retryLoadStored(): Promise<void> {
    retryingLoad.value = true;
    try {
        await refreshStored();
    } catch (e) {
        appLogger.error(`Reading stored recordings failed: ${e}`);
    } finally {
        retryingLoad.value = false;
    }
}

/** Safari tabs may lose stored data; set after mount to keep hydration intact. */
const showInstallHint = ref(false);
onMounted(() => {
    showInstallHint.value = isIOS() && !isStandalone();
});

/**
 * Starts a recording, or asks first if one is paused (only one may be).
 *
 * @param kind - The recorder that asked.
 */
function requestStart(kind: "audio" | "meeting"): void {
    // until stored recordings are read, a paused one would go unnoticed
    if (!canStart.value) {
        return;
    }
    if (pausedRecording.value) {
        pendingStart.value = kind;
        return;
    }
    // straight from the click: the screen picker needs the user gesture
    if (kind === "audio") {
        audioView.value?.record();
    } else {
        void meetingView.value?.record();
    }
}

/**
 * Continues a stored recording with the recorder that made it.
 *
 * @param session - The stored recording.
 */
function continueRecording(session: AudioSession): void {
    if (transcribingPaused.value) {
        return;
    }
    pendingStart.value = undefined;
    if (session.source === "meeting") {
        void meetingView.value?.record(session.id);
    } else {
        audioView.value?.record(session.id);
    }
}

/**
 * Hands the paused recording on for transcription and marks it stopped.
 *
 * @param session - The paused recording.
 */
async function transcribePaused(session: AudioSession): Promise<void> {
    if (transcribingPaused.value) {
        return;
    }
    transcribingPaused.value = true;
    transcribeFailed.value = false;
    try {
        const { mp3Blob: audio, chunkCount } = await exportSession(session.id);
        // refuses if it got new audio elsewhere since it was exported
        await markAsStopped(session.id, chunkCount);
        pendingStart.value = undefined;
        if (session.source === "meeting") {
            onMeetingRecorded(audio);
        } else {
            onRecodingComplete(audio);
        }
    } catch (e) {
        appLogger.error(`Transcribing the paused recording failed: ${e}`);
        transcribeFailed.value = true;
        // e.g. continued elsewhere meanwhile: show what is stored now
        await refreshStored().catch(() => {});
    } finally {
        transcribingPaused.value = false;
    }
}

/**
 * Hands on a stored recording picked from the abandoned recordings, once it
 * is marked stopped: if another tab added audio after the export, the
 * export is stale and nothing is handed on.
 *
 * @param sessionId - The stored recording.
 * @param audio - Its exported audio.
 * @param chunkCount - The number of chunks in `audio`.
 */
async function onStoredProcessed(
    sessionId: string,
    audio: Blob,
    chunkCount?: number,
): Promise<void> {
    processError.value = undefined;
    processingStored.value = true;
    try {
        await markAsStopped(sessionId, chunkCount);
    } catch (e) {
        appLogger.error(`Handing on a stored recording failed: ${e}`);
        processError.value =
            e instanceof SessionInUse || e instanceof SessionChanged
                ? "audio.processAbandonedConflict"
                : "audio.processAbandonedFailed";
        await refreshStored().catch(() => {});
        return;
    } finally {
        processingStored.value = false;
    }
    onRecodingComplete(audio);
}

/**
 * Start time and length of a stored recording.
 *
 * @param session - The stored recording.
 */
function describe(session: AudioSession): string {
    return t("recording.paused.description", {
        date: new Date(session.createdAt).toLocaleString(),
        duration: formatTime(session.duration ?? 0, {
            milliseconds: false,
            minimumMinuteDigits: 2,
        }),
    });
}

const askOpen = computed({
    get: () => pendingStart.value !== undefined,
    set: (open: boolean) => {
        if (!open) {
            pendingStart.value = undefined;
        }
    },
});

watch(uploadFile, () => {
    if (uploadFile.value) {
        emit("onMediaSelected", { media: uploadFile.value });
    }
});

/**
 * Wraps a microphone recording in a file and selects it for upload.
 *
 * @param audio - The recorded audio.
 */
function onRecodingComplete(audio: Blob) {
    const file = new File([audio], "Aufnahme.mp3", { type: "audio/mpeg" });
    emit("onMediaSelected", { media: file });
}

/**
 * Wraps a meeting recording in a file and selects it for upload.
 *
 * @param audio - The recorded audio.
 */
function onMeetingRecorded(audio: Blob) {
    const file = new File([audio], "Meeting.mp3", { type: "audio/mpeg" });
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
        <UCard id="upload-media-card" :ui="{ body: 'flex flex-col gap-4' }">
            <CardHead
                icon="i-lucide-upload"
                tone="primary"
                :title="t('pages.index.uploadMedia')"
                :subtitle="t('pages.index.uploadDescription')"
            />
            <UFileUpload
                v-model="uploadFile"
                :disabled="recording || transcribingPaused || processingStored"
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

        <UCard id="record-media-card" :ui="{ body: 'flex flex-col gap-4' }">
            <CardHead
                icon="i-lucide-mic"
                tone="secondary"
                :title="t('pages.index.recordAudio')"
                :subtitle="t('pages.index.recordDescription')"
            />
            <div class="grid min-h-47.5 flex-1 place-items-center">
                <!-- only one recorder at a time: the other is hidden while
                     a recording is running or paused -->
                <div class="flex flex-col items-center gap-4">
                    <UAlert
                        v-if="waitingPausedRecording"
                        id="paused-recording"
                        icon="i-lucide-pause"
                        color="warning"
                        variant="subtle"
                        :title="t('recording.paused.title')"
                        :description="describe(waitingPausedRecording)"
                        class="max-w-80"
                        :actions="[
                            {
                                label: t('recording.paused.continue'),
                                icon: 'i-lucide-play',
                                color: 'primary',
                                disabled: transcribingPaused,
                                onClick: () =>
                                    continueRecording(waitingPausedRecording!),
                            },
                            {
                                label: t('recording.paused.transcribe'),
                                color: 'neutral',
                                variant: 'subtle',
                                loading: transcribingPaused,
                                onClick: () =>
                                    transcribePaused(waitingPausedRecording!),
                            },
                        ]"
                        orientation="vertical"
                    />
                    <UAlert
                        v-if="transcribeFailed"
                        icon="i-lucide-circle-x"
                        color="error"
                        variant="subtle"
                        :description="t('recording.paused.transcribeFailed')"
                        class="max-w-80"
                        close
                        @update:open="transcribeFailed = false"
                    />
                    <UAlert
                        v-if="processError"
                        color="error"
                        variant="subtle"
                        role="alert"
                        :description="t(processError)"
                        close
                        @update:open="processError = undefined"
                    />
                    <UAlert
                        v-if="storedLoadFailed"
                        color="error"
                        variant="subtle"
                        role="alert"
                        :description="t('recording.storedLoadFailed')"
                        :actions="[
                            {
                                label: t('common.retry'),
                                loading: retryingLoad,
                                onClick: retryLoadStored,
                            },
                        ]"
                    />
                    <!-- v-show on the wrappers: the views stay mounted, so
                         their exposed state stays readable -->
                    <div v-show="!meetingActive" id="record-audio-control">
                        <AudioRecordingView
                            ref="audioView"
                            v-model:active="audioActive"
                            :abandoned-recording="abandonedRecording"
                            :paused-recording="pausedRecording"
                            :blocked="!canStart"
                            :loading="storedLoading"
                            @start-requested="requestStart('audio')"
                            @continue-requested="continueRecording"
                            @stored-processed="onStoredProcessed"
                            @stored-changed="refreshStored"
                            @on-recording-complete="onRecodingComplete"
                        />
                    </div>
                    <div v-show="!audioActive" id="record-meeting-control">
                        <MeetingRecordingView
                            ref="meetingView"
                            v-model:active="meetingActive"
                            :blocked="!canStart"
                            :loading="storedLoading"
                            @start-requested="requestStart('meeting')"
                            @stored-changed="refreshStored"
                            @on-recording-complete="onMeetingRecorded"
                        />
                    </div>
                    <p
                        v-if="showInstallHint"
                        class="max-w-80 text-center text-xs text-dimmed"
                    >
                        {{ t("recording.paused.installHint") }}
                    </p>
                    <UAlert
                        v-if="busy"
                        icon="i-lucide-triangle-alert"
                        color="warning"
                        variant="subtle"
                        :description="t('recording.inProgressWarning')"
                        class="max-w-80"
                    />
                </div>
            </div>
        </UCard>

        <UModal
            v-model:open="askOpen"
            :title="t('recording.paused.askTitle')"
            :description="t('recording.paused.askMessage')"
        >
            <template #body>
                <p v-if="pausedRecording" class="text-sm text-muted">
                    {{ describe(pausedRecording) }}
                </p>
                <!-- the alert in the card sits behind this dialog, out of
                     reach for screen readers while it is open -->
                <UAlert
                    v-if="transcribeFailed"
                    icon="i-lucide-circle-x"
                    color="error"
                    variant="subtle"
                    role="alert"
                    :description="t('recording.paused.transcribeFailed')"
                    class="mt-3"
                />
            </template>
            <template #footer>
                <div class="flex w-full flex-wrap justify-end gap-2">
                    <UButton
                        color="neutral"
                        variant="ghost"
                        @click="askOpen = false"
                    >
                        {{ t("ui.cancel") }}
                    </UButton>
                    <UButton
                        v-if="pausedRecording"
                        color="neutral"
                        variant="subtle"
                        :loading="transcribingPaused"
                        @click="transcribePaused(pausedRecording)"
                    >
                        {{ t("recording.paused.transcribe") }}
                    </UButton>
                    <UButton
                        v-if="pausedRecording"
                        color="primary"
                        icon="i-lucide-play"
                        :disabled="transcribingPaused"
                        @click="continueRecording(pausedRecording)"
                    >
                        {{ t("recording.paused.continue") }}
                    </UButton>
                </div>
            </template>
        </UModal>
    </div>
</template>
