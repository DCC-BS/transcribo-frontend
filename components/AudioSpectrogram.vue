<script setup lang="ts">
import { ref, nextTick, onMounted } from 'vue';
import { SeekToSecondsCommand } from '~/types/commands';

interface AudioSpectrogramProps {
    audioFile: File | Blob;
    currentTime: number;
    duration: number;
}

const props = defineProps<AudioSpectrogramProps>();

const { generateFromFile } = useSpectrogramGenerator();
const { renderSpectrogram } = useSpectrogramRenderer();
const { executeCommand } = useCommandBus();

// Component state variables with proper typing
const spectrogramCanvas = ref<HTMLCanvasElement | null>(null); // Reference to the canvas element
const audioContext = ref<AudioContext | null>(null); // Web Audio API context
const audioBuffer = ref<AudioBuffer | null>(null); // Decoded audio data
const audioSrc = ref<string>(''); // URL to the audio file
const audioLoaded = ref<boolean>(false); // Flag to indicate if audio is loaded
const audioDuration = ref<number>(0); // Total audio duration in seconds
const canvasWidth = ref<number>(800); // Width of the spectrogram canvas
const canvasHeight = ref<number>(200); // Height of the spectrogram canvas
const spectrogramData = ref<Uint8Array[]>([]);
const spectogramImgCanvas = ref<HTMLCanvasElement | null>(null);

onMounted(() => {
    // Initialize AudioContext on component mount
    audioContext.value = new AudioContext();
    loadAudio(props.audioFile);
});

watch(
    () => props.audioFile,
    async (newFile) => {
        if (newFile) {
            await loadAudio(newFile);
        }
    },
);

watch(
    () => props.currentTime,
    () => {
        draw();
    },
);

/**
 * Loads and processes the audio file
 * @param {File} file - The audio file to be loaded
 */
const loadAudio = async (file: Blob): Promise<void> => {
    if (!audioContext.value) {
        return;
    }

    audioSrc.value = URL.createObjectURL(file); // Create a URL for the audio file

    // Decode the audio data
    const specResult = await generateFromFile(file);
    spectrogramData.value = specResult.spectrogramData;

    const arrayBuffer: ArrayBuffer = await file.arrayBuffer();
    audioBuffer.value = await audioContext.value.decodeAudioData(arrayBuffer);
    audioDuration.value = audioBuffer.value.duration;

    const result = renderSpectrogram(
        spectrogramData.value,
        specResult.sampleRate,
        { colorMap: 'magma' },
    );
    spectogramImgCanvas.value = result.canvas;

    audioLoaded.value = true;
    nextTick(() => drawSpectrogram());
};

/**
 * Draws the spectrogram on the canvas
 * Using logarithmic scaling to better represent how humans perceive sound frequencies
 */
const drawSpectrogram = (): void => {
    if (
        !spectrogramCanvas.value ||
        !spectogramImgCanvas.value ||
        !audioBuffer.value
    ) {
        return;
    }

    const canvas: HTMLCanvasElement = spectrogramCanvas.value;
    const ctx: CanvasRenderingContext2D | null = canvas.getContext('2d');

    if (!ctx) {
        console.error('Failed to get 2D context from canvas');
        return;
    }

    const dataWidth: number = spectogramImgCanvas.value.width;
    const dataHeight: number = spectogramImgCanvas.value.height;

    // Clear the main canvas before drawing new content
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw the temp canvas onto the main canvas with proper scaling
    // This properly scales the spectrogram to fit the canvas dimensions
    ctx.drawImage(
        spectogramImgCanvas.value,
        0,
        0,
        dataWidth,
        dataHeight,
        0,
        0,
        canvas.width,
        canvas.height,
    );

    // Add frequency axis labels with logarithmic scale marks
    if (canvas.height > 50) {
        // Only add labels if canvas is tall enough
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.fillRect(0, 0, 40, canvas.height);

        ctx.fillStyle = 'black';
        ctx.font = '10px Arial';

        // Draw logarithmically spaced frequency labels
        const audioSampleRate: number = audioBuffer.value?.sampleRate || 44100;
        const nyquist: number = audioSampleRate / 2; // Highest possible frequency

        // Create logarithmically spaced frequency points (e.g., 100Hz, 1kHz, 10kHz)
        const freqPoints: number[] = [
            100, 200, 500, 1000, 2000, 5000, 10000, 20000,
        ].filter((f) => f < nyquist);

        freqPoints.forEach((freq: number) => {
            // Logarithmic mapping
            const logFreqRatio: number = 1 - Math.log(freq) / Math.log(nyquist);
            const yPos: number = Math.floor(logFreqRatio * canvas.height);

            // Draw tick mark and label
            ctx.fillStyle = 'black';
            ctx.fillRect(0, yPos, 5, 1);

            // Format frequency label (e.g., 1000Hz as "1kHz")
            const freqLabel: string =
                freq < 1000 ? `${freq}Hz` : `${freq / 1000}kHz`;
            ctx.fillText(freqLabel, 8, yPos + 4);
        });
    }
};

/**
 * Draws the playhead indicator on top of the spectrogram
 */
const draw = (): void => {
    if (!spectrogramCanvas.value) return;

    const canvas: HTMLCanvasElement = spectrogramCanvas.value;
    const ctx: CanvasRenderingContext2D | null = canvas.getContext('2d');

    if (!ctx) return;

    const x: number = (props.currentTime / audioDuration.value) * canvas.width;

    // Redraw the spectrogram to clear the previous playhead
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawSpectrogram();

    // Draw the playhead
    ctx.strokeStyle = 'red';
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
};

/**
 * Handles clicks on the spectrogram canvas to seek to a specific position
 * @param {MouseEvent} event - Mouse click event
 */
const handleCanvasClick = (event: MouseEvent): void => {
    if (!spectrogramCanvas.value || audioDuration.value === 0) return;

    // Get the canvas-relative coordinates
    const rect = spectrogramCanvas.value.getBoundingClientRect();
    const clickX = event.clientX - rect.left;

    // Calculate the proportion of the click position relative to canvas width
    const clickProportion = clickX / rect.width;

    // Calculate the corresponding time in the audio
    const clickTime = clickProportion * audioDuration.value;

    // Update current time and seek to that position
    executeCommand(new SeekToSecondsCommand(clickTime));
};
</script>

<template>
    <div class="audio-spectrogram">
        <!-- Audio player and spectrogram display, shown when audio is loaded -->
        <div v-if="audioLoaded">
            <!-- Canvas for displaying the spectrogram visualization with click event -->
            <canvas
                ref="spectrogramCanvas"
                :width="canvasWidth"
                :height="canvasHeight"
                @click="handleCanvasClick"
            />
        </div>
    </div>
</template>

<style scoped>
.audio-spectrogram {
    max-width: 800px;
    margin: 0 auto;
}

canvas {
    width: 100%;
    height: auto;
    border: 1px solid #ccc;
    cursor: pointer;
    /* Show pointer cursor to indicate clickable area */
}

.controls {
    margin-top: 10px;
    display: flex;
    align-items: center;
    gap: 10px;
}

input[type='range'] {
    flex-grow: 1;
}

/* Add some button styling */
button {
    padding: 5px 10px;
    cursor: pointer;
}
</style>
