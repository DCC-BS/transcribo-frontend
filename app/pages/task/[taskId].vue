<script lang="ts" setup>
import { v4 as uuidv4 } from "uuid";
import type { TranscriptionFinishedCommand } from "~/types/commands";
import { Cmds } from "~/types/commands";

const { registerHandler, unregisterHandler } = useCommandBus();
const taskStore = useTasksStore();
const transcriptionsStore = useTranscriptionsStore();
const { t } = useI18n();
const logger = useLogger();

const route = useRoute();
const taskId = route.params.taskId as string;
const audioFile = ref<Blob>();
const audioName = ref<string>();

const isLoaded = ref(false);
const errorMessage = ref<string>();

onMounted(() => {
    registerHandler(
        Cmds.TranscriptionFinishedCommand,
        handleTranscriptionFinished,
    );

    taskStore
        .getTask(taskId)
        .then((task) => {
            if (task?.mediaFile) {
                audioFile.value = task.mediaFile;
                audioName.value = task.mediaFileName;
                isLoaded.value = true;
            } else {
                errorMessage.value = t("task.errors.noMediaFile");
                logger.error("No media file found for task", taskId);
            }
        })
        .catch((e) => {
            errorMessage.value = t("task.errors.failedToLoad");
            logger.error("Failed to get task", taskId, e);
        });
});

const cleanupTimeout = ref<NodeJS.Timeout>();

onUnmounted(() => {
    if (cleanupTimeout.value) {
        clearTimeout(cleanupTimeout.value);
    }
    unregisterHandler(
        Cmds.TranscriptionFinishedCommand,
        handleTranscriptionFinished,
    );
});

async function handleTranscriptionFinished(
    command: TranscriptionFinishedCommand,
): Promise<void> {
    if (command.status.status === "completed" && command.result) {
        try {
            const transcription = await transcriptionsStore.addTranscription({
                segments: command.result.segments.map((x) => ({
                    ...x,
                    text: x.text?.trim() ?? "",
                    speaker:
                        x.speaker?.trim().toUpperCase() ??
                        t("transcription.noSpeaker"),
                    id: uuidv4(),
                })),
                mediaFile: audioFile.value,
                mediaFileName: audioName.value,
                name: audioName.value ?? t("transcription.untitled"),
            });

            await navigateTo(`/transcription/${transcription.id}`);
            taskStore.deleteTask(taskId);
        } catch (error) {
            logger.error("Failed to create transcription:", error);
            errorMessage.value = t("task.errors.failedToCreateTranscription");
        }
    } else if (
        command.status.status === "failed" ||
        command.status.status === "cancelled"
    ) {
        errorMessage.value = t("task.errors.transcriptionFailed");
        // Clean up the failed task after a delay to allow user to see the error
        cleanupTimeout.value = setTimeout(() => {
            taskStore.deleteTask(taskId);
        }, 5000);
    } else {
        errorMessage.value = t("task.errors.noResult");
    }
}
</script>

<template>
    <UContainer>
        <TaskStatusView v-if="taskId && isLoaded" :task-id="taskId" />
        <UAlert
            v-if="errorMessage"
            color="error"
            :title="errorMessage"
            icon="i-heroicons-exclamation-circle"
            type="error"
        />
    </UContainer>
</template>
