<script lang="ts" setup>
import type { TranscriptionFinishedCommand } from '~/types/commands';
import { Cmds } from '~/types/commands';
import { v4 as uuidv4 } from 'uuid';

const { registerHandler, unregisterHandler } = useCommandBus();
const taskStore = useTasksStore();
const transcriptionsStore = useTranscriptionsStore();

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

                console.log(isLoaded.value);
            }
            else {
                console.error('No media file found for task', taskId);
            }
        }).catch(e => {
            console.error('Failed to get task', taskId, e);
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
        const transcription = await transcriptionsStore.addTranscriptions({
            segments: command.result.segments.map((x) => ({
                ...x,
                id: uuidv4(),
            })),
            mediaFile: audioFile.value,
            mediaFileName: audioName.value,
            name: audioName.value ?? 'Untitled',
        });

        transcriptionsStore.setCurrentTranscription(transcription.id);
        taskStore.deleteTask(taskId);
        navigateTo(`/transcription/${transcription.id}`);
    }
}
</script>

<template>
    <div>
        <TaskStatusView v-if="taskId && isLoaded" :task-id="taskId" />
        <div v-else>
            <p>Loading task...</p>
        </div>

        <div v-if="errorMessage" class="error">{{ errorMessage }}</div>
    </div>
</template>