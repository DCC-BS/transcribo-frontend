<script lang="ts" setup>
import { apiFetch, isApiError } from "@dcc-bs/communication.bs.js";
import { motion } from "motion-v";
import type { MediaProgress } from "~/types/mediaProgress";
import type { MediaConfigureData } from "~/types/mediaStepInOut";
import { type TaskStatus, TaskStatusSchema } from "~/types/storedTasks";
import { isVideoFile } from "~/utils/videoUtils";

const input = defineModel<MediaConfigureData>("input", { required: true });

const errorMessage = ref<string>();

const { extractAudio } = useAudioExtract();
const { t } = useI18n();

type ProgressSteps = [MediaProgress, MediaProgress, MediaProgress, MediaProgress];

// Fresh objects on every (re)start so a retry never inherits the finished
// state of the previous attempt.
function createStartProgression(): ProgressSteps {
    return [
        {
            icon: "i-lucide-file",
            message: isVideoFile(input.value.media)
                ? t("upload.extractingAudio")
                : t("upload.preparingAudio"),
            progress: 0,
        },
        {
            icon: "i-lucide-upload-cloud",
            message: t("upload.uploadingMedia"),
            progress: 0,
        },
        {
            icon: "i-lucide-cpu",
            message: t("task.status.pending"),
            progress: 0,
        },
        {
            icon: "i-lucide-sparkles",
            message: t("task.postProcessing"),
            progress: 0,
        },
    ];
}

const progressions = ref<ProgressSteps>(createStartProgression());
const logger = useLogger();
const { addTask, deleteTask } = useTasks();
const { pollTaskStatus, applyTaskResult } = useTaskListener();

onMounted(() => {
    processMedia();
});

async function processMedia() {
    try {
        errorMessage.value = undefined;
        progressions.value = createStartProgression();
        // The re-encode only shrinks the upload; playback and export always
        // use the original file.
        const processedFile = await preprocessMedia(progressions.value[0]);
        const storedMedia = input.value.media;
        const task = await uploadFile(
            processedFile,
            storedMedia,
            progressions.value[1],
        );
        await waitForTask(
            task,
            storedMedia,
            progressions.value[2],
            progressions.value[3],
        );
    } catch (e) {
        logger.error(e, "Failed to finish the task");
        if (!errorMessage.value) {
            errorMessage.value = `${t(
                "task.errors.failedToCreateTranscription",
            )} ${e}`;
        }
    }
}

async function preprocessMedia(progress: MediaProgress) {
    const isVideo = isVideoFile(input.value.media);

    const { audioBlob, audioFileName } = await extractAudio(
        input.value.media,
        (percent) => {
            progress.progress = percent;
        },
    );

    const audioFile = new File([audioBlob], audioFileName, {
        type: audioBlob.type,
    });

    progress.message = isVideo
        ? t("task.preprocessing.extractedAudio")
        : t("task.preprocessing.audioPreprocessed");
    progress.progress = 100;

    return audioFile;
}

async function uploadFile(
    processedFile: File,
    storedMedia: File,
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

    deleteTask(input.value.task.id);
    addTask(response, storedMedia, storedMedia.name, storedMedia.type);

    progress.progress = 100;
    return response;
}

async function waitForTask(
    task: TaskStatus,
    storedMedia: File,
    transcriptionProgress: MediaProgress,
    postProcessingProgress: MediaProgress,
) {
    await pollTaskStatus(
        task.task_id,
        // on progress
        ({ message, progress }) => {
            // Messages arrive already translated from useTaskListener.
            transcriptionProgress.message = message;
            transcriptionProgress.progress = progress;
        },
        // on complete
        async (transcription) => {
            try {
                await applyTaskResult(
                    task.task_id,
                    transcription,
                    storedMedia,
                    storedMedia.name,
                );
            } catch (e) {
                logger.error(e, "Failed to finish the task");
                errorMessage.value = t(
                    "task.errors.failedToCreateTranscription",
                );
            }
        },
        // on post-processing (own step: the LLM pass after transcription)
        ({ message, progress }) => {
            postProcessingProgress.message = message;
            postProcessingProgress.progress = progress;
        },
    );
}
</script>

<template>
    <div class="flex flex-col items-center justify-center py-12 px-6 max-w-[95vw]">
        <div v-if="!errorMessage">
            <!-- Media File Card with Upload Animation -->
            <div class="relative w-full max-w-lg">
                <MediaProgressView :media="input.media" :media-name="input.media.name" :progress-steps="progressions" />
            </div>
        </div>

        <!-- Error Message Display -->
        <motion.div v-if="errorMessage" :animate="{ opacity: 1, y: 0 }" :initial="{ opacity: 0, y: 20 }"
            :transition="{ type: 'spring', stiffness: 200, damping: 20 }"
            class="mt-8 max-w-md w-full flex flex-col gap-2 justify-center">
            <UAlert icon="i-lucide-alert-circle" color="error" :title="t('upload.error')" :description="errorMessage">
            </UAlert>

            <UButton @click="processMedia()" icon="i-lucide-rotate-ccw" color="secondary" variant="subtle">{{
                t("common.retry") }}
            </UButton>
        </motion.div>
    </div>
</template>
