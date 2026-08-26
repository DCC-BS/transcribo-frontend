<script lang="ts" setup>
import { isApiError } from "@dcc-bs/communication.bs.js";
import { motion } from "motion-v";
import type { MediaProgress } from "~/types/mediaProgress";
import type { MediaConfigureData } from "~/types/mediaStepInOut";
import { type TaskStatus, TaskStatusSchema } from "~/types/storedTasks";
import { isVideoFile } from "~/utils/videoUtils";

const input = defineModel<MediaConfigureData>("input", { required: true });

const errorMessage = ref<string>();

const { apiFetch } = useApi();
const { extractAudio } = useAudioExtract();
const { t } = useI18n();

const logger = useLogger();
const { addTask, deleteTask } = useTasks();
const { createProgressSteps, pollTaskStatus, applyTaskResult } =
    useTaskListener();

const progressions = ref(createProgressSteps(input.value.media));

onMounted(() => {
    processMedia();
});

/**
 * Runs the whole upload flow — preprocess, upload, transcribe, post-process — reporting each step's progress and surfacing failures as a retryable error.
 */
async function processMedia() {
    try {
        errorMessage.value = undefined;
        // Fresh objects on every (re)start so a retry never inherits the
        // finished state of the previous attempt.
        progressions.value = createProgressSteps(input.value.media);
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

/**
 * Extracts mono audio from the selected media.
 *
 * @param progress - Progress step to update while extracting.
 * @returns The extracted audio as an upload-ready file.
 */
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

/**
 * Uploads the processed audio and creates the transcription task.
 *
 * @param processedFile - The audio to upload.
 * @param storedMedia - The original media kept with the task.
 * @param progress - Progress step to update while uploading.
 * @returns The created task's status.
 */
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

/**
 * Waits for the task to finish and stores the resulting transcription.
 *
 * @param task - The submitted task.
 * @param storedMedia - The original media kept with the transcription.
 * @param transcriptionProgress - Progress step for the transcription itself.
 * @param postProcessingProgress - Progress step for the LLM post-processing.
 */
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
    <div class="flex w-full flex-col items-center justify-center">
        <div v-if="!errorMessage" class="w-full">
            <MediaProgressView :media="input.media" :media-name="input.media.name" :progress-steps="progressions" />
        </div>

        <!-- Error Message Display -->
        <motion.div v-if="errorMessage" :animate="{ opacity: 1, y: 0 }" :initial="{ opacity: 0, y: 20 }"
            :transition="{ type: 'spring', stiffness: 200, damping: 20 }"
            class="mt-8 flex w-full flex-col justify-center gap-2">
            <UAlert icon="i-lucide-alert-circle" color="error" :title="t('upload.error')" :description="errorMessage">
            </UAlert>

            <UButton @click="processMedia()" icon="i-lucide-rotate-ccw" color="secondary" variant="subtle">{{
                t("common.retry") }}
            </UButton>
        </motion.div>
    </div>
</template>
