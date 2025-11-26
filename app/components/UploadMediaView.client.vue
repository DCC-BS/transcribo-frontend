<script lang="ts" setup>
import type { TaskStatus } from "~/types/task";
import { isHttpStatusCode } from "~/utils/httpErrorCode";
import type { SelectMenuItem } from "@nuxt/ui";

const emit = defineEmits<{
    uploaded: [task: TaskStatus, file: File];
}>();

const { t } = useI18n();
const logger = useLogger();
const { $api } = useNuxtApp();


// Track the conversion progress
const progressMessage = ref("");
const showProgress = ref(false);
const errorMessage = ref("");

// Track selected file
const selectedFile = ref<File | undefined>();
const processedFile = ref<File | Blob | undefined>();
const isVideoFile = ref(false);
const showFilePreview = ref(false);

// Template ref for file input
const fileInputRef = ref<HTMLInputElement | null>(null);

// Track number of speakers selection
const numSpeakers = ref<string>("auto");

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
const audioLanguage = ref<string>("de");
const audioLanguageOptions = ref<SelectMenuItem[]>([
    { label: t("upload.autoDetection"), value: "auto" },
    { label: t("languages.de"), value: "de" },
    { label: t("languages.fr"), value: "fr" },
    { label: t("languages.it"), value: "it" },
    { label: t("languages.en"), value: "en" },
    { label: t("languages.es"), value: "es" },
    { label: t("languages.pt"), value: "pt" },
    { label: t("languages.ru"), value: "ru" },
    { label: t("languages.zh"), value: "zh" },
    { label: t("languages.ko"), value: "ko" },
    { label: t("languages.ja"), value: "ja" },
    { label: t("languages.tr"), value: "tr" },
    { label: t("languages.pl"), value: "pl" },
    { label: t("languages.ca"), value: "ca" },
    { label: t("languages.nl"), value: "nl" },
    { label: t("languages.ar"), value: "ar" },
    { label: t("languages.sv"), value: "sv" },
    { label: t("languages.id"), value: "id" },
    { label: t("languages.hi"), value: "hi" },
    { label: t("languages.fi"), value: "fi" },
    { label: t("languages.vi"), value: "vi" },
    { label: t("languages.he"), value: "he" },
    { label: t("languages.uk"), value: "uk" },
    { label: t("languages.el"), value: "el" },
    { label: t("languages.ms"), value: "ms" },
    { label: t("languages.cs"), value: "cs" },
    { label: t("languages.ro"), value: "ro" },
    { label: t("languages.da"), value: "da" },
    { label: t("languages.hu"), value: "hu" },
    { label: t("languages.ta"), value: "ta" },
    { label: t("languages.no"), value: "no" },
    { label: t("languages.th"), value: "th" },
    { label: t("languages.ur"), value: "ur" },
    { label: t("languages.hr"), value: "hr" },
    { label: t("languages.bg"), value: "bg" },
    { label: t("languages.lt"), value: "lt" },
    { label: t("languages.la"), value: "la" },
    { label: t("languages.mi"), value: "mi" },
    { label: t("languages.ml"), value: "ml" },
    { label: t("languages.cy"), value: "cy" },
    { label: t("languages.sk"), value: "sk" },
    { label: t("languages.te"), value: "te" },
    { label: t("languages.fa"), value: "fa" },
    { label: t("languages.lv"), value: "lv" },
    { label: t("languages.bn"), value: "bn" },
    { label: t("languages.sr"), value: "sr" },
    { label: t("languages.az"), value: "az" },
    { label: t("languages.sl"), value: "sl" },
    { label: t("languages.kn"), value: "kn" },
    { label: t("languages.et"), value: "et" },
    { label: t("languages.mk"), value: "mk" },
    { label: t("languages.br"), value: "br" },
    { label: t("languages.eu"), value: "eu" },
    { label: t("languages.is"), value: "is" },
    { label: t("languages.hy"), value: "hy" },
    { label: t("languages.ne"), value: "ne" },
    { label: t("languages.mn"), value: "mn" },
    { label: t("languages.bs"), value: "bs" },
    { label: t("languages.kk"), value: "kk" },
    { label: t("languages.sq"), value: "sq" },
    { label: t("languages.sw"), value: "sw" },
    { label: t("languages.gl"), value: "gl" },
    { label: t("languages.mr"), value: "mr" },
    { label: t("languages.pa"), value: "pa" },
    { label: t("languages.si"), value: "si" },
    { label: t("languages.km"), value: "km" },
    { label: t("languages.sn"), value: "sn" },
    { label: t("languages.yo"), value: "yo" },
    { label: t("languages.so"), value: "so" },
    { label: t("languages.af"), value: "af" },
    { label: t("languages.oc"), value: "oc" },
    { label: t("languages.ka"), value: "ka" },
    { label: t("languages.be"), value: "be" },
    { label: t("languages.tg"), value: "tg" },
    { label: t("languages.sd"), value: "sd" },
    { label: t("languages.gu"), value: "gu" },
    { label: t("languages.am"), value: "am" },
    { label: t("languages.yi"), value: "yi" },
    { label: t("languages.lo"), value: "lo" },
    { label: t("languages.uz"), value: "uz" },
    { label: t("languages.fo"), value: "fo" },
    { label: t("languages.ht"), value: "ht" },
    { label: t("languages.ps"), value: "ps" },
    { label: t("languages.tk"), value: "tk" },
    { label: t("languages.nn"), value: "nn" },
    { label: t("languages.mt"), value: "mt" },
    { label: t("languages.sa"), value: "sa" },
    { label: t("languages.lb"), value: "lb" },
    { label: t("languages.my"), value: "my" },
    { label: t("languages.bo"), value: "bo" },
    { label: t("languages.tl"), value: "tl" },
    { label: t("languages.mg"), value: "mg" },
    { label: t("languages.as"), value: "as" },
    { label: t("languages.tt"), value: "tt" },
    { label: t("languages.haw"), value: "haw" },
    { label: t("languages.ln"), value: "ln" },
    { label: t("languages.ha"), value: "ha" },
    { label: t("languages.ba"), value: "ba" },
    { label: t("languages.jw"), value: "jw" },
    { label: t("languages.su"), value: "su" },
    { label: t("languages.yue"), value: "yue" }
]);

/**
 * Check if the file is a video file based on MIME type
 */
function checkIfVideoFile(file: File): boolean {
    return file.type.startsWith("video/");
}

/**
 * Format file size in human readable format
 */
function formatFileSize(bytes: number): string {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${Number.parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
}

const { extractAudioFromVideo } = useAudioExtract();

/**
 * Handles the file selection and processing
 */
const loadAudio = async (event: Event): Promise<void> => {
    if (!event.target) {
        return;
    }

    const target = event.target as HTMLInputElement;
    if (!target.files || target.files.length === 0) {
        return;
    }

    const mediaFile = target.files[0];
    if (!mediaFile) {
        return;
    }

    selectedFile.value = mediaFile;
    isVideoFile.value = checkIfVideoFile(mediaFile);
    errorMessage.value = "";

    try {
        if (isVideoFile.value) {
            // Extract audio from video files
            showProgress.value = true;
            progressMessage.value = t("upload.extractingAudio");
            const { audioBlob, audioFileName } = await extractAudioFromVideo(mediaFile);

            // Create a File object from the blob with appropriate name
            processedFile.value = new File([audioBlob], audioFileName, {
                type: "audio/wav",
            });
        } else {
            // For audio files, use them directly
            processedFile.value = mediaFile;
        }

        showFilePreview.value = true;
    } catch (error) {
        logger.error("Error processing media file:", error);
        errorMessage.value = t("upload.processingError");
    } finally {
        showProgress.value = false;
    }
};

/**
 * Clears the selected file and resets the UI
 */
function clearSelectedFile(): void {
    selectedFile.value = undefined;
    processedFile.value = undefined;
    showFilePreview.value = false;
    errorMessage.value = "";

    // Reset the file input
    if (fileInputRef.value) {
        fileInputRef.value.value = "";
    }
}

/**
 * Uploads the file to the server when user clicks "Use this file"
 */
async function useThisFile(): Promise<void> {
    if (!processedFile.value || !selectedFile.value) {
        return;
    }

    try {
        await uploadFile(processedFile.value, selectedFile.value);
    } catch (error) {
        logger.error("Error uploading file:", error);
        errorMessage.value = t("upload.uploadError");
    }
}

/**
 * Uploads the file to the server
 */
async function uploadFile(
    file: File | Blob,
    originalFile: File,
): Promise<void> {
    showProgress.value = true;
    progressMessage.value = t("upload.uploadingMedia");

    const formData = new FormData();
    formData.append("file", file);

    // Add num_speakers parameter - send null for auto detection, otherwise send the integer value
    if (numSpeakers.value === "auto") {
        formData.append("num_speakers", "null");
    } else {
        formData.append("num_speakers", numSpeakers.value);
    }

    // Add audio_language parameter - send null for auto detection, otherwise send the language code
    if (audioLanguage.value === "auto") {
        formData.append("audio_language", "null");
    } else {
        formData.append("audio_language", audioLanguage.value);
    }

    try {
        const response = await $api<TaskStatus>("/api/transcribe/submit", {
            body: formData,
            method: "POST",
        });
        emit("uploaded", response, originalFile);
    } catch (error) {
        const toast = useToast();

        // Handle unsupported media type (415) with a friendly toast
        if (isHttpStatusCode(error, 415)) {
            toast.add({
                title:
                    t("upload.unsupportedFileTypeTitle") ||
                    "Unsupported file type",
                description:
                    t("upload.unsupportedFileTypeDescription") ||
                    "Allowed file types: mp3, mp4, wav, webm",
                color: "error",
                icon: "i-heroicons-exclamation-triangle",
            });
            return;
        }

        // Handle file too large (413) with a friendly toast
        if (isHttpStatusCode(error, 413)) {
            toast.add({
                title: t("upload.fileTooLargeTitle") || "File too large",
                description:
                    t("upload.fileTooLargeDescription") ||
                    "The file size exceeds the maximum allowed limit. Please try a smaller file.",
                color: "error",
                icon: "i-heroicons-exclamation-triangle",
            });
            return;
        }

        // Handle too many requests (429) with a friendly toast
        if (isHttpStatusCode(error, 429)) {
            toast.add({
                title: t("upload.tooManyRequestsTitle") || "Too many requests",
                description:
                    t("upload.tooManyRequestsDescription") ||
                    "You've made too many requests. Please wait a few minutes before trying again.",
                color: "error",
                icon: "i-heroicons-clock",
            });
            return;
        }

        throw error;
    } finally {
        // Always stop the progress indicator
        showProgress.value = false;
    }
}

defineExpose({ uploadFile });
</script>

<template>
    <div>
        <!-- File Input Section -->
        <div v-if="!showFilePreview" class="space-y-4">
            <UInput type="file" accept="audio/*,video/*" size="xl" icon="i-heroicons-document-arrow-up"
                :disabled="showProgress" @change="loadAudio" ref="fileInputRef" />
        </div>

        <!-- File Preview Section -->
        <div v-else-if="selectedFile" class="space-y-4">
            <UCard>
                <template #header>
                    <div class="flex items-center justify-between">
                        <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                            {{ t('upload.filePreview') || 'File Preview' }}
                        </h3>
                        <UButton variant="ghost" size="sm" icon="i-heroicons-x-mark" @click="clearSelectedFile" />
                    </div>
                </template>

                <div class="space-y-4">
                    <!-- File Info -->
                    <div class="flex items-start gap-3">
                        <div class="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                            <UIcon :name="isVideoFile ? 'i-heroicons-video-camera' : 'i-heroicons-musical-note'"
                                class="w-6 h-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div class="flex-1 min-w-0">
                            <p class="font-medium text-gray-900 dark:text-white truncate">
                                {{ selectedFile.name }}
                            </p>
                            <p class="text-sm text-gray-500 dark:text-gray-400">
                                {{ formatFileSize(selectedFile.size) }}
                                <span v-if="isVideoFile"
                                    class="ml-2 px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs rounded">
                                    {{ t('upload.videoFile') || 'Video' }}
                                </span>
                                <span v-else
                                    class="ml-2 px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs rounded">
                                    {{ t('upload.audioFile') || 'Audio' }}
                                </span>
                            </p>
                            <p v-if="isVideoFile" class="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                {{ t('upload.audioWillBeExtracted') || 'Audio will be extracted for transcription' }}
                            </p>
                        </div>
                    </div>

                    <!-- Action Buttons -->
                    <div class="flex gap-3 pt-4 border-t">
                        <UButton color="primary" size="lg" :loading="showProgress" :disabled="showProgress"
                            @click="useThisFile">
                            <template #leading>
                                <UIcon name="i-heroicons-play" />
                            </template>
                            {{ t('upload.useThisFile') || 'Use this file' }}
                        </UButton>

                        <UButton variant="ghost" size="lg" :disabled="showProgress" @click="clearSelectedFile">
                            {{ t('upload.selectDifferentFile') || 'Select different file' }}
                        </UButton>
                    </div>
                </div>
            </UCard>
        </div>

        <!-- Shared Configuration Section -->
        <div class="space-y-4 mt-4">
            <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {{ t("upload.numSpeakers") }}
                </label>
                <p class="text-xs text-gray-500 dark:text-gray-400 mb-2">
                    {{ t("upload.numSpeakersHelp") }}
                </p>
                <USelect v-model="numSpeakers" :items="speakerOptions" :disabled="showProgress"
                    :ui="{ base: 'w-[250px]' }" placeholder="Select number of speakers" />
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {{ t("upload.audioLanguage") }}
                </label>
                <p class="text-xs text-gray-500 dark:text-gray-400 mb-2">
                    {{ t("upload.audioLanguageHelp") }}
                </p>
                <USelectMenu v-model="audioLanguage" value-key="value" :ui="{ base: 'w-[250px]' }"
                    :items="audioLanguageOptions" :disabled="showProgress" />
            </div>
        </div>

        <!-- Progress Section -->
        <div v-if="showProgress" class="mt-4">
            <p class="text-sm text-gray-600 dark:text-gray-400">{{ progressMessage }}</p>
            <UProgress class="mt-2" />
        </div>

        <!-- Error Message -->
        <UAlert v-if="errorMessage" class="mt-4" color="error" variant="solid" :title="t('upload.error') || 'Error'"
            :description="errorMessage" />
    </div>
</template>

<style scoped></style>
