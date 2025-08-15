<script lang="ts" setup>
import type { TaskStatus } from "~/types/task";

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

/**
 * Get file duration for audio/video files
 */
function getFileDuration(file: File): Promise<string> {
    return new Promise((resolve) => {
        const url = URL.createObjectURL(file);
        const element = isVideoFile.value
            ? document.createElement("video")
            : document.createElement("audio");

        element.onloadedmetadata = () => {
            const duration = element.duration;
            const minutes = Math.floor(duration / 60);
            const seconds = Math.floor(duration % 60);
            URL.revokeObjectURL(url);
            resolve(`${minutes}:${seconds.toString().padStart(2, "0")}`);
        };

        element.onerror = () => {
            URL.revokeObjectURL(url);
            resolve("Unknown");
        };

        element.src = url;
    });
}

/**
 * Extract audio from video file using ffmpeg.wasm
 */
async function extractAudioFromVideo(videoFile: File): Promise<Blob> {
    const { FFmpeg } = await import("@ffmpeg/ffmpeg");
    const { fetchFile, toBlobURL } = await import("@ffmpeg/util");

    progressMessage.value = t("upload.extractingAudio");

    const ffmpeg = new FFmpeg();

    try {
        // Load FFmpeg using CDN for better compatibility
        await ffmpeg.load({
            coreURL: "https://unpkg.com/@ffmpeg/core@0.12.10/dist/esm/ffmpeg-core.js",
            wasmURL: "https://unpkg.com/@ffmpeg/core@0.12.10/dist/esm/ffmpeg-core.wasm",
        });

        ffmpeg.on("log", (event) => {
            // Log errors for diagnostics
            if (event.type === "fferr") {
                logger.error("FFmpeg error:", event.message);
            }
        });

        const inputFileName = "input_video";
        const outputFileName = "output_audio.wav";

        try {
            // Write input file
            await ffmpeg.writeFile(inputFileName, await fetchFile(videoFile));

            // Extract audio
            await ffmpeg.exec([
                "-i",
                inputFileName,
                "-vn", // No video
                "-acodec",
                "pcm_s16le",
                "-ar",
                "16000", // Sample rate
                outputFileName,
            ]);

            // Read the output file
            const data = await ffmpeg.readFile(outputFileName);

            // Clean up temporary files within ffmpeg
            try {
                await ffmpeg.deleteFile(inputFileName);
                await ffmpeg.deleteFile(outputFileName);
            } catch (cleanupError) {
                // Log cleanup errors but don't throw as we have the result
                logger.warn(
                    "Failed to cleanup temporary ffmpeg files:",
                    cleanupError,
                );
            }

            return new Blob([data as BlobPart], { type: "audio/wav" });
        } catch (processingError) {
            // Clean up any files that might have been created
            try {
                await ffmpeg.deleteFile(inputFileName);
                await ffmpeg.deleteFile(outputFileName);
            } catch {
                // Ignore cleanup errors when processing already failed
            }
            throw new Error(
                `Audio extraction failed: ${processingError instanceof Error ? processingError.message : "Unknown error"}`,
            );
        }
    } catch (error) {
        logger.error("Error during audio extraction:", error);
        throw new Error(
            `Failed to extract audio from video: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
    } finally {
        // Always terminate the ffmpeg instance to free resources
        try {
            await ffmpeg.terminate();
        } catch (terminateError) {
            logger.warn("Failed to terminate FFmpeg instance:", terminateError);
        }
    }
}

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
            const audioBlob = await extractAudioFromVideo(mediaFile);

            // Create a File object from the blob with appropriate name
            const originalName = mediaFile.name;
            const lastDotIndex = originalName.lastIndexOf(".");
            const audioFileName =
                lastDotIndex > 0
                    ? `${originalName.substring(0, lastDotIndex)}.wav`
                    : `${originalName}.wav`;
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

    // Helper to narrow an error to an HTTP status code
    function isHttpStatus(error: unknown, status: number): boolean {
        if (
            typeof error !== "object" ||
            error === undefined ||
            error === null
        ) {
            return false;
        }
        const e = error as Record<string, unknown>;
        // ofetch/FetchError may have statusCode
        if (typeof e.statusCode === "number" && e.statusCode === status) {
            return true;
        }
        // response?.status is available on some errors
        const resp = e.response as { status?: number } | undefined;
        if (resp && typeof resp.status === "number" && resp.status === status) {
            return true;
        }
        // direct status field fallback
        if (typeof e.status === "number" && e.status === status) {
            return true;
        }
        return false;
    }

    try {
        const response = await $api<TaskStatus>("/api/transcribe/submit", {
            body: formData,
            method: "POST",
        });
        emit("uploaded", response, originalFile);
    } catch (error) {
        // Handle unsupported media type (415) with a friendly toast
        if (isHttpStatus(error, 415)) {
            const toast = useToast();
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
            <UInput
                type="file"
                accept="audio/*,video/*"
                size="xl"
                icon="i-heroicons-document-arrow-up"
                :disabled="showProgress"
                @change="loadAudio"
                ref="fileInputRef"
            />

            <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                    {{ t("upload.numSpeakers") }}
                </label>
                <p class="text-xs text-gray-500 mb-2">
                    {{ t("upload.numSpeakersHelp") }}
                </p>
                <USelect
                    v-model="numSpeakers"
                    :items="speakerOptions"
                    :disabled="showProgress"
                    placeholder="Select number of speakers"
                />
            </div>
        </div>

        <!-- File Preview Section -->
        <div v-else-if="selectedFile" class="space-y-4">
            <UCard>
                <template #header>
                    <div class="flex items-center justify-between">
                        <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                            {{ t('upload.filePreview') || 'File Preview' }}
                        </h3>
                        <UButton
                            variant="ghost"
                            size="sm"
                            icon="i-heroicons-x-mark"
                            @click="clearSelectedFile"
                        />
                    </div>
                </template>

                <div class="space-y-4">
                    <!-- File Info -->
                    <div class="flex items-start gap-3">
                        <div class="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                            <UIcon 
                                :name="isVideoFile ? 'i-heroicons-video-camera' : 'i-heroicons-musical-note'" 
                                class="w-6 h-6 text-blue-600 dark:text-blue-400" 
                            />
                        </div>
                        <div class="flex-1 min-w-0">
                            <p class="font-medium text-gray-900 dark:text-white truncate">
                                {{ selectedFile.name }}
                            </p>
                            <p class="text-sm text-gray-500 dark:text-gray-400">
                                {{ formatFileSize(selectedFile.size) }}
                                <span v-if="isVideoFile" class="ml-2 px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs rounded">
                                    {{ t('upload.videoFile') || 'Video' }}
                                </span>
                                <span v-else class="ml-2 px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs rounded">
                                    {{ t('upload.audioFile') || 'Audio' }}
                                </span>
                            </p>
                            <p v-if="isVideoFile" class="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                {{ t('upload.audioWillBeExtracted') || 'Audio will be extracted for transcription' }}
                            </p>
                        </div>
                    </div>

                    <!-- Speaker Configuration -->
                    <div class="border-t pt-4">
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            {{ t("upload.numSpeakers") }}
                        </label>
                        <p class="text-xs text-gray-500 dark:text-gray-400 mb-2">
                            {{ t("upload.numSpeakersHelp") }}
                        </p>
                        <USelect
                            v-model="numSpeakers"
                            :items="speakerOptions"
                            :disabled="showProgress"
                            placeholder="Select number of speakers"
                        />
                    </div>

                    <!-- Action Buttons -->
                    <div class="flex gap-3 pt-4 border-t">
                        <UButton
                            color="primary"
                            size="lg"
                            :loading="showProgress"
                            :disabled="showProgress"
                            @click="useThisFile"
                        >
                            <template #leading>
                                <UIcon name="i-heroicons-play" />
                            </template>
                            {{ t('upload.useThisFile') || 'Use this file' }}
                        </UButton>
                        
                        <UButton
                            variant="ghost"
                            size="lg"
                            :disabled="showProgress"
                            @click="clearSelectedFile"
                        >
                            {{ t('upload.selectDifferentFile') || 'Select different file' }}
                        </UButton>
                    </div>
                </div>
            </UCard>
        </div>

        <!-- Progress Section -->
        <div v-if="showProgress" class="mt-4">
            <p class="text-sm text-gray-600 dark:text-gray-400">{{ progressMessage }}</p>
            <UProgress class="mt-2" />
        </div>

        <!-- Error Message -->
        <UAlert
            v-if="errorMessage"
            class="mt-4"
            color="error"
            variant="solid"
            :title="t('upload.error') || 'Error'"
            :description="errorMessage"
        />
    </div>
</template>

<style scoped></style>
