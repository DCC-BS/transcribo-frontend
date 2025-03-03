import { ref } from 'vue';

/**
 * Interface for the spectrogram generation options
 */
interface SpectrogramOptions {
    fftSize?: number;      // Size of FFT window for analysis
    framesPerSecond?: number; // Target frame rate for analysis
    maxFrames?: number;    // Maximum number of frames to generate (to prevent browser hanging)
}

/**
 * Interface for the spectrogram generation result
 */
interface SpectrogramResult {
    spectrogramData: Uint8Array[];  // The frequency data for each time frame
    sampleRate: number;             // Audio sample rate
    duration: number;               // Duration of audio in seconds
    fftSize: number;                // FFT size used for analysis
    isLoading: boolean;             // Loading state
    error: string | null;           // Error message if generation failed
}

/**
 * Composable for generating spectrogram data from audio files or buffers
 * @returns Methods and state for generating spectrograms
 */
export function useSpectrogramGenerator() {
    // State variables with proper typing
    const isLoading = ref<boolean>(false);
    const error = ref<string | null>(null);
    const audioContext = ref<AudioContext | null>(null);

    // Initialize the AudioContext if it doesn't exist
    const ensureAudioContext = (): AudioContext => {
        if (!audioContext.value) {
            audioContext.value = new AudioContext();
        }
        return audioContext.value;
    };

    /**
     * Generate spectrogram data from an audio file
     * @param {File} file - Audio file to analyze
     * @param {SpectrogramOptions} options - Options for spectrogram generation
     * @returns {Promise<SpectrogramResult>} - Resulting spectrogram data and metadata
     */
    const generateFromFile = async (
        file: File,
        options: SpectrogramOptions = {}
    ): Promise<SpectrogramResult> => {
        isLoading.value = true;
        error.value = null;

        try {
            const context = ensureAudioContext();

            // Decode the audio data
            const arrayBuffer: ArrayBuffer = await file.arrayBuffer();
            const audioBuffer: AudioBuffer = await context.decodeAudioData(arrayBuffer);

            // Generate the spectrogram data
            const result = await generateFromBuffer(audioBuffer, options);
            return result;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error generating spectrogram';
            console.error('Spectrogram generation error:', err);
            error.value = errorMessage;

            // Return an empty result with the error
            return {
                spectrogramData: [],
                sampleRate: 0,
                duration: 0,
                fftSize: 0,
                isLoading: false,
                error: errorMessage
            };
        } finally {
            isLoading.value = false;
        }
    };

    /**
     * Generate spectrogram data from an audio buffer
     * @param {AudioBuffer} buffer - Decoded audio data
     * @param {SpectrogramOptions} options - Options for spectrogram generation
     * @returns {Promise<SpectrogramResult>} - Resulting spectrogram data and metadata
     */
    const generateFromBuffer = async (
        buffer: AudioBuffer,
        options: SpectrogramOptions = {}
    ): Promise<SpectrogramResult> => {
        isLoading.value = true;
        error.value = null;

        try {
            // Set default values for options
            const fftSize: number = options.fftSize ?? 2048;
            const framesPerSecond: number = options.framesPerSecond ?? 60;
            const maxFrames: number = options.maxFrames ?? 3000;

            // Fallback to the manual frame-by-frame method
            return generateWithManualFrames(buffer, { fftSize, framesPerSecond, maxFrames });
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error generating spectrogram';
            console.error('Spectrogram generation error:', err);
            error.value = errorMessage;

            // Return an empty result with the error
            return {
                spectrogramData: [],
                sampleRate: buffer.sampleRate,
                duration: buffer.duration,
                fftSize: options.fftSize ?? 2048,
                isLoading: false,
                error: errorMessage
            };
        } finally {
            isLoading.value = false;
        }
    };

    /**
     * Generate spectrogram using AudioWorklet method (modern replacement for ScriptProcessor)
     * @param {AudioBuffer} buffer - Decoded audio data
     * @param {SpectrogramOptions} options - Options for generation
     * @returns {Promise<SpectrogramResult>} - Resulting spectrogram data
     */
    const generateWithAudioWorklet = async (
        buffer: AudioBuffer,
        options: SpectrogramOptions
    ): Promise<SpectrogramResult> => {
        const fftSize: number = options.fftSize ?? 2048;
        const sampleRate: number = buffer.sampleRate;
        const audioLength: number = buffer.length;

        // Create an offline audio context for processing the entire audio file at once
        const offlineContext: OfflineAudioContext = new OfflineAudioContext(
            1, audioLength, sampleRate
        );

        try {
            // Load the audio worklet module
            await offlineContext.audioWorklet.addModule('/spectrogramProcessor.js');

            // Create an analyzer node for FFT calculation
            const analyser: AnalyserNode = offlineContext.createAnalyser();
            analyser.fftSize = fftSize;
            analyser.smoothingTimeConstant = 0.5;
            const bufferLength: number = analyser.frequencyBinCount;

            // Create audio source node
            const source: AudioBufferSourceNode = offlineContext.createBufferSource();
            source.buffer = buffer;

            // Create AudioWorkletNode
            const workletNode = new AudioWorkletNode(offlineContext, 'spectrogram-processor');

            // Calculate appropriate frame rate
            const desiredFrameRate = options.framesPerSecond ?? 60;

            // Storage for spectrogram data
            const specData: Uint8Array[] = [];

            // Initialize the worklet with configuration
            workletNode.port.postMessage({
                type: 'init',
                fftSize: fftSize,
                frequencyBinCount: bufferLength,
                framerate: desiredFrameRate
            });

            // Handle messages from the worklet
            workletNode.port.onmessage = (event) => {
                if (event.data.type === 'audiodata') {
                    // Get raw audio data from the worklet
                    const channelData = event.data.channelData;

                    // Process this chunk with the analyzer
                    // Create a temporary buffer with this data
                    const tempBuffer = offlineContext.createBuffer(1, channelData.length, sampleRate);
                    tempBuffer.getChannelData(0).set(channelData);

                    // Feed it to the analyzer
                    const tempSource = offlineContext.createBufferSource();
                    tempSource.buffer = tempBuffer;
                    tempSource.connect(analyser);

                    // Get frequency data
                    const frequencyData = new Uint8Array(bufferLength);
                    analyser.getByteFrequencyData(frequencyData);

                    // Store the frequency data
                    specData.push(new Uint8Array(frequencyData));
                }
            };

            // Connect audio nodes
            source.connect(analyser);
            analyser.connect(workletNode);
            workletNode.connect(offlineContext.destination);

            // Start audio processing
            source.start(0);

            // Render the audio and collect the data
            await offlineContext.startRendering();

            console.log(`AudioWorklet spectrogram generated with ${specData.length} frames`);

            return {
                spectrogramData: specData,
                sampleRate: buffer.sampleRate,
                duration: buffer.duration,
                fftSize: fftSize,
                isLoading: false,
                error: null
            };
        } catch (err) {
            console.error("AudioWorklet rendering failed:", err);
            // Return empty result to trigger fallback
            return {
                spectrogramData: [],
                sampleRate: buffer.sampleRate,
                duration: buffer.duration,
                fftSize: fftSize,
                isLoading: false,
                error: err instanceof Error ? err.message : String(err)
            };
        }
    };

    /**
     * Generate spectrogram manually processing frames
     * @param {AudioBuffer} buffer - Decoded audio data
     * @param {SpectrogramOptions} options - Options for generation
     * @returns {Promise<SpectrogramResult>} - Resulting spectrogram data
     */
    const generateWithManualFrames = async (
        buffer: AudioBuffer,
        options: SpectrogramOptions
    ): Promise<SpectrogramResult> => {
        const context = ensureAudioContext();
        const fftSize: number = options.fftSize ?? 2048;
        const framesPerSecond: number = options.framesPerSecond ?? 60;
        const maxFrames: number = options.maxFrames ?? 3000;

        const sampleRate: number = buffer.sampleRate;
        const audioData: Float32Array = buffer.getChannelData(0); // Get first channel

        // Calculate hop size (samples between consecutive frames)
        const hopSize: number = Math.floor(sampleRate / framesPerSecond);

        console.log(`Manual frame generation: Using hop size ${hopSize} for ${framesPerSecond} fps`);

        // Create an analyzer for FFT calculations
        const analyser: AnalyserNode = context.createAnalyser();
        analyser.fftSize = fftSize;
        const bufferLength: number = analyser.frequencyBinCount;

        // Calculate total frames and limit them
        const numFrames: number = Math.floor(audioData.length / hopSize);
        const framesToProcess: number = Math.min(numFrames, maxFrames);

        console.log(`Generating ${framesToProcess} frames in manual mode`);

        const spectrogramData: Uint8Array[] = [];

        // Process each frame
        for (let frame: number = 0; frame < framesToProcess; frame++) {
            // Calculate positions for this frame
            const startSample: number = frame * hopSize;
            const endSample: number = Math.min(startSample + fftSize, audioData.length);

            if (frame % 500 === 0) {
                console.log(`Processing frame ${frame}/${framesToProcess}...`);
            }

            // Create a temporary buffer for this chunk
            const tempBuffer: AudioBuffer = context.createBuffer(1, fftSize, sampleRate);
            const tempChannel: Float32Array = tempBuffer.getChannelData(0);

            // Fill the buffer with audio data (with zero-padding if needed)
            for (let i: number = 0; i < fftSize; i++) {
                tempChannel[i] = (startSample + i < endSample) ? audioData[startSample + i] : 0;
            }

            // Create temporary context to process this frame
            const frameContext: OfflineAudioContext = new OfflineAudioContext(1, fftSize, sampleRate);
            const frameSource: AudioBufferSourceNode = frameContext.createBufferSource();
            frameSource.buffer = tempBuffer;

            const frameAnalyser: AnalyserNode = frameContext.createAnalyser();
            frameAnalyser.fftSize = fftSize;

            // Connect nodes
            frameSource.connect(frameAnalyser);
            frameAnalyser.connect(frameContext.destination);
            frameSource.start();

            // Wait for this frame to be processed
            await frameContext.startRendering();

            // Get frequency data
            const frequencyData: Uint8Array = new Uint8Array(bufferLength);
            frameAnalyser.getByteFrequencyData(frequencyData);

            // Store frequency data
            spectrogramData.push(new Uint8Array(frequencyData));
        }

        console.log(`Manual spectrogram generated with ${spectrogramData.length} frames`);

        return {
            spectrogramData,
            sampleRate: buffer.sampleRate,
            duration: buffer.duration,
            fftSize,
            isLoading: false,
            error: null
        };
    };

    return {
        generateFromFile,
        generateFromBuffer,
        isLoading,
        error
    };
}
