<script lang="ts" setup>
import { apiFetch, isApiError } from "@dcc-bs/communication.bs.js";
import { motion } from "motion-v";
import type { MediaProgress } from "~/types/mediaProgress";
import type { MediaConfigureData } from "~/types/mediaStepInOut";
import { type TaskStatus, TaskStatusSchema } from "~/types/task";
import { isVideoFile } from "~/utils/videoUtils";

const input = defineModel<MediaConfigureData>("input", { required: true });

const errorMessage = ref<string>();

const progressions = ref<[MediaProgress, MediaProgress, MediaProgress]>([
    {
        icon: "i-lucide-file",
        message: "...",
        progress: 0,
    },
    {
        icon: "i-lucide-upload-cloud",
        message: "...",
        progress: 0,
    },
    {
        icon: "i-lucide-cpu",
        message: "...",
        progress: 0,
    },
]);

const { extractAudioFromVideo } = useAudioExtract();
const { t } = useI18n();
const logger = useLogger();
const { addTask } = useTasks();
const { pollTaskStatus, applyTaskResult } = useTaskListener();

onMounted(() => {
    processMedia();
});

async function processMedia() {
    const processedFile = await preprocessMedia(progressions.value[0]);
    const task = await uploadFile(processedFile, progressions.value[1]);
    await waitForTask(task, progressions.value[2]);
}

// extract the audio form when video file; else do nothing
async function preprocessMedia(progress: MediaProgress) {
    if (isVideoFile(input.value.media)) {
        const { audioBlob, audioFileName } = await extractAudioFromVideo(
            input.value.media,
        );

        const audioFile = new File([audioBlob], audioFileName, {
            type: audioBlob.type,
        });

        progress.message = "Extracted Audio form Video";
        progress.progress = 100;

        return audioFile;
    }

    progress.message = "audio preprocessed";
    progress.progress = 100;
    // on audio do nothin
    return input.value.media;
}

async function uploadFile(
    processedFile: File,
    progress: MediaProgress,
): Promise<TaskStatus> {
    progress.message = t("upload.uploadingMedia");
    progress.progress = null;

    const formData = new FormData();
    formData.append("audio_file", processedFile);

    if (input.value.language !== "auto") {
        formData.append("language", input.value.language);
    }

    if (input.value.numSpeaker !== "auto") {
        formData.append("num_speakers", input.value.numSpeaker);
    }

    const response = await apiFetch("/api/transcribe/submit", {
        schema: TaskStatusSchema,
        body: formData,
        method: "POST",
    });

    if (isApiError(response)) {
        logger.error(response, response.debugMessage);
        errorMessage.value = t(`errors.${response.errorId}`);
        throw response;
    }

    progress.progress = 90;
    await addTask(
        response,
        input.value.media,
        input.value.media.name,
    );

    progress.progress = 100;
    return response;
}

async function waitForTask(task: TaskStatus, mediaProgress: MediaProgress) {
    await pollTaskStatus(
        task.task_id,
        // on progress
        ({ message, progress }) => {
            mediaProgress.message = message;
            mediaProgress.progress = progress;
        },
        // on complete
        async (transcription) => {
            try {
                await applyTaskResult(
                    task.task_id,
                    transcription,
                    input.value.media,
                    input.value.media.name,
                );
            } catch (e) {
                logger.error(e, "Failed to finihs the task");
                errorMessage.value = t(
                    "task.errors.failedToCreateTranscription",
                );
            }
        },
    );
}
</script>

<template>
    <div class="flex flex-col items-center justify-center py-12 px-6">
        <div v-if="!errorMessage">
            <!-- Media File Card with Upload Animation -->
            <div class="relative w-full max-w-lg">
                <MediaProgressView :media="input.media" :mediaName="input.media.name" :progressSteps="progressions" />
            </div>
        </div>

        <!-- Error Message Display -->
        <motion.div v-if="errorMessage" :animate="{ opacity: 1, y: 0 }" :initial="{ opacity: 0, y: 20 }"
            :transition="{ type: 'spring', stiffness: 200, damping: 20 }" class="mt-8 max-w-md w-full">
            <UAlert icon="i-lucide-alert-circle" color="error" title="error" :description="errorMessage"></UAlert>
        </motion.div>
    </div>
</template>
