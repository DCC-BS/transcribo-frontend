<script lang="ts" setup>
import { motion } from "motion-v";
import type { MediaSelectionData } from "~/types/mediaStepInOut";

const emit =
    defineEmits<(e: "onMediaSelected", data: MediaSelectionData) => void>();

const logger = useLogger();
const { t } = useI18n();

const uploadFile = ref<File>();

watch(uploadFile, () => {
    if (uploadFile.value) {
        emit("onMediaSelected", { media: uploadFile.value });
    }
});

function onRecodingComplete(audio: Blob) {
    const file = new File([audio], "recoding.mp3");
    emit("onMediaSelected", { media: file });
}
</script>

<template>
    <div class="w-full">
        <div class="max-w-6xl mx-auto p-6 lg:p-8">
            <!-- Two Column Layout -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
                <!-- Upload Section -->
                <motion.div
                    :animate="{ opacity: 1, x: 0 }"
                    :initial="{ opacity: 0, x: -20 }"
                    :transition="{ duration: 0.6, delay: 0.2 }"
                >
                    <div
                        class="bg-linear-to-br from-blue-500 to-purple-600 rounded-3xl p-8 text-white shadow-xl shadow-blue-500/20 h-full flex flex-col"
                    >
                        <!-- Icon Header -->
                        <div class="flex items-center gap-4 mb-6">
                            <div
                                class="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center"
                            >
                                <UIcon name="i-lucide-upload" class="w-7 h-7" />
                            </div>
                            <div>
                                <h2 class="text-xl font-semibold">
                                    {{ t("pages.index.uploadMedia") }}
                                </h2>
                                <p class="text-sm text-white/80 mt-1">
                                    {{ t("pages.index.uploadDescription") }}
                                </p>
                            </div>
                        </div>

                        <!-- Upload Card Content -->
                        <div
                            class="flex-1 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center min-h-[200px]"
                        >
                            <UFileUpload
                                accept="audio/*, video/*"
                                icon="i-lucide-file-up"
                                v-model="uploadFile"
                                class="w-full h-full bg-transparent"
                                :ui="{
                                    base: 'bg-tansparent',
                                }"
                            />
                        </div>

                        <!-- File Types Info -->
                        <div
                            class="mt-6 flex items-start gap-3 text-sm text-white/80"
                        >
                            <UIcon
                                name="i-lucide-info"
                                class="w-5 h-5 shrink-0 mt-0.5"
                            />
                            <div>
                                <p class="font-medium mb-1">
                                    Supported formats
                                </p>
                                <p class="text-xs text-white/70">
                                    MP3, MP4, M4A, FLAC, WAV, WEBM
                                </p>
                            </div>
                        </div>
                    </div>
                </motion.div>

                <!-- Recording Section -->
                <motion.div
                    :animate="{ opacity: 1, x: 0 }"
                    :initial="{ opacity: 0, x: 20 }"
                    :transition="{ duration: 0.6, delay: 0.3 }"
                >
                    <div
                        class="bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-xl shadow-gray-900/10 dark:shadow-black/20 ring-1 ring-gray-200/50 dark:ring-gray-700/50 h-full flex flex-col"
                    >
                        <!-- Icon Header -->
                        <div class="flex items-center gap-4 mb-6">
                            <div
                                class="w-14 h-14 bg-gradient-to-br from-red-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg"
                            >
                                <UIcon
                                    name="i-lucide-mic"
                                    class="w-7 h-7 text-white"
                                />
                            </div>
                            <div>
                                <h2
                                    class="text-xl font-semibold text-gray-900 dark:text-white"
                                >
                                    {{ t("pages.index.recordAudio") }}
                                </h2>
                                <p
                                    class="text-sm text-gray-500 dark:text-gray-400 mt-1"
                                >
                                    {{ t("pages.index.recordDescription") }}
                                </p>
                            </div>
                        </div>

                        <!-- Recording Card Content -->
                        <div
                            class="flex-1 bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 rounded-2xl p-6 flex items-center justify-center min-h-[200px]"
                        >
                            <AudioRecordingView
                                @on-recording-complete="onRecodingComplete"
                            />
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    </div>
</template>
