<script lang="ts" setup>
import type { TranscriptionFinishedCommand } from '~/types/commands';
import { Cmds } from '~/types/commands';
import { v4 as uuidv4 } from 'uuid';

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

    taskStore.getTask(taskId)
        .then(t => {
            if (t?.mediaFile) {
                audioFile.value = t.mediaFile;
                audioName.value = t.mediaFileName;
                isLoaded.value = true;
            }
            else {
                errorMessage.value = t('task.errors.noMediaFile');
                logger.error('No media file found for task', taskId);
            }
        }).catch(e => {
            errorMessage.value = t('task.errors.failedToLoad');
            logger.error('Failed to get task', taskId, e);
        });
});

onUnmounted(() => {
    unregisterHandler(
        Cmds.TranscriptionFinishedCommand,
        handleTranscriptionFinished,
    );
});

async function handleTranscriptionFinished(command: TranscriptionFinishedCommand): Promise<void> {
    if (command.result) {
        const transcription = await transcriptionsStore.addTranscription({
            segments: command.result.segments.map((x) => ({
                ...x,
                text: x.text?.trim() ?? '',
                speaker: x.speaker?.trim().toUpperCase() ?? t('transcription.noSpeaker'),
                id: uuidv4(),
            })),
            mediaFile: audioFile.value,
            mediaFileName: audioName.value,
            name: audioName.value ?? t('transcription.untitled'),
        });

        taskStore.deleteTask(taskId);
        navigateTo(`/transcription/${transcription.id}`);
    }
}
</script>

<template>
    <UContainer>
        <TaskStatusView v-if="taskId && isLoaded" :task-id="taskId" />
        <UAlert
v-if="errorMessage" color="error" :title="errorMessage" icon="i-heroicons-exclamation-circle"
            type="error"/>
    </UContainer>
</template>