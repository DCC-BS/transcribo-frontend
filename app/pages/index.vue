<script lang="ts" setup>
import type { UploadMediaView } from "#components";
import type { TaskStatus } from "~/types/task";

const tasksStore = useTasksStore();
const { t } = useI18n();
const { $api } = useNuxtApp();

const uploadMediaView = ref<typeof UploadMediaView>();
const { getClientId } = useClientId();

// UUID test state
const isRecordingDrawerOpen = ref(false);
const isTranscribing = ref(false);


async function handleUpload(status: TaskStatus, file: File): Promise<void> {
    const storedTask = await tasksStore.addTask(status, file, file.name);
    navigateTo(`task/${storedTask.id}`);
}

async function handleRecordingComplete(audioBlob: Blob): Promise<void> {
    const file = new File([audioBlob], "recording.webm", {
        type: "audio/webm",
    });
    await uploadMediaView.value?.uploadFile(audioBlob, file);
}
</script>

<template>
    <UContainer class="py-8">
        <!-- Hero Section -->
        <div class="text-center mb-12">
            <h1 class="text-4xl font-bold text-gray-900 dark:text-white mb-4">
                {{ t('pages.index.title') || 'Transcribo' }}
            </h1>
            <p class="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
                {{ t('pages.index.subtitle') }}
            </p>
        </div>

        <!-- Main Content Grid -->
        <div class="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto mb-12">
            <!-- Upload Media Section -->
            <UCard class="hover:shadow-lg transition-shadow duration-200">
                <template #header>
                    <div class="flex items-center gap-3">
                        <div class="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                            <UIcon name="i-heroicons-document-arrow-up"
                                class="w-6 h-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <h2 class="text-xl font-semibold text-gray-900 dark:text-white">
                                {{ t('pages.index.uploadMedia') }}
                            </h2>
                            <p class="text-sm text-gray-500 dark:text-gray-400">
                                {{ t('pages.index.uploadDescription') }}
                            </p>
                        </div>
                    </div>
                </template>

                <div class="py-4">
                    <UploadMediaView ref="uploadMediaView" @uploaded="handleUpload" />
                </div>
            </UCard>

            <!-- Record Audio Section -->
            <UCard class="hover:shadow-lg transition-shadow duration-200">
                <template #header>
                    <div class="flex items-center gap-3">
                        <div class="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                            <UIcon name="i-heroicons-microphone" class="w-6 h-6 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                            <h2 class="text-xl font-semibold text-gray-900 dark:text-white">
                                {{ t('pages.index.recordAudio') }}
                            </h2>
                            <p class="text-sm text-gray-500 dark:text-gray-400">
                                {{ t('pages.index.recordDescription') || 'Record audio directly from your microphone' }}
                            </p>
                        </div>
                    </div>
                </template>
                <div class="py-4">
                    <AudioRecordingView @on-recording-complete="handleRecordingComplete" />
                </div>
            </UCard>
        </div>
    </UContainer>
</template>
