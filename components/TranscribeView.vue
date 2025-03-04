<script lang="ts" setup>
import { useTranscriptionsStore } from '~/stores/transcriptionsStore';
import type { TranscriptionFinishedCommand } from '~/types/commands';
import { Cmds } from '~/types/commands';
import type { TaskStatus } from '~/types/task';
import { v4 as uuidv4 } from 'uuid';

const audioFile = ref<File>(); // Reference to the uploaded audio file
const audioSrc = ref<string>(''); // URL to the audio file
const initalTaskStatus = ref<TaskStatus>();

const transcriptionsStore = useTranscriptionsStore();
const { registerHandler, unregisterHandler } = useCommandBus();
const route = useRoute();

onMounted(() => {
    const trascriptionId = route.query.tid as string;
    if (trascriptionId) {
        transcriptionsStore.setCurrentTranscription(trascriptionId);
    }
});

const loadAudio = async (event: Event): Promise<void> => {
    if (!event.target) {
        return;
    }

    const target = event.target as HTMLInputElement;
    if (!target.files || target.files.length === 0) {
        return;
    }

    audioFile.value = target.files[0]; // Update the reference to the uploaded audio file
    audioSrc.value = URL.createObjectURL(audioFile.value); // Create a URL for the audio file

    const formData = new FormData();
    formData.append('file', audioFile.value);

    const response = await $fetch<TaskStatus>('/api/transcribe/submit', {
        body: formData,
        method: 'POST',
    });

    initalTaskStatus.value = response;
};

onMounted(() => {
    registerHandler(
        Cmds.TranscriptionFinishedCommand,
        handleTranscriptionFinished,
    );
});

onBeforeUnmount(() => {
    unregisterHandler(
        Cmds.TranscriptionFinishedCommand,
        handleTranscriptionFinished,
    );
});

async function handleTranscriptionFinished(
    command: TranscriptionFinishedCommand,
): Promise<void> {
    if (command.result) {
        const transcription = await transcriptionsStore.addTranscriptions({
            segments: command.result.segments.map((x) => ({
                ...x,
                id: uuidv4(),
            })),
            mediaFile: audioFile.value,
            mediaFileName: audioFile.value?.name,
        });

        transcriptionsStore.setCurrentTranscription(transcription.id);
        navigateTo(`/transcribe?tid=${transcription.id}`);
    }
}
</script>

<template>
    <div>
        <SplitView>
            <template #a>
                <!-- File input for audio upload -->
                <input type="file" accept="audio/*" @change="loadAudio">
                <MediaEditor />
            </template>
            <template #b>
                <TaskStatusView :inital-task-status="initalTaskStatus" />
                <TranscriptionList />
            </template>
        </SplitView>
    </div>
</template>

<style scoped>
/* Add styles relevant to TranscribeView here */
</style>
