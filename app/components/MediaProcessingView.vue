<script lang="ts" setup>
import { isApiError } from "@dcc-bs/communication.bs.js";
import type { MediaConfigureData } from "~/types/mediaStepInOut";
import { isVideoFile } from "~/utils/videoUtils";
import { motion } from "motion-v";

const input = defineModel<MediaConfigureData>("input", { required: true });

const {
    uploadFile,
    numSpeakers,
    showProgress,
    audioLanguage,
    progressMessage,
} = useAudioUpload();

const processsMedia = ref(false);
const isProcessing = computed(() => processsMedia.value || showProgress.value);
const errorMessage = ref<string>();

const { extractAudioFromVideo } = useAudioExtract();
const { t } = useI18n();

onMounted(() => {
    if (input.value) {
        processsMedia.value = true;

        audioLanguage.value = input.value.language ?? "auto";
        numSpeakers.value = input.value.numSpeaker?.toString() ?? "auto";

        if (isVideoFile(input.value.media)) {
            extractAudioFromVideo(input.value.media)
                .then((out) => {
                    const audioFile = new File(
                        [out.audioBlob],
                        out.audioFileName,
                    );

                    uploadFile(audioFile, input.value.media).catch((err) => {
                        console.log("Upload error:", err);

                        if (isApiError(err)) {
                            errorMessage.value = t(`errors.${err.errorId}`);
                        } else {
                            errorMessage.value = `Failed to upload extracted audio: ${err instanceof Error ? err.message : String(err)}`;
                        }
                    });

                    processsMedia.value = false;
                })
                .catch((err) => {
                    errorMessage.value = `Failed to extract audio from video: ${err.message}`;
                    processsMedia.value = false;
                });
        } else {
            uploadFile(input.value.media, input.value.media).catch((err) => {
                errorMessage.value = `Failed to upload file: ${err.message}`;
                processsMedia.value = false;
            });
        }
    }
});
</script>

<template>
    <div class="flex flex-col items-center justify-center py-12 px-6">
        <div v-if="isProcessing">
            <!-- Media File Card with Upload Animation -->
            <div class="relative w-full max-w-lg">
                <!-- File Card -->
                <motion.div
                    :animate="{ opacity: 1, y: 0 }"
                    :initial="{ opacity: 0, y: 20 }"
                    :transition="{
                        type: 'spring',
                        stiffness: 200,
                        damping: 20,
                    }"
                    class="relative bg-white dark:bg-gray-800 rounded-3xl shadow-2xl shadow-gray-900/10 dark:shadow-black/30 ring-1 ring-gray-200/50 dark:ring-gray-700/50 overflow-hidden"
                >
                    <!-- File Header -->
                    <div
                        class="relative px-6 py-4 bg-gradient-to-r from-blue-500 to-purple-600"
                    >
                        <div class="flex items-center gap-3">
                            <!-- File Icon -->
                            <div
                                class="relative w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center"
                            >
                                <UIcon
                                    :name="
                                        isVideoFile(input.media)
                                            ? 'i-lucide-video'
                                            : 'i-lucide-file-audio'
                                    "
                                    class="w-6 h-6 text-white"
                                />
                            </div>
                            <!-- File Name -->
                            <div class="flex-1 min-w-0">
                                <p class="text-white font-semibold truncate">
                                    {{ input.media.name }}
                                </p>
                                <p class="text-white/80 text-xs">
                                    {{
                                        isVideoFile(input.media)
                                            ? "Video"
                                            : "Audio"
                                    }}
                                    •
                                    {{
                                        input.media.type
                                            .split("/")[1]
                                            ?.toUpperCase()
                                    }}
                                </p>
                            </div>
                            <!-- Status Badge -->
                            <div
                                class="flex items-center gap-2 px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full"
                            >
                                <div
                                    class="w-2 h-2 bg-green-400 rounded-full animate-pulse"
                                />
                                <span class="text-white text-xs font-medium">
                                    Processing
                                </span>
                            </div>
                        </div>
                    </div>

                    <!-- File Content Area -->
                    <div class="p-8">
                        <!-- Waveform Visualization -->
                        <div
                            class="relative h-24 bg-gradient-to-b from-slate-50 to-slate-100 dark:from-gray-900/50 dark:to-gray-900 rounded-2xl overflow-hidden"
                        >
                            <!-- Animated Waveform -->
                            <div
                                class="absolute inset-0 flex items-center justify-center gap-1"
                            >
                                <motion.div
                                    v-for="i in 24"
                                    :key="i"
                                    :animate="{
                                        scaleY: [0.3, 1, 0.3],
                                    }"
                                    :transition="{
                                        duration: 800 + (i % 4) * 200,
                                        repeat: Infinity,
                                        ease: 'easeInOut',
                                        delay: i * 0.05,
                                    }"
                                    :style="{
                                        height: '60%',
                                        transformOrigin: 'bottom',
                                    }"
                                    class="w-1.5 rounded-full bg-gradient-to-t from-blue-400 to-purple-500"
                                />
                            </div>
                            <!-- Glow Effect -->
                            <div
                                class="absolute inset-0 bg-gradient-to-t from-transparent via-blue-500/5 to-purple-500/10 pointer-events-none"
                            />
                        </div>

                        <!-- Progress Steps -->
                        <div class="mt-6 space-y-4">
                            <!-- Step 1: Extracting/Preparing -->
                            <motion.div
                                :animate="{ opacity: 1, x: 0 }"
                                :initial="{ opacity: 0, x: -20 }"
                                :transition="{ delay: 0.2, duration: 0.5 }"
                                class="flex items-center gap-3"
                            >
                                <div
                                    class="w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/30"
                                >
                                    <UIcon
                                        name="i-lucide-file"
                                        class="w-4 h-4 text-white"
                                    />
                                </div>
                                <div class="flex-1">
                                    <p
                                        class="text-sm font-medium text-gray-900 dark:text-white"
                                    >
                                        Preparing file
                                    </p>
                                    <div
                                        class="mt-1.5 h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden"
                                    >
                                        <motion.div
                                            :animate="{ width: ['0%', '100%'] }"
                                            :transition="{
                                                duration: 2000,
                                                ease: 'easeInOut',
                                            }"
                                            class="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full"
                                        />
                                    </div>
                                </div>
                                <div class="text-blue-500">
                                    <UIcon
                                        name="i-lucide-check-circle-2"
                                        class="w-5 h-5"
                                    />
                                </div>
                            </motion.div>

                            <!-- Step 2: Uploading -->
                            <motion.div
                                :animate="{ opacity: 1, x: 0 }"
                                :initial="{ opacity: 0, x: -20 }"
                                :transition="{ delay: 0.4, duration: 0.5 }"
                                class="flex items-center gap-3"
                            >
                                <div
                                    class="w-8 h-8 bg-gradient-to-br from-purple-400 to-purple-600 rounded-lg flex items-center justify-center shadow-lg shadow-purple-500/30"
                                >
                                    <UIcon
                                        name="i-lucide-upload-cloud"
                                        class="w-4 h-4 text-white"
                                    />
                                </div>
                                <div class="flex-1">
                                    <p
                                        class="text-sm font-medium text-gray-900 dark:text-white"
                                    >
                                        Uploading
                                    </p>
                                    <div
                                        class="mt-1.5 h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden"
                                    >
                                        <motion.div
                                            :animate="{ width: ['0%', '100%'] }"
                                            :transition="{
                                                duration: 3000,
                                                ease: 'easeInOut',
                                            }"
                                            class="h-full bg-gradient-to-r from-purple-400 to-purple-600 rounded-full"
                                        />
                                    </div>
                                </div>
                            </motion.div>

                            <!-- Step 3: Processing -->
                            <motion.div
                                :animate="{ opacity: 1, x: 0 }"
                                :initial="{ opacity: 0, x: -20 }"
                                :transition="{ delay: 0.6, duration: 0.5 }"
                                class="flex items-center gap-3"
                            >
                                <div
                                    class="w-8 h-8 bg-gradient-to-br from-teal-400 to-teal-600 rounded-lg flex items-center justify-center shadow-lg shadow-teal-500/30"
                                >
                                    <UIcon
                                        name="i-lucide-cpu"
                                        class="w-4 h-4 text-white"
                                    />
                                </div>
                                <div class="flex-1">
                                    <p
                                        class="text-sm font-medium text-gray-900 dark:text-white"
                                    >
                                        {{ progressMessage }}
                                    </p>
                                    <div
                                        class="mt-1.5 h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden"
                                    >
                                        <motion.div
                                            :animate="{
                                                width: [
                                                    '0%',
                                                    '30%',
                                                    '60%',
                                                    '90%',
                                                ],
                                            }"
                                            :transition="{
                                                duration: 4000,
                                                repeat: Infinity,
                                                ease: 'easeInOut',
                                            }"
                                            class="h-full bg-gradient-to-r from-teal-400 to-teal-600 rounded-full"
                                        />
                                    </div>
                                </div>
                                <div class="teal-500 animate-spin">
                                    <UIcon
                                        name="i-lucide-loader-2"
                                        class="w-5 h-5 text-teal-500"
                                    />
                                </div>
                            </motion.div>
                        </div>
                    </div>
                </motion.div>

                <!-- Floating Upload Particles -->
                <div
                    class="absolute -top-20 left-1/2 -translate-x-1/2 w-full pointer-events-none"
                >
                    <motion.div
                        v-for="i in 6"
                        :key="i"
                        :animate="{
                            y: [0, -80, -80],
                            opacity: [0, 0.6, 0],
                            scale: [0, 1, 0.5],
                        }"
                        :transition="{
                            duration: 2000,
                            repeat: Infinity,
                            ease: 'easeInOut',
                            delay: i * 0.4,
                        }"
                        :style="{
                            left: `${30 + i * 10}%`,
                        }"
                        class="absolute w-1 h-8 bg-gradient-to-t from-blue-500/30 to-purple-500/0 rounded-full"
                    />
                </div>
            </div>
        </div>
        <!-- Error Message Display -->
        <motion.div
            v-if="errorMessage"
            :animate="{ opacity: 1, y: 0 }"
            :initial="{ opacity: 0, y: 20 }"
            :transition="{ type: 'spring', stiffness: 200, damping: 20 }"
            class="mt-8 max-w-md w-full"
        >
            <div
                class="flex items-start gap-4 p-4 bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 rounded-2xl border-2 border-red-200 dark:border-red-800/30 shadow-lg shadow-red-500/10"
            >
                <div
                    class="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-red-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg"
                >
                    <UIcon
                        name="i-lucide-alert-circle"
                        class="w-6 h-6 text-white"
                    />
                </div>
                <div class="flex-1 min-w-0">
                    <h3
                        class="text-base font-semibold text-red-900 dark:text-red-200"
                    >
                        Error
                    </h3>
                    <p
                        class="mt-1 text-sm text-red-700 dark:text-red-300 leading-relaxed"
                    >
                        {{ errorMessage }}
                    </p>
                </div>
            </div>
        </motion.div>
    </div>
</template>
