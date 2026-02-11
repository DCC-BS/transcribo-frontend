<script lang="ts" setup>
import { motion } from "motion-v";
import type { MediaProgress } from "~/types/mediaProgress";

const taskStore = useTasksStore();
const { t } = useI18n();
const logger = useLogger();
const { pollTaskStatus, applyTaskResult } = useTaskListener();

const route = useRoute();

const taskId = route.params.taskId as string;

const mediaFile = ref<Blob>();
const mediaFileName = ref<string>();

const errorMessage = ref<string>();

const progression = ref<[MediaProgress]>([
    {
        icon: "i-lucide-cpu",
        message: "..",
        progress: 0
    }]
);

onMounted(() => {
    taskStore
        .getTask(taskId)
        .then((task) => {
            if (!task) {
                logger.error(taskId, "Task not found");
                errorMessage.value = t("task.errors.TaskNotFound");
                return;
            }

            if (!task.mediaFile) {
                errorMessage.value = t("task.errors.noMediaFile");
                logger.error(taskId, "No media file found for task");
                return;
            }

            mediaFile.value = task.mediaFile;
            mediaFileName.value = task.mediaFileName;

            pollTaskStatus(
                taskId,
                ({ message, progress }) => {
                    progression.value[0].message = message;
                    progression.value[0].progress = progress;
                }, async (transcription) => {
                    try {
                        if (!task.mediaFile || !task.mediaFileName) {
                            throw new Error("Task has no media file");
                        }

                        await applyTaskResult(taskId, transcription, task.mediaFile, task.mediaFileName);
                    } catch (e) {
                        logger.error(e, "Failed to finihs the task");
                        errorMessage.value = t("task.errors.failedToCreateTranscription");
                    }
                });
        })
        .catch((e) => {
            errorMessage.value = t("task.errors.failedToLoad");
            logger.error({ taskId, error: e }, "Failed to get task");
        });
});
</script>

<template>
    <div class="flex items-center justify-center">
        <MediaProgressView v-if="mediaFile && mediaFileName" :media="mediaFile" :media-name="mediaFileName"
            :progress-steps="progression" />

        <!-- Error Message Display -->
        <motion.div v-if="errorMessage" :animate="{ opacity: 1, y: 0 }" :initial="{ opacity: 0, y: 20 }"
            :transition="{ type: 'spring', stiffness: 200, damping: 20 }" class="mt-8 max-w-md w-full">
            <UAlert icon="i-lucide-alert-circle" color="error" title="error" :description="errorMessage"></UAlert>
        </motion.div>
    </div>
</template>
