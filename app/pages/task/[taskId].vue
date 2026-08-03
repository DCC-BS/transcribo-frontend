<script lang="ts" setup>
import { motion } from "motion-v";
import { useTasks } from "~/composables/useTasks";

const { getTask } = useTasks();
const { t } = useI18n();
const logger = useLogger();
const { createProgressSteps, pollTaskStatus, applyTaskResult } =
    useTaskListener();

const route = useRoute();

const taskId = route.params.taskId as string;

const mediaFile = ref<Blob>();
const mediaFileName = ref<string>();

const errorMessage = ref<string>();

const progressions = ref<ReturnType<typeof createProgressSteps>>();

onMounted(async () => {
    try {
        const task = await getTask(taskId);

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

        // Same steps as the upload flow; preprocessing and upload are
        // already behind us when a task is resumed.
        progressions.value = createProgressSteps(task.mediaFile);
        const steps = progressions.value;
        steps[0].progress = 100;
        steps[1].progress = 100;

        pollTaskStatus(
            taskId,
            ({ message, progress }) => {
                steps[2].message = message;
                steps[2].progress = progress;
            },
            async (transcription) => {
                try {
                    if (!task.mediaFile || !task.mediaFileName) {
                        throw new Error("Task has no media file");
                    }

                    await applyTaskResult(
                        taskId,
                        transcription,
                        task.mediaFile,
                        task.mediaFileName,
                    );
                } catch (e) {
                    logger.error(e, "Failed to finish the task");
                    errorMessage.value = t(
                        "task.errors.failedToCreateTranscription",
                    );
                }
            },
            ({ message, progress }) => {
                steps[3].message = message;
                steps[3].progress = progress;
            },
        );
    } catch (e) {
        errorMessage.value = t("task.errors.failedToLoad");
        logger.error({ taskId, error: e }, "Failed to get task");
    }
});
</script>

<template>
    <div class="flex grow items-start justify-center overflow-y-auto px-5 py-10">
        <div class="w-full max-w-lg">
            <MediaProgressView
                v-if="mediaFile && mediaFileName && progressions"
                :media="mediaFile"
                :media-name="mediaFileName"
                :progress-steps="progressions"
            />

            <motion.div
                v-if="errorMessage"
                :animate="{ opacity: 1, y: 0 }"
                :initial="{ opacity: 0, y: 20 }"
                :transition="{ type: 'spring', stiffness: 200, damping: 20 }"
                class="mt-8 w-full"
            >
                <UAlert
                    icon="i-lucide-alert-circle"
                    color="error"
                    :title="t('upload.error')"
                    :description="errorMessage"
                />
            </motion.div>
        </div>
    </div>
</template>
