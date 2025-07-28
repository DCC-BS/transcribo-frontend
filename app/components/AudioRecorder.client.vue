<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";

// Define emits for the component
const emit = defineEmits<{
    "recording-complete": [audioBlob: Blob];
    "recording-error": [error: Error];
}>();

// ------------- Composables -------------
const logger = useLogger();
const { convertWebmToMp3 } = useAudioConvertion();
const app = useNuxtApp();

// ------------- State variables -------------
// UI state
const isRecording = ref(false);
const isLoading = ref(false);
const errorMessage = ref("");
const microphoneAvailable = ref<boolean | undefined>(undefined);

// Audio recording state
const audioBlob = ref<Blob | undefined>(undefined);
const audioUrl = ref("");
const mediaRecorder = ref<MediaRecorder | undefined>(undefined);
const audioChunks = ref<Blob[]>([]);

// Timing and intervals
const recordingStartTime = ref(0);
const recordingTime = ref(0);
const elapsedTime = ref(0);
const recordingInterval = ref<NodeJS.Timeout | undefined>(undefined);
const visualizationInterval = ref<NodeJS.Timeout | undefined>(undefined);

// Audio visualization
const audioVisualization = ref<number[]>([]);
const audioContext = ref<AudioContext | undefined>(undefined);
const analyser = ref<AnalyserNode | undefined>(undefined);
const frequencyData = ref<Uint8Array | undefined>(undefined);

// ------------- Computed properties -------------
/**
 * Format recording time as MM:SS
 */
const formattedRecordingTime = computed(() => {
    const minutes = Math.floor(recordingTime.value / 60);
    const seconds = recordingTime.value % 60;
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
});

// ------------- Lifecycle hooks -------------
onMounted(async () => {
    // Check if microphone is available on mount
    microphoneAvailable.value = await checkMicrophoneAvailability();

    // Add event listener for handling background/foreground state
    document.addEventListener("visibilitychange", handleVisibilityChange);
});

onUnmounted(() => {
    // Clean up event listeners
    document.removeEventListener("visibilitychange", handleVisibilityChange);

    // Release audio URL if exists
    if (audioUrl.value) {
        URL.revokeObjectURL(audioUrl.value);
    }
});

// ------------- Watchers -------------
/**
 * Watch recording state to manage visualization
 */
watch(isRecording, (newVal) => {
    if (newVal) {
        // Start visualization when recording begins
        visualizationInterval.value = setInterval(
            () => updateAudioVisualization(),
            100,
        );
    } else if (visualizationInterval.value) {
        // Clean up visualization when recording stops
        clearInterval(visualizationInterval.value);
        visualizationInterval.value = undefined;

        // Close audio context if open
        if (audioContext.value) {
            audioContext.value.close();
            audioContext.value = undefined;
        }
    }
});

// ------------- Event Handlers -------------
/**
 * Handle document visibility change (background/foreground)
 */
function handleVisibilityChange(): void {
    // Only handle when recording and PWA is installed
    if (
        mediaRecorder.value?.state !== "recording" ||
        !app.$pwa?.isPWAInstalled
    ) {
        return;
    }

    if (document.hidden) {
        // Save elapsed time when app goes to background
        elapsedTime.value += recordingTime.value;
    } else {
        // Reinitialize visualization when app comes to foreground
        initializeAudioVisualization(mediaRecorder.value.stream);
        recordingStartTime.value = Date.now();
    }
}

/**
 * Handle data received from MediaRecorder
 */
function handleRecordingDataAvailable(event: BlobEvent): void {
    if (event.data.size > 0) {
        audioChunks.value.push(event.data);
    }
}

/**
 * Handle recording stop, process audio data
 */
async function handleStopRecording(stream: MediaStream): Promise<void> {
    // Create a blob from all chunks
    const blob = new Blob(audioChunks.value, { type: "audio/webm" });

    // Convert webm to mp3 format
    const mp3Blob = await convertWebmToMp3(blob, "recording");

    // Update state with processed audio
    audioBlob.value = mp3Blob;
    audioUrl.value = URL.createObjectURL(mp3Blob);

    // Release microphone
    for (const track of stream.getTracks()) {
        track.stop();
    }

    // Clear recording timer
    if (recordingInterval.value) {
        clearInterval(recordingInterval.value);
        recordingInterval.value = undefined;
    }
}

// ------------- Microphone Management -------------
/**
 * Check if microphone is available
 */
async function checkMicrophoneAvailability(): Promise<boolean> {
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const hasAudioInput = devices.some(
            (device) => device.kind === "audioinput",
        );

        if (!hasAudioInput) {
            errorMessage.value = "No microphone detected on your device.";
            return false;
        }

        return true;
    } catch (error) {
        logger.error("Error checking microphone availability:", error);
        errorMessage.value = "Unable to check for microphone devices.";
        return false;
    }
}

/**
 * Handle microphone access errors with specific messages
 */
function handleMicrophoneError(error: Error): void {
    isLoading.value = false;
    logger.error("Microphone access error:", error);

    // Set appropriate error message based on error type
    if (
        error.name === "NotFoundError" ||
        error.name === "DevicesNotFoundError"
    ) {
        errorMessage.value =
            "No microphone found. Please connect a microphone and try again.";
    } else if (
        error.name === "NotAllowedError" ||
        error.name === "PermissionDeniedError"
    ) {
        errorMessage.value =
            "Microphone access denied. Please allow microphone access in your browser settings.";
    } else if (
        error.name === "NotReadableError" ||
        error.name === "TrackStartError"
    ) {
        errorMessage.value =
            "Your microphone is in use by another application.";
    } else if (
        error.name === "OverconstrainedError" ||
        error.name === "ConstraintNotSatisfiedError"
    ) {
        errorMessage.value = "Microphone constraints cannot be satisfied.";
    } else if (error.name === "TypeError") {
        errorMessage.value =
            "No microphone found or it's not compatible with your browser.";
    } else {
        errorMessage.value = `Microphone error: ${error.message}`;
    }

    emit("recording-error", error);
}

// ------------- Audio Visualization -------------
/**
 * Initialize audio visualization with media stream
 */
function initializeAudioVisualization(stream: MediaStream): void {
    // Close existing context if it exists
    if (audioContext.value) {
        audioContext.value.close();
    }

    // Create new audio context and analyzer
    audioContext.value = new AudioContext();
    const source = audioContext.value.createMediaStreamSource(stream);
    analyser.value = audioContext.value.createAnalyser();
    analyser.value.fftSize = 256; // Set FFT size for frequency analysis
    frequencyData.value = new Uint8Array(analyser.value.frequencyBinCount);
    source.connect(analyser.value);
}

/**
 * Update audio visualization with frequency data
 */
function updateAudioVisualization(): void {
    if (analyser.value && frequencyData.value) {
        analyser.value.getByteFrequencyData(frequencyData.value);
        // Transform frequency data to visualization values (0-100%)
        audioVisualization.value = Array.from(frequencyData.value)
            .slice(0, 20)
            .map((value) => (value / 255) * 100);
    } else {
        audioVisualization.value = [];
    }
}

// ------------- Recording Controls -------------
/**
 * Start the audio recording process
 */
async function startRecording(): Promise<void> {
    isLoading.value = true;
    errorMessage.value = "";
    audioChunks.value = [];
    elapsedTime.value = 0;

    // Check if microphone is available before attempting to record
    const isAvailable = await checkMicrophoneAvailability();
    if (!isAvailable) {
        isLoading.value = false;
        return;
    }

    // Request access to the microphone
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
        });

        // Initialize visualization
        initializeAudioVisualization(stream);

        // Update UI state
        isLoading.value = false;
        isRecording.value = true;
        microphoneAvailable.value = true;

        // Create a new MediaRecorder instance
        mediaRecorder.value = new MediaRecorder(stream);

        // Setup for iOS background audio
        if ("mediaSession" in navigator) {
            navigator.mediaSession.metadata = new MediaMetadata({
                title: "Active Recording",
                artist: "Transcribo",
                album: "Transcribo",
            });
        }

        // Add event handlers
        mediaRecorder.value.ondataavailable = handleRecordingDataAvailable;
        mediaRecorder.value.onstop = async () =>
            await handleStopRecording(stream);

        // Start recording
        mediaRecorder.value.start();
        recordingStartTime.value = Date.now();
        recordingTime.value = 0;

        // Start the timer to display recording duration
        recordingInterval.value = setInterval(() => {
            recordingTime.value = Math.floor(
                (Date.now() - recordingStartTime.value) / 1000 +
                    elapsedTime.value,
            );
        }, 1000);
    } catch (error) {
        handleMicrophoneError(error as Error);
    }
}

/**
 * Stop the current recording
 */
function stopRecording(): void {
    if (mediaRecorder.value && isRecording.value) {
        isRecording.value = false;
        mediaRecorder.value.stop();
    }
}

/**
 * Reset the recorder to its initial state
 */
function resetRecording(): void {
    if (audioUrl.value) {
        URL.revokeObjectURL(audioUrl.value);
    }
    audioBlob.value = undefined;
    audioUrl.value = "";
    recordingTime.value = 0;
    errorMessage.value = "";
}

/**
 * Emit the recorded audio blob to the parent component
 */
function emitAudio(): void {
    if (audioBlob.value) {
        emit("recording-complete", audioBlob.value);
    }
}
</script>

<template>
    <div class="p-2 min-w-[400px] max-w-[500px] mx-auto">
        <div class="flex justify-center gap-2 mb-2">
            <UButton
                v-if="!isRecording && !audioBlob"
                color="primary"
                icon="i-heroicons-microphone"
                :disabled="isLoading"
                @click="startRecording"
            >
                Start Recording
            </UButton>
            <UButton
                v-if="isRecording"
                color="secondary"
                icon="i-heroicons-stop"
                @click="stopRecording"
            >
                Stop Recording
            </UButton>
            <UButton v-if="audioBlob" color="neutral" @click="resetRecording">
                Reset
            </UButton>
        </div>

        <div v-if="isRecording" class="recording-indicator">
            Recording in progress...
            <div class="recording-time">{{ formattedRecordingTime }}</div>
            <div class="audio-visualization">
                <div
                    v-for="(value, index) in audioVisualization"
                    :key="index"
                    class="bar"
                    :style="{ height: value + '%' }"
                />
            </div>
        </div>

        <div v-if="audioBlob" class="audio-preview">
            <audio :src="audioUrl" controls />
            <UButton @click="emitAudio">Use this recording</UButton>
        </div>

        <div v-if="errorMessage" class="error-message">
            <p>{{ errorMessage }}</p>
            <ul
                v-if="
                    errorMessage.includes('No microphone found') ||
                    errorMessage.includes('access denied')
                "
            >
                <li>Make sure your microphone is properly connected</li>
                <li>Check browser permissions for microphone access</li>
                <li>Try using a different browser</li>
                <li>Restart your device if the issue persists</li>
            </ul>
        </div>
    </div>
</template>

<style scoped>
.recording-indicator {
    color: #f44336;
    text-align: center;
    margin-bottom: 15px;
    animation: pulse 1.5s infinite;
}

.recording-time {
    font-family: monospace;
    font-size: 1.2rem;
    margin-top: 5px;
}

.audio-preview {
    display: flex;
    flex-direction: column;
    align-items: center;
}

.audio-preview audio {
    width: 100%;
    margin-bottom: 10px;
}

.error-message {
    color: #f44336;
    margin-top: 10px;
    font-size: 0.9rem;
    padding: 10px;
    border: 1px solid #f44336;
    border-radius: 4px;
    background-color: #ffebee;
}

.error-message ul {
    margin-top: 8px;
    margin-bottom: 0;
    padding-left: 20px;
}

.error-message li {
    margin-bottom: 4px;
}

.audio-visualization {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    height: 50px;
    margin-top: 10px;
}

.audio-visualization .bar {
    width: 4%;
    background-color: #4caf50;
    transition: height 0.1s ease-in-out;
}

@keyframes pulse {
    0% {
        opacity: 1;
    }

    50% {
        opacity: 0.5;
    }

    100% {
        opacity: 1;
    }
}
</style>
