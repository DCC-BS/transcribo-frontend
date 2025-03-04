<script setup lang="ts">
import { ref, nextTick, onMounted, onUnmounted, computed } from 'vue';
import type { StageConfig } from 'konva/lib/Stage';
import type { LineConfig } from 'konva/lib/shapes/Line';
import type { ImageConfig } from 'konva/lib/shapes/Image';
import type { RectConfig } from 'konva/lib/shapes/Rect';
import type { TextConfig } from 'konva/lib/shapes/Text';
import { SeekToSecondsCommand, ZoomToCommand } from '~/types/commands';

interface AudioSpectrogramProps {
    audioFile: File | Blob;
    currentTime: number;
    duration: number;
    zoomX: number;
    offsetX: number;
}

const props = defineProps<AudioSpectrogramProps>();

const { generateFromFile } = useSpectrogramGenerator();
const { renderSpectrogram } = useSpectrogramRenderer();
const { executeCommand } = useCommandBus();

// Component state variables with proper typing
const container = ref<HTMLDivElement | null>(null); // Container div reference
const audioContext = ref<AudioContext | null>(null); // Web Audio API context
const audioBuffer = ref<AudioBuffer | null>(null); // Decoded audio data
const audioSrc = ref<string>(''); // URL to the audio file
const audioLoaded = ref<boolean>(false); // Flag to indicate if audio is loaded
const audioDuration = ref<number>(0); // Total audio duration in seconds
const canvasWidth = ref<number>(800); // Width of the spectrogram
const canvasHeight = ref<number>(200); // Height of the spectrogram
const spectrogramData = ref<Uint8Array[]>([]);
const spectrogramImage = ref<HTMLImageElement | null>(null);

// Mouse state tracking
const isMouseDown = ref<boolean>(false);
const stage = ref<any>(null);

onMounted(() => {
    // Initialize AudioContext on component mount
    audioContext.value = new AudioContext();
    loadAudio(props.audioFile);
});

onUnmounted(() => {
    // Cleanup event listeners when component unmounts
    isMouseDown.value = false;
});

watch(
    () => props.audioFile,
    async (newFile) => {
        if (newFile) {
            await loadAudio(newFile);
        }
    },
);

// Konva stage configuration
const stageWidth = computed(() => container.value?.clientWidth ?? canvasWidth.value);
const stageHeight = computed(() => canvasHeight.value);

const { toPixelScale, playheadLineConfig } = useMediaTimeline({
    mediaDuration: computed(() => props.duration),
    stageWidth,
    stageHeight,
    zoomX: computed(() => props.zoomX),
    offsetX: computed(() => props.offsetX),
    currentTime: computed(() => props.currentTime),
});

const configKonva = computed(
    () => ({
        width: stageWidth.value,
        height: stageHeight.value,
        offsetX: props.offsetX,
        scaleX: props.zoomX,
    }) as StageConfig,
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

    // Render spectrogram to an image
    const result = renderSpectrogram(
        spectrogramData.value,
        specResult.sampleRate,
        { colorMap: 'magma' },
    );

    // Create an image from the canvas
    const img = new Image();
    img.src = result.canvas.toDataURL();
    img.onload = () => {
        spectrogramImage.value = img;
        audioLoaded.value = true;
    };
};

// Spectrogram image configuration
const spectrogramImageConfig = computed(() => ({
    image: spectrogramImage.value,
    width: stageWidth.value,
    height: stageHeight.value,
    listening: false,
}) as ImageConfig);

// Background rectangle for capturing events
const backgroundRectConfig = computed(() => ({
    x: 0,
    y: 0,
    width: stageWidth.value,
    height: stageHeight.value,
    fill: 'transparent',
}) as RectConfig);

// Frequency labels
const frequencyLabels = computed(() => {
    if (!audioBuffer.value || stageHeight.value <= 50) return [];

    const labels: TextConfig[] = [];
    const audioSampleRate: number = audioBuffer.value?.sampleRate || 44100;
    const nyquist: number = audioSampleRate / 2; // Highest possible frequency

    // Create logarithmically spaced frequency points (e.g., 100Hz, 1kHz, 10kHz)
    const freqPoints: number[] = [
        100, 200, 500, 1000, 2000, 5000, 10000, 20000,
    ].filter((f) => f < nyquist);

    freqPoints.forEach((freq: number) => {
        // Logarithmic mapping
        const logFreqRatio: number = 1 - Math.log(freq) / Math.log(nyquist);
        const yPos: number = Math.floor(logFreqRatio * stageHeight.value);

        // Format frequency label (e.g., 1000Hz as "1kHz")
        const freqLabel: string = freq < 1000 ? `${freq}Hz` : `${freq / 1000}kHz`;

        labels.push({
            x: 8,
            y: yPos,
            text: freqLabel,
            fontSize: 10,
            fontFamily: 'Arial',
            fill: 'black',
        } as TextConfig);
    });

    return labels;
});

// Frequency axis background
const freqAxisBackground = computed(() => ({
    x: 0,
    y: 0,
    width: 40,
    height: stageHeight.value,
    fill: 'rgba(255, 255, 255, 0.7)',
    opacity: 0.7,
}) as RectConfig);

/**
 * Handles clicks on the spectrogram to seek to a specific position
 * @param {KonvaEventObject} event - Konva click event
 */
const handleStageClick = (event: any): void => {
    if (audioDuration.value === 0) return;

    // Get stage-relative coordinates
    const stage = event.target.getStage();
    const pointerPosition = stage.getPointerPosition();
    if (!pointerPosition) return;

    // Calculate the proportion of the click position relative to stage width
    const clickProportion = pointerPosition.x / stage.width();

    // Ensure the proportion is within bounds (0-1)
    const boundedProportion = Math.max(0, Math.min(1, clickProportion));

    // Calculate the corresponding time in the audio
    const clickTime = boundedProportion * audioDuration.value;

    // Update current time and seek to that position
    executeCommand(new SeekToSecondsCommand(clickTime));
};

/**
 * Calculates and seeks to time position based on mouse x coordinate
 * @param {any} stageRef - Reference to the Konva stage
 * @param {number} x - Mouse x coordinate
 */
const seekToPosition = (stageRef: any, x: number): void => {
    if (audioDuration.value === 0 || !stageRef) return;

    // Calculate the proportion of the mouse position relative to stage width
    const clickProportion = x / stageRef.width();

    // Ensure the proportion is within bounds (0-1)
    const boundedProportion = Math.max(0, Math.min(1, clickProportion));

    // Calculate the corresponding time in the audio
    const seekTime = boundedProportion * audioDuration.value;

    // Update current time and seek to that position
    executeCommand(new SeekToSecondsCommand(seekTime));
};

/**
 * Handles mouse down events on the spectrogram
 * @param {any} event - Konva mouse down event
 */
const handleMouseDown = (event: any): void => {
    isMouseDown.value = true;
    stage.value = event.target.getStage();

    // Also seek immediately on mouse down
    const pointerPosition = stage.value.getPointerPosition();
    if (pointerPosition) {
        seekToPosition(stage.value, pointerPosition.x);
    }
};

/**
 * Handles mouse move events for seeking when mouse is down
 * @param {any} event - Konva mouse move event
 */
const handleMouseMove = (event: any): void => {
    if (!isMouseDown.value || !stage.value) return;

    const pointerPosition = stage.value.getPointerPosition();
    if (pointerPosition) {
        seekToPosition(stage.value, pointerPosition.x);
    }
};

/**
 * Handles mouse up events to stop seeking
 */
const handleMouseUp = (): void => {
    isMouseDown.value = false;
};

/**
 * Handles wheel events for zooming centered at the mouse position
 * @param {KonvaEventObject} event - Konva wheel event
 */
function handleWheel(event: any): void {
    // Prevent the default scroll behavior
    event.evt.preventDefault();

    const stage = event.target.getStage();
    const pointerPos = stage.getPointerPosition();
    if (!pointerPos) return;

    // Get the pointer position relative to the current view
    const mousePointTo = {
        x: (pointerPos.x + props.offsetX) / props.zoomX,
        y: pointerPos.y / props.zoomX
    };

    // Calculate zoom factor based on wheel direction
    // Use smaller increments for smoother zooming
    const zoomStep = 0.05;
    const zoomFactor = event.evt.deltaY > 0 ? 1 - zoomStep : 1 + zoomStep;
    const newZoom = clamp(props.zoomX * zoomFactor, 1, 50);

    // Calculate new offsetX so that the mouse position stays fixed
    // This is the key to zooming at mouse position
    const newOffsetX = clamp(mousePointTo.x * newZoom - pointerPos.x, 0, stage.width());

    console.log('Zoom:', newZoom, 'Offset:', newOffsetX, 'zoomFactor', zoomFactor, 'props.zoomX', props.zoomX);

    // Update zoom and offset
    executeCommand(new ZoomToCommand(newOffsetX, newZoom));
}
</script>

<template>
    <div ref="container" class="audio-spectrogram">
        <!-- Audio spectrogram display using Konva, shown when audio is loaded -->
        <div v-if="audioLoaded">
            <v-stage :config="configKonva" @click="handleStageClick" @wheel="handleWheel" @mousedown="handleMouseDown"
                @mousemove="handleMouseMove" @mouseup="handleMouseUp" @mouseleave="handleMouseUp">
                <v-layer>
                    <!-- Spectrogram image -->
                    <v-image :config="spectrogramImageConfig" />

                    <!-- Frequency axis background -->
                    <v-rect :config="freqAxisBackground" />

                    <!-- Frequency labels -->
                    <v-text v-for="(labelConfig, index) in frequencyLabels" :key="index" :config="labelConfig" />

                    <!-- Playhead line -->
                    <v-line :config="playheadLineConfig" />

                    <!-- Transparent rectangle to capture events -->
                    <v-rect :config="backgroundRectConfig" />
                </v-layer>
            </v-stage>
        </div>
        <div v-else>
            <USkeleton :style="{ width: `${canvasWidth}px`, height: `${canvasHeight}px` }" />
        </div>
    </div>
</template>

<style scoped>
.audio-spectrogram {
    max-width: 800px;
    margin: 0 auto;
    user-select: none;
    /* Prevent text selection while dragging */
    cursor: pointer;
    /* Show pointer cursor to indicate the area is clickable */
}
</style>
