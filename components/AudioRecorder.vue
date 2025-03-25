<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import fixWebmDuration from 'fix-webm-duration';

// Define emits for the component
const emit = defineEmits<{
    'recording-complete': [audioBlob: Blob];
    'recording-error': [error: Error];
}>();

// State variables
const isRecording = ref(false);
const isLoading = ref(false);
const audioBlob = ref<Blob | undefined>(undefined);
const audioUrl = ref('');
const errorMessage = ref('');
const mediaRecorder = ref<MediaRecorder | undefined>(undefined);
const audioChunks = ref<Blob[]>([]);
const recordingStartTime = ref(0);
const recordingTime = ref(0);
const recordingInterval = ref<NodeJS.Timeout | undefined>(undefined);
const microphoneAvailable = ref<boolean | undefined>(undefined);

// Computed properties
const formattedRecordingTime = computed(() => {
    const minutes = Math.floor(recordingTime.value / 60);
    const seconds = recordingTime.value % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
});

/**
 * Check if microphone is available
 */
async function checkMicrophoneAvailability(): Promise<boolean> {
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const hasAudioInput = devices.some(device => device.kind === 'audioinput');

        if (!hasAudioInput) {
            errorMessage.value = "No microphone detected on your device.";
            return false;
        }

        return true;
    } catch (error) {
        console.error("Error checking microphone availability:", error);
        errorMessage.value = "Unable to check for microphone devices.";
        return false;
    }
}

/**
 * Handle microphone access errors with specific messages
 */
function handleMicrophoneError(error: Error): void {
    isLoading.value = false;
    console.error("Microphone access error:", error);

    if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        errorMessage.value = "No microphone found. Please connect a microphone and try again.";
    } else if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        errorMessage.value = "Microphone access denied. Please allow microphone access in your browser settings.";
    } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        errorMessage.value = "Your microphone is in use by another application.";
    } else if (error.name === 'OverconstrainedError' || error.name === 'ConstraintNotSatisfiedError') {
        errorMessage.value = "Microphone constraints cannot be satisfied.";
    } else if (error.name === 'TypeError') {
        errorMessage.value = "No microphone found or it's not compatible with your browser.";
    } else {
        errorMessage.value = `Microphone error: ${error.message}`;
    }

    emit('recording-error', error);
}

/**
 * Start the audio recording process
 */
async function startRecording(): Promise<void> {
    isLoading.value = true;
    errorMessage.value = '';
    audioChunks.value = [];

    // Check if microphone is available before attempting to record
    const isAvailable = await checkMicrophoneAvailability();
    if (!isAvailable) {
        isLoading.value = false;
        return;
    }

    // Request access to the microphone
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

        isLoading.value = false;
        isRecording.value = true;
        microphoneAvailable.value = true;

        // Create a new MediaRecorder instance
        mediaRecorder.value = new MediaRecorder(stream);

        // Event handler for data available from the recorder
        mediaRecorder.value.ondataavailable = (event) => {
            if (event.data.size > 0) {
                audioChunks.value.push(event.data);
            }
        };

        // Event handler for when recording stops
        mediaRecorder.value.onstop = async () => {
            // Create a blob from all chunks
            const blob = new Blob(audioChunks.value, { type: 'audio/webm' });

            console.log('Recording stopped:', blob);

            fixWebmDuration(blob, recordingTime.value * 1000).then((fixedBlob: Blob) => {
                audioBlob.value = fixedBlob;
                audioUrl.value = URL.createObjectURL(blob);

                // Stop all tracks in the stream to release the microphone
                stream.getTracks().forEach(track => track.stop());

                // Clear the recording timer
                if (recordingInterval.value) {
                    clearInterval(recordingInterval.value);
                    recordingInterval.value = undefined;
                }
            });
        };

        // Start recording
        mediaRecorder.value.start();
        recordingStartTime.value = Date.now();
        recordingTime.value = 0;

        // Start the timer to display recording duration
        recordingInterval.value = setInterval(() => {
            recordingTime.value = Math.floor((Date.now() - recordingStartTime.value) / 1000);
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
        console.log(recordingTime.value);
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
    audioUrl.value = '';
    recordingTime.value = 0;
    errorMessage.value = '';
}

/**
 * Emit the recorded audio blob to the parent component
 */
function emitAudio(): void {
    if (audioBlob.value) {
        emit('recording-complete', fixedBlob);
    }
}

/**
 * Check for microphone when component is mounted
 */
onMounted(async () => {
    microphoneAvailable.value = await checkMicrophoneAvailability();
});
</script>

<template>
    <div class="p-2 min-w-[400px] max-w-[500px] mx-auto">
        <div class="flex justify-center gap-2 mb-2">
            <UButton v-if="!isRecording && !audioBlob" color="primary" icon="i-heroicons-microphone"
                :disabled="isLoading" @click="startRecording">
                Start Recording
            </UButton>
            <UButton v-if="isRecording" color="secondary" icon="i-heroicons-stop" @click="stopRecording">
                Stop Recording
            </UButton>
            <UButton v-if="audioBlob" color="neutral" @click="resetRecording">
                Reset
            </UButton>
        </div>

        <div v-if="isRecording" class="recording-indicator">
            Recording in progress...
            <div class="recording-time">{{ formattedRecordingTime }}</div>
        </div>

        <div v-if="audioBlob" class="audio-preview">
            <audio :src="audioUrl" controls />
            <UButton @click="emitAudio">Use this recording</UButton>
        </div>

        <div v-if="errorMessage" class="error-message">
            <p>{{ errorMessage }}</p>
            <ul v-if="errorMessage.includes('No microphone found') || errorMessage.includes('access denied')">
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
