<script lang="ts" setup>
import { motion } from "motion-v";
import { formatTime } from "~/utils/time";

const emit = defineEmits<(e: "onRecordingComplete", file: Blob) => void>();

/** Lets the parent hide the other recorder while this one is busy. */
const active = defineModel<boolean>("active", { default: false });

const { t } = useI18n();
const {
    isSupported,
    unsupported,
    isRecording,
    isStarting,
    elapsedSeconds,
    stream,
    error,
    start,
    stop,
} = useMeetingRecorder();

// the screen picker counts as busy too, not just the running recording
watchEffect(() => {
    active.value = isRecording.value || isStarting.value;
});

async function record(): Promise<void> {
    const audio = await start();
    if (audio) {
        emit("onRecordingComplete", audio);
    }
}

// the button's own hint doubles as the reason it is disabled
const hint = computed(() =>
    unsupported.value
        ? t(`meeting.unsupported.${unsupported.value}`)
        : t("meeting.hint"),
);
</script>

<template>
    <div class="flex flex-col items-center gap-2">
        <template v-if="!isRecording">
            <UButton
                icon="i-lucide-monitor-speaker"
                color="neutral"
                variant="subtle"
                :loading="isStarting"
                :disabled="!isSupported"
                @click="record"
            >
                {{ t("meeting.record") }}
            </UButton>
            <p
                class="max-w-64 text-center text-xs"
                :class="isSupported ? 'text-muted' : 'text-dimmed'"
            >
                {{ hint }}
            </p>
            <!-- sharing a screen to capture sound looks alarming; say plainly
                 that nothing visual is kept -->
            <p
                v-if="isSupported"
                class="max-w-64 text-center text-xs text-dimmed"
            >
                {{ t("meeting.audioOnly") }}
            </p>
        </template>

        <!-- mirrors the microphone recorder: pulsing state, clock, levels -->
        <div v-else class="space-y-6 text-center">
            <div class="flex items-center justify-center gap-3">
                <motion.div
                    class="size-4 rounded-full bg-red-500"
                    :animate="{ scale: [1, 1.2, 1], opacity: [1, 0.7, 1] }"
                    :transition="{
                        duration: 1.5,
                        repeat: Number.POSITIVE_INFINITY,
                    }"
                />
                <span class="text-lg font-medium text-red-600 dark:text-red-400">
                    {{ t("audio-recorder.audio.recordingInProgress") }}
                </span>
            </div>
            <p class="mx-auto max-w-64 text-xs text-dimmed">
                {{ t("meeting.audioOnly") }}
            </p>

            <div
                class="rounded-2xl border border-slate-200/30 bg-slate-900/5 p-6 dark:border-slate-700/30 dark:bg-white/5"
            >
                <div
                    class="mb-2 font-mono text-4xl font-bold text-slate-800 dark:text-slate-200"
                >
                    {{
                        formatTime(elapsedSeconds, {
                            milliseconds: false,
                            minimumMinuteDigits: 2,
                        })
                    }}
                </div>
                <p class="text-sm text-slate-600 dark:text-slate-400">
                    {{ t("audio-recorder.audio.recordingTime") }}
                </p>
            </div>

            <div
                class="rounded-2xl border border-slate-200/30 bg-slate-900/5 p-4 dark:border-slate-700/30 dark:bg-white/5"
            >
                <AudioVisualizer :stream="stream" :is-recording="isRecording" />
            </div>

            <UButton
                color="secondary"
                variant="link"
                icon="i-lucide-square"
                @click="stop"
            >
                {{ t("audio-recorder.audio.stopRecording") }}
            </UButton>
        </div>

        <p v-if="error" class="max-w-64 text-center text-xs text-error">
            {{ t(`meeting.errors.${error}`) }}
        </p>
    </div>
</template>
