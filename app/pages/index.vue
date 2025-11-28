<script lang="ts" setup>
import type { UploadMediaView } from "#components";
import type { TaskStatus } from "~/types/task";

const tasksStore = useTasksStore();
const { t } = useI18n();
const { $api } = useNuxtApp();

const uploadMediaView = ref<typeof UploadMediaView>();

interface FeaturePanel {
    id: "upload" | "record";
    titleKey: string;
    descriptionKey: string;
    icon: string;
    label: string;
    accentClasses: {
        wrapper: string;
        icon: string;
        text: string;
    };
}

// Lightweight config keeps the template compact while ensuring consistent styling.
const featurePanels: FeaturePanel[] = [
    {
        id: "upload",
        titleKey: "pages.index.uploadMedia",
        descriptionKey: "pages.index.uploadDescription",
        icon: "i-heroicons-document-arrow-up",
        label: "Upload",
        accentClasses: {
            wrapper: "bg-blue-100 dark:bg-blue-900/30",
            icon: "text-blue-600 dark:text-blue-400",
            text: "text-blue-700 dark:text-blue-300",
        },
    },
    {
        id: "record",
        titleKey: "pages.index.recordAudio",
        descriptionKey: "pages.index.recordDescription",
        icon: "i-heroicons-microphone",
        label: "Record",
        accentClasses: {
            wrapper: "bg-green-100 dark:bg-green-900/30",
            icon: "text-green-600 dark:text-green-400",
            text: "text-green-700 dark:text-green-300",
        },
    },
];

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
    <UContainer class="py-12 space-y-12">
        <section class="text-center space-y-4 max-w-3xl mx-auto">
            <h1 class="text-4xl font-bold text-gray-900 dark:text-white">
                {{ t('pages.index.title') || 'Transcribo' }}
            </h1>
            <p class="text-lg text-gray-600 dark:text-gray-300">
                {{ t('pages.index.subtitle') }}
            </p>
        </section>

        <div class="grid gap-8 md:grid-cols-2">
            <section v-for="panel in featurePanels" :key="panel.id" :id="panel.id"
                class="flex h-full flex-col gap-6 rounded-3xl border border-gray-200/60 dark:border-gray-800/70 bg-white/80 dark:bg-gray-900/60 p-6 shadow-sm backdrop-blur">
                <div class="flex items-start gap-4">
                    <div class="p-3 rounded-2xl" :class="panel.accentClasses.wrapper">
                        <UIcon :name="panel.icon" class="w-6 h-6" :class="panel.accentClasses.icon" />
                    </div>
                    <div class="space-y-1">
                        <span class="text-xs font-semibold uppercase tracking-wide" :class="panel.accentClasses.text">
                            {{ panel.label }}
                        </span>
                        <h2 class="text-2xl font-semibold text-gray-900 dark:text-white">
                            {{ t(panel.titleKey) }}
                        </h2>
                        <p class="text-sm text-gray-500 dark:text-gray-400">
                            {{ t(panel.descriptionKey) }}
                        </p>
                    </div>
                </div>
                <!-- Center the recording button vertically while keeping upload content anchored -->
                <div :class="panel.id === 'record' ? 'flex-1 flex items-center justify-center' : 'mt-auto'">
                    <UploadMediaView v-if="panel.id === 'upload'" ref="uploadMediaView" @uploaded="handleUpload" />
                    <AudioRecordingView v-else @on-recording-complete="handleRecordingComplete" />
                </div>
            </section>
        </div>
    </UContainer>
</template>
