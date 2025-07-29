<script lang="ts" setup>
import type { TaskStatus } from "~/types/task";

const emit = defineEmits<{
    uploaded: [task: TaskStatus, file: File];
}>();

const { t } = useI18n();
const logger = useLogger();

// Track the conversion progress
const progressMessage = ref("");
const showProgress = ref(false);
const errorMessage = ref("");

// Track selected file
const selectedFile = ref<File | undefined>();
const isVideoFile = ref(false);

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
 * Extract audio from video file using ffmpeg.wasm
 */
async function extractAudioFromVideo(videoFile: File): Promise<Blob> {
    const { FFmpeg } = await import("@ffmpeg/ffmpeg");
    const { fetchFile, toBlobURL } = await import("@ffmpeg/util");

    progressMessage.value = t("upload.extractingAudio");

    const ffmpeg = new FFmpeg();

    // Load ffmpeg with proper URLs for Nuxt/Vite
    const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.10/dist/esm";
    await ffmpeg.load({
        coreURL: await toBlobURL(
            `${baseURL}/ffmpeg-core.js`,
            "text/javascript",
        ),
        wasmURL: await toBlobURL(
            `${baseURL}/ffmpeg-core.wasm`,
            "application/wasm",
        ),
    });

    // Set up basic error handling for FFmpeg
    ffmpeg.on("log", (_event) => {
        // Silently handle FFmpeg logs to reduce console noise
    });

    const inputFileName = "input_video";
    const outputFileName = "output_audio.wav";

    // Write input file
    await ffmpeg.writeFile(inputFileName, await fetchFile(videoFile));

    // Extract audio with good quality settings
    await ffmpeg.exec([
        "-i",
        inputFileName,
        "-vn", // No video
        "-acodec",
        "pcm_s16le",
        "-ab",
        "128k", // Audio bitrate
        "-ar",
        "16000", // Sample rate
        outputFileName,
    ]);

    // Read the output file
    const data = await ffmpeg.readFile(outputFileName);

    return new Blob([data], { type: "audio/wav" });
}

/**
 * Handles the file upload and conversion process
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
        let fileToUpload: File | Blob = mediaFile;

        if (isVideoFile.value) {
            // Automatically extract audio from video files
            showProgress.value = true;
            const audioBlob = await extractAudioFromVideo(mediaFile);

            // Create a File object from the blob with appropriate name
            const originalName = mediaFile.name;
            const audioFileName = originalName.replace(/\.[^/.]+$/, ".wav");
            fileToUpload = new File([audioBlob], audioFileName, {
                type: "audio/wav",
            });
        }

        await uploadFile(fileToUpload, mediaFile);
    } catch (error) {
        logger.error("Error processing media file:", error);
        errorMessage.value = t("upload.processingError");
    } finally {
        showProgress.value = false;
    }
};

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

    const response = await $fetch<TaskStatus>("/api/transcribe/submit", {
        body: formData,
        method: "POST",
    });

    emit("uploaded", response, originalFile);
}

defineExpose({ uploadFile });
</script>

<template>
    <div>
        <UInput
            type="file"
            accept="audio/*,video/*"
            size="xl"
            icon="i-heroicons-document-arrow-up"
            :disabled="showProgress"
            @change="loadAudio"
        />

        <div class="mt-4">
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

        <div v-if="showProgress" class="mt-4">
            <p>{{ progressMessage }}</p>
            <UProgress class="mt-2" />
        </div>

        <p v-if="errorMessage" class="text-red-500 mt-2">{{ errorMessage }}</p>
    </div>
</template>

<style scoped></style>
