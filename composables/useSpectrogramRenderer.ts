import {
    getColorMap,
    type ColorMapType,
} from '../services/colorMapService';

/**
 * Interface for spectrogram rendering options
 */
interface RenderOptions {
    width?: number; // Width of the canvas in pixels
    height?: number; // Height of the canvas in pixels
    gamma?: number; // Gamma correction value (0.1-1.0)
    logBase?: number; // Base for logarithmic scaling
    colorMap?: ColorMapType; // Color mapping style
    showFrequencyLabels?: boolean; // Whether to display frequency labels
    frequencyRange?: [number, number]; // Optional min/max frequency range to display
}

/**
 * Interface for spectrogram rendering result
 */
interface RenderResult {
    canvas: HTMLCanvasElement; // The canvas with rendered spectrogram
    imageData: ImageData; // The raw image data
}

const defaultOptions: RenderOptions = {
    width: 800,
    height: 200,
    gamma: 0.3,
    logBase: 10,
    colorMap: 'rainbow',
};

/**
 * Composable for rendering spectrogram data to a canvas
 * @returns Methods and state for rendering spectrograms
 */
export function useSpectrogramRenderer() {
    // State
    const isRendering = ref<boolean>(false);
    const error = ref<string | null>(null);

    /**
     * Downsamples spectrogram data to improve performance
     * @param {Uint8Array[]} data - The original spectrogram data
     * @param {number} targetHeight - The desired height after downsampling
     * @returns {Uint8Array[]} - Downsampled spectrogram data
     */
    function downsampleSpectrogramData(data: Uint8Array[], targetHeight: number): Uint8Array[] {
        const originalWidth = data.length;
        const originalHeight = data[0].length;

        // If original height is already below target, return the original data
        if (originalHeight <= targetHeight) {
            return data;
        }

        console.log(`Downsampling spectrogram from height ${originalHeight} to ${targetHeight}`);

        // Calculate the sampling step (how many original rows to combine into one)
        const samplingFactor = originalHeight / targetHeight;

        // Create a new array for downsampled data
        const downsampled: Uint8Array[] = new Array(originalWidth);

        // For each column in the original data
        for (let x = 0; x < originalWidth; x++) {
            downsampled[x] = new Uint8Array(targetHeight);

            // For each row in the target height
            for (let y = 0; y < targetHeight; y++) {
                // Calculate the range of rows to average from original data
                const startRow = Math.floor(y * samplingFactor);
                const endRow = Math.floor((y + 1) * samplingFactor);

                // Average the values in this range
                let sum = 0;
                let count = 0;

                for (let j = startRow; j < endRow && j < originalHeight; j++) {
                    sum += data[x][j];
                    count++;
                }

                // Set the downsampled value (average of original values)
                downsampled[x][y] = count > 0 ? Math.floor(sum / count) : 0;
            }
        }

        return downsampled;
    }

    /**
     * Renders spectrogram data to a canvas with various visualization options
     * @param {Uint8Array[]} spectrogramData - The frequency data from spectrogram analysis
     * @param {number} sampleRate - The audio sample rate in Hz
     * @param {RenderOptions} options - Rendering options
     * @returns {RenderResult} - The rendering result with canvas and helper methods
     */
    const renderSpectrogram = (
        spectrogramData: Uint8Array[],
        sampleRate: number,
        options: RenderOptions = {},
    ): RenderResult => {
        isRendering.value = true;
        error.value = null;

        try {
            options = { ...defaultOptions, ...options };

            const logBase = options.logBase!;
            const gamma = options.gamma!;
            const colorMap = options.colorMap!;

            // Validate inputs
            if (!spectrogramData?.length) {
                throw new Error('No spectrogram data provided');
            }

            // Get original dimensions based on data
            const originalWidth: number = spectrogramData.length;
            const originalHeight: number = spectrogramData[0].length;

            // Downsample the data if it's taller than 400 pixels
            const processedData = originalHeight > 400
                ? downsampleSpectrogramData(spectrogramData, 400)
                : spectrogramData;

            // Get new dimensions after potential downsampling
            const dataWidth: number = processedData.length;
            const dataHeight: number = processedData[0].length;

            // Create a temporary canvas for the raw spectrogram data
            const canvas = document.createElement('canvas');
            canvas.width = dataWidth;
            canvas.height = dataHeight;
            const tempCtx: CanvasRenderingContext2D | null =
                canvas.getContext('2d');

            if (!tempCtx) {
                throw new Error(
                    'Failed to get 2D context from temporary canvas',
                );
            }

            // Find data range for normalization
            const maxFrequency: number = processedData.reduce(
                (max: number, data: Uint8Array) =>
                    Math.max(max, ...Array.from(data)),
                0,
            );
            const minFrequency: number = processedData.reduce(
                (min: number, data: Uint8Array) =>
                    Math.min(min, ...Array.from(data)),
                255,
            );

            console.log('Frequency range:', minFrequency, 'to', maxFrequency);

            if (originalHeight > 400) {
                console.log(`Using downsampled data: ${originalWidth}x${originalHeight} → ${dataWidth}x${dataHeight}`);
            }

            // Ensure valid range
            const range: number = maxFrequency - minFrequency || 1;

            // Apply logarithmic scaling parameters
            const logMin: number = Math.log(1) / Math.log(logBase);
            const logMax: number = Math.log(dataHeight) / Math.log(logBase);
            const logRange: number = logMax - logMin;

            // Get the appropriate color mapping function
            const getColor = getColorMap(colorMap);

            // Create image data for pixel manipulation
            const imageData: ImageData = tempCtx.createImageData(
                dataWidth,
                dataHeight,
            );

            // Map frequency data to pixel colors with logarithmic y-axis scaling
            for (let x: number = 0; x < dataWidth; x++) {
                for (let y: number = 0; y < dataHeight; y++) {
                    // Apply logarithmic scaling to y-coordinate (frequency axis)
                    const originalY: number = dataHeight - y - 1;

                    // Convert to logarithmic scale
                    const logY: number =
                        Math.log(originalY + 1) / Math.log(logBase);

                    // Normalize to 0-1 range
                    const normalizedLogY: number = (logY - logMin) / logRange;

                    // Map to pixel space
                    const scaledY: number = Math.floor(
                        normalizedLogY * (dataHeight - 1),
                    );

                    // Get frequency value
                    const value: number =
                        processedData[x][dataHeight - scaledY - 1] || 0;

                    // Calculate index in image data array
                    const index: number = (y * dataWidth + x) * 4;

                    // Apply gamma correction for better contrast
                    const normalizedValue: number = Math.pow(
                        (value - minFrequency) / range,
                        gamma,
                    );

                    // Get color from color map service
                    const color = getColor(normalizedValue);

                    // Set pixel color in image data
                    imageData.data[index + 0] = color.r; // Red
                    imageData.data[index + 1] = color.g; // Green
                    imageData.data[index + 2] = color.b; // Blue
                    imageData.data[index + 3] = 255; // Alpha (fully opaque)
                }
            }

            // Put image data on temporary canvas
            tempCtx.putImageData(imageData, 0, 0);

            return {
                canvas,
                imageData,
            };
        } catch (err) {
            const errorMessage =
                err instanceof Error ? err.message : 'Unknown rendering error';
            console.error('Spectrogram rendering error:', err);
            error.value = errorMessage;

            // Create a fallback canvas with error message
            const errorCanvas = document.createElement('canvas');
            errorCanvas.width = options.width ?? 800;
            errorCanvas.height = options.height ?? 200;

            const ctx = errorCanvas.getContext('2d');
            if (ctx) {
                ctx.fillStyle = '#f8f8f8';
                ctx.fillRect(0, 0, errorCanvas.width, errorCanvas.height);
                ctx.fillStyle = 'red';
                ctx.font = '14px Arial';
                ctx.fillText(
                    `Error rendering spectrogram: ${errorMessage}`,
                    10,
                    errorCanvas.height / 2,
                );
            }

            // Return the error canvas with minimal functionality
            return {
                canvas: errorCanvas,
                imageData: ctx
                    ? ctx.createImageData(1, 1)
                    : new ImageData(1, 1),
            };
        } finally {
            isRendering.value = false;
        }
    };

    return {
        renderSpectrogram,
        isRendering,
        error,
    };
}
