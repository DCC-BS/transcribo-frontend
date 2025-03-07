<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue';
import type { Stage, StageConfig } from 'konva/lib/Stage';
import type { ImageConfig } from 'konva/lib/shapes/Image';
import type { RectConfig } from 'konva/lib/shapes/Rect';
import type { TextConfig } from 'konva/lib/shapes/Text';
import { SeekToSecondsCommand } from '~/types/commands';
import type { KonvaPointerEvent } from 'konva/lib/PointerEvents';

interface AudioSpectrogramProps {
    audioFile: File | Blob;
    currentTime: number;
    duration: number;
    zoomX: number;
    startTime: number;
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
const spectrogramData = ref<Uint8Array[]>([]);
const spectrogramImage = ref<HTMLImageElement | null>(null);

// Mouse state tracking
const isMouseDown = ref<boolean>(false);

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
const stageWidth = computed(() => container.value?.clientWidth ?? 800);
const stageHeight = computed(() => 200);

const { playheadLineConfig, transformedLayerConfig, offsetX } = useMediaTimeline({
    mediaDuration: computed(() => props.duration),
    stageWidth,
    stageHeight,
    zoomX: computed(() => props.zoomX),
    startTime: computed(() => props.startTime),
    currentTime: computed(() => props.currentTime),
});

const configKonva = computed(
    () => ({
        width: stageWidth.value,
        height: stageHeight.value,
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

        console.log("spec img size", img.width, img.height);
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
const handleStageClick = (event: KonvaPointerEvent): void => {
    if (audioDuration.value === 0) return;

    // Get stage-relative coordinates
    const stage = event.target.getStage();

    if (!stage) return;

    const pointerPosition = stage.getPointerPosition();
    if (!pointerPosition) return;

    seekToPosition(stage, pointerPosition.x);
};

const seekToPosition = (stageRef: Stage, x: number): void => {
    if (audioDuration.value === 0 || !stageRef) return;

    // Calculate the proportion of the mouse position relative to stage width
    const clickProportion = x / stageRef.width();

    // Ensure the proportion is within bounds (0-1)
    const boundedProportion = Math.max(0, Math.min(1, clickProportion));

    // Calculate the corresponding time in the audio
    const seekTime = (boundedProportion / props.zoomX) * audioDuration.value + props.startTime;

    // Update current time and seek to that position
    executeCommand(new SeekToSecondsCommand(seekTime));
};

const handleMouseDown = (event: KonvaPointerEvent): void => {
    isMouseDown.value = true;
    const stage = event.target.getStage();

    if (!stage) return;

    // Also seek immediately on mouse down
    const pointerPosition = stage.getPointerPosition();
    if (pointerPosition) {
        seekToPosition(stage, pointerPosition.x);
    }
};

/**
 * Handles mouse move events for seeking when mouse is down
 * @param {any} event - Konva mouse move event
 */
const handleMouseMove = (event: KonvaPointerEvent): void => {
    if (!isMouseDown.value) return;

    const stage = event.target.getStage();

    if (!stage) return;

    const pointerPosition = stage.getPointerPosition();
    if (pointerPosition) {
        seekToPosition(stage, pointerPosition.x);
    }
};

/**
 * Handles mouse up events to stop seeking
 */
const handleMouseUp = (): void => {
    isMouseDown.value = false;
};
</script>

<template>
    <div ref="container" class="audio-spectrogram">
        <!-- Audio spectrogram display using Konva, shown when audio is loaded -->
        <div v-if="audioLoaded">
            <v-stage :config="configKonva" @click="handleStageClick" @mousedown="handleMouseDown"
                @mousemove="handleMouseMove" @mouseup="handleMouseUp" @mouseleave="handleMouseUp">

                <v-layer :config="transformedLayerConfig">
                    <!-- Spectrogram image -->
                    <v-image :config="spectrogramImageConfig" />
                </v-layer>
                <v-layer>
                    <!-- Frequency axis background -->
                    <v-rect :config="freqAxisBackground" />

                    <!-- Frequency labels -->
                    <v-text v-for="(labelConfig, index) in frequencyLabels" :key="index" :config="labelConfig" />

                    <!-- Transparent rectangle to capture events -->
                    <v-rect :config="backgroundRectConfig" />
                </v-layer>
                <v-layer :config="transformedLayerConfig">
                    <!-- Playhead line -->
                    <v-line :config="playheadLineConfig" />
                </v-layer>
            </v-stage>
        </div>
        <div v-else>
            <USkeleton :style="{ width: `${stageWidth}px`, height: `${stageHeight}px` }" />
        </div>
    </div>
</template>

<style scoped>
.audio-spectrogram {
    margin: 0 auto;
    user-select: none;
    /* Prevent text selection while dragging */
    cursor: pointer;
    /* Show pointer cursor to indicate the area is clickable */
}
</style>
