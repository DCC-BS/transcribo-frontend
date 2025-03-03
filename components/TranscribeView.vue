<script lang="ts" setup>
import type { TaskStatus } from '~/types/task';


const audioFile = ref<File>(); // Reference to the uploaded audio file
const audioSrc = ref<string>(''); // URL to the audio file
const initalTaskStatus = ref<TaskStatus>();

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

    console.log(response);
    initalTaskStatus.value = response;
};
</script>

<template>
    <div>
        <SplitView>
            <template #a>
                <!-- File input for audio upload -->
                <input type="file" @change="loadAudio" accept="audio/*" />
            </template>
            <template #b>
                <TaskStatusView :initalTaskStatus="initalTaskStatus" />
            </template>
        </SplitView>
    </div>
</template>


<style scoped>
/* Add styles relevant to TranscribeView here */
</style>