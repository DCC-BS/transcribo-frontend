<script lang="ts" setup>
import type { SelectMenuItem } from "@nuxt/ui";
import { motion } from "motion-v";
import { v4 as uuidv4 } from "uuid";
import type {
    MediaConfigureData,
    MediaSelectionData,
} from "~/types/mediaStepInOut";
import type { StoredTask, TaskStatus } from "~/types/storedTasks";

const emit = defineEmits<(e: "onNext", payload: MediaConfigureData) => void>();
const input = defineModel<MediaSelectionData>("input", { required: true });
const { addTask, deleteTask } = useTasks();

const { t } = useI18n();

const language = ref<string>("de");
const numSpeaker = ref<string>("auto");

// Speaker options for the select input
const speakerOptions = [
    { label: t("upload.autoDetection"), value: "auto" },
    { label: "1", value: "1" },
    { label: "2", value: "2" },
    { label: "3", value: "3" },
    { label: "4", value: "4" },
    { label: "5", value: "5" },
    { label: "6", value: "6" },
];

// Language options for the select menu
const audioLanguageOptions: SelectMenuItem[] = [
    {
        label: t("upload.autoDetection"),
        value: "auto",
        icon: "i-lucide-languages",
    },
    ...languages.map((lang) => ({
        label: t(`languages.${lang.code}`),
        value: lang.code,
        icon: lang.icon,
    })),
];

const isVideo = computed(() => isVideoFile(input.value.media));
const mediaSource = computed(() => URL.createObjectURL(input.value.media));
const task = ref<StoredTask>();

watch(
    input,
    async () => {
        if (task.value) {
            await deleteTask(task.value.id);
        }

        const newId = uuidv4();
        const newStatus = {
            progress: 0,
            status: "pending",
            task_id: input.value.taskId ?? newId,
            created_at: new Date(),
        } as TaskStatus;
        task.value = await addTask(
            newStatus,
            input.value.media,
            input.value.media.name,
            input.value.media.type,
        );
    },
    { immediate: true },
);

onUnmounted(() => {
    URL.revokeObjectURL(mediaSource.value);
});

function formatFileSize(bytes: number): string {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${Number.parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
}

function onNext() {
    if (!task.value) {
        return;
    }

    const outputData: MediaConfigureData = {
        task: task.value,
        media: input.value.media,
        numSpeaker: numSpeaker.value,
        language: language.value,
    };
    emit("onNext", outputData);
}
</script>

<template>
    <div class="w-full max-w-[95vw] mx-auto">
        <div
            class="flex flex-col lg:flex-row gap-6 lg:gap-8 items-start justify-center max-w-7xl mx-auto p-4 lg:p-6"
        >
            <!-- Media Preview Column -->
            <motion.div
                :animate="{ opacity: 1, scale: 1, rotateX: 0 }"
                :initial="{ opacity: 0, scale: 0.95, rotateX: -5 }"
                :transition="{ duration: 0.6, delay: 0.1, ease: 'easeOut' }"
                class="w-full lg:w-3/5"
            >
                <div
                    class="relative group rounded-3xl overflow-hidden shadow-2xl shadow-gray-900/10 dark:shadow-black/30 bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 ring-1 ring-gray-200/50 dark:ring-gray-700/50"
                >
                    <!-- Video Preview -->
                    <div v-if="isVideo" class="space-y-0">
                        <!-- Video Metadata -->
                        <div class="flex items-center gap-6 p-6 rounded-t-2xl">
                            <div class="flex-shrink-0 relative">
                                <div
                                    class="absolute inset-0 bg-gradient-to-br from-red-500 to-orange-600 rounded-xl blur-xl opacity-50 group-hover:opacity-75 transition-opacity duration-500"
                                />
                                <div
                                    class="relative w-14 h-14 lg:w-16 lg:h-16 bg-gradient-to-br from-red-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform duration-300"
                                >
                                    <UIcon
                                        name="i-lucide-video"
                                        class="w-7 h-7 lg:w-8 lg:h-8 text-white"
                                    />
                                </div>
                            </div>
                            <div class="flex-1 min-w-0">
                                <h3
                                    class="text-base lg:text-lg font-semibold text-gray-900 dark:text-white truncate"
                                >
                                    {{ input.media.name }}
                                </h3>
                                <p
                                    class="text-sm text-gray-500 dark:text-gray-400 mt-1"
                                >
                                    {{ formatFileSize(input.media.size) }}
                                </p>
                            </div>
                        </div>
                        <!-- Video Player -->
                        <div
                            class="w-full overflow-hidden shadow-lg rounded-b-2xl bg-black"
                        >
                            <!-- biome-ignore lint/a11y/useMediaCaption: User-uploaded media may not have captions -->
                            <video
                                controls
                                class="w-full h-auto object-contain"
                                :src="mediaSource"
                                :type="input.media.type"
                            >
                                Your browser does not support the video tag.
                            </video>
                        </div>
                    </div>

                    <!-- Audio Preview -->
                    <div v-else class="p-8 lg:p-12 space-y-6">
                        <div class="flex items-center gap-6">
                            <div class="flex-shrink-0 relative">
                                <div
                                    class="absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl blur-xl opacity-50 group-hover:opacity-75 transition-opacity duration-500"
                                />
                                <div
                                    class="relative w-20 h-20 lg:w-24 lg:h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform duration-300"
                                >
                                    <UIcon
                                        name="i-lucide-audio-lines"
                                        class="w-10 h-10 lg:w-12 lg:h-12 text-white"
                                    />
                                </div>
                            </div>
                            <div class="flex-1 min-w-0">
                                <h3
                                    class="text-lg lg:text-xl font-semibold text-gray-900 dark:text-white truncate"
                                >
                                    {{ input.media.name }}
                                </h3>
                                <p
                                    class="text-sm text-gray-500 dark:text-gray-400 mt-1"
                                >
                                    {{ formatFileSize(input.media.size) }}
                                </p>
                            </div>
                        </div>
                        <div class="relative">
                            <!-- biome-ignore lint/a11y/useMediaCaption: User-uploaded media may not have captions -->
                            <audio
                                controls
                                class="w-full h-12 rounded-xl"
                                :src="mediaSource"
                                :type="input.media.type"
                            >
                                Your browser does not support the audio element.
                            </audio>
                        </div>
                    </div>

                    <!-- Decorative elements -->
                    <div
                        class="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-blue-500/10 to-transparent rounded-bl-full pointer-events-none"
                    />
                    <div
                        class="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-purple-500/10 to-transparent rounded-tr-full pointer-events-none"
                    />
                </div>
            </motion.div>

            <!-- Settings Column -->
            <motion.div
                :animate="{ opacity: 1, x: 0 }"
                :initial="{ opacity: 0, x: 20 }"
                :transition="{ duration: 0.6, delay: 0.2, ease: 'easeOut' }"
                class="w-full lg:w-2/5"
            >
                <div class="sticky top-6 space-y-6">
                    <!-- Card Header -->
                    <div
                        class="bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl p-6 text-white shadow-xl shadow-blue-500/20"
                    >
                        <div class="flex items-center gap-3">
                            <div
                                class="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center"
                            >
                                <UIcon
                                    name="i-lucide-settings-2"
                                    class="w-5 h-5"
                                />
                            </div>
                            <div>
                                <h2 class="text-lg font-semibold">
                                    {{ t("upload.settings") }}
                                </h2>
                                <p class="text-sm text-white/80">
                                    {{ t("upload.configureTranscription") }}
                                </p>
                            </div>
                        </div>
                    </div>

                    <!-- Settings Card -->
                    <div
                        class="bg-white dark:bg-gray-800 rounded-2xl shadow-xl shadow-gray-900/10 dark:shadow-black/20 ring-1 ring-gray-200/50 dark:ring-gray-700/50 p-6 space-y-6"
                    >
                        <!-- Number of Speakers -->
                        <motion.div
                            :animate="{ opacity: 1, y: 0 }"
                            :initial="{ opacity: 0, y: 10 }"
                            :transition="{ duration: 0.4, delay: 0.3 }"
                        >
                            <div class="space-y-3">
                                <div class="flex items-center gap-2">
                                    <div
                                        class="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center"
                                    >
                                        <UIcon
                                            name="i-lucide-users"
                                            class="w-4 h-4 text-blue-600 dark:text-blue-400"
                                        />
                                    </div>
                                    <label
                                        class="text-sm font-medium text-gray-900 dark:text-white"
                                    >
                                        {{ t("upload.numSpeakers") }}
                                    </label>
                                </div>
                                <p
                                    class="text-xs text-gray-500 dark:text-gray-400 pl-10"
                                >
                                    {{ t("upload.numSpeakersHelp") }}
                                </p>
                                <USelect
                                    v-model="numSpeaker"
                                    :items="speakerOptions"
                                    placeholder="Select number of speakers"
                                    size="lg"
                                    class="w-full"
                                />
                            </div>
                        </motion.div>

                        <div class="h-px bg-gray-200 dark:bg-gray-700" />

                        <!-- Audio Language -->
                        <motion.div
                            :animate="{ opacity: 1, y: 0 }"
                            :initial="{ opacity: 0, y: 10 }"
                            :transition="{ duration: 0.4, delay: 0.4 }"
                        >
                            <div class="space-y-3">
                                <div class="flex items-center gap-2">
                                    <div
                                        class="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center"
                                    >
                                        <UIcon
                                            name="i-lucide-globe"
                                            class="w-4 h-4 text-purple-600 dark:text-purple-400"
                                        />
                                    </div>
                                    <label
                                        class="text-sm font-medium text-gray-900 dark:text-white"
                                    >
                                        {{ t("upload.audioLanguage") }}
                                    </label>
                                </div>
                                <p
                                    class="text-xs text-gray-500 dark:text-gray-400 pl-10"
                                >
                                    {{ t("upload.audioLanguageHelp") }}
                                </p>
                                <USelectMenu
                                    v-model="language"
                                    value-key="value"
                                    :items="audioLanguageOptions"
                                    size="lg"
                                    class="w-full"
                                />
                            </div>
                        </motion.div>

                        <!-- Info Box -->
                        <motion.div
                            :animate="{ opacity: 1, scale: 1 }"
                            :initial="{ opacity: 0, scale: 0.95 }"
                            :transition="{ duration: 0.4, delay: 0.5 }"
                        >
                            <div
                                class="flex items-start gap-3 p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl border border-blue-100 dark:border-blue-800/30"
                            >
                                <UIcon
                                    name="i-lucide-info"
                                    class="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5"
                                />
                                <p
                                    class="text-xs text-gray-600 dark:text-gray-300 leading-relaxed"
                                >
                                    {{ t("upload.settingsInfo") }}
                                </p>
                            </div>
                        </motion.div>

                        <!-- Next Button -->
                        <motion.div
                            :animate="{ opacity: 1, y: 0 }"
                            :initial="{ opacity: 0, y: 10 }"
                            :transition="{ duration: 0.4, delay: 0.6 }"
                        >
                            <UButton
                                size="lg"
                                color="primary"
                                variant="solid"
                                icon="i-lucide-arrow-right"
                                trailing
                                class="w-full"
                                @click="onNext"
                            >
                                {{ t("navigation.new") }}
                            </UButton>
                        </motion.div>
                    </div>
                </div>
            </motion.div>
        </div>
    </div>
</template>
