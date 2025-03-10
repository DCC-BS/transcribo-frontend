/**
 * Utility functions for converting media files to WAV format using Web Audio API
 */

/**
 * Configuration options for audio conversion
 */
interface AudioConversionOptions {
    /** Sample rate for the output WAV file (default: 44100) */
    sampleRate?: number;
    /** Number of channels for the output WAV file (default: 2) */
    channels?: number;
    /** Progress callback function */
    onProgress?: (progress: number) => void;
}

/**
 * Result of a media conversion
 */
interface ConversionResult {
    /** The converted WAV file */
    wavFile: File;
    /** Duration of the audio in seconds */
    duration: number;
    /** Sample rate of the converted audio */
    sampleRate: number;
    /** Number of channels in the converted audio */
    channels: number;
}

/**
 * Converts an audio or video file to WAV format
 * 
 * @param mediaFile - The audio or video file to convert
 * @param options - Conversion options
 * @returns Promise resolving to the conversion result containing the WAV file
 */
export async function convertToWav(
    mediaFile: File,
    options: AudioConversionOptions = {}
): Promise<ConversionResult> {
    // Set default options
    const sampleRate = options.sampleRate || 44100;
    const channels = options.channels || 2;
    const onProgress = options.onProgress || ((progress: number) => { });

    // Create object URL for the file
    const fileUrl = URL.createObjectURL(mediaFile);

    try {
        // Create audio context
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
            sampleRate: sampleRate,
        });

        // Notify progress
        onProgress(0.1);

        // Create audio element for media file
        const audioElement = new Audio();
        audioElement.src = fileUrl;

        // Wait for audio to load metadata
        await new Promise<void>((resolve) => {
            audioElement.onloadedmetadata = () => resolve();
        });

        // Create media element source
        const source = audioContext.createMediaElementSource(audioElement);

        // Create script processor node to capture audio data
        const processor = audioContext.createScriptProcessor(4096, channels, channels);

        // Buffer to store audio data
        const audioChunks: Float32Array[] = [];

        // Process audio data
        processor.onaudioprocess = (e) => {
            // Clone the channel data to prevent it from being overwritten
            for (let i = 0; i < channels; i++) {
                const channelData = e.inputBuffer.getChannelData(i);
                audioChunks.push(new Float32Array(channelData));
            }

            // Estimate and report progress
            const currentTime = audioElement.currentTime;
            const totalTime = audioElement.duration;
            const progress = 0.1 + 0.8 * (currentTime / totalTime);
            onProgress(Math.min(0.9, progress)); // Cap at 90% until processing is done
        };

        // Connect nodes
        source.connect(processor);
        processor.connect(audioContext.destination);

        // Play audio and wait for it to finish
        audioElement.play();
        await new Promise<void>((resolve) => {
            audioElement.onended = () => resolve();
        });

        // Disconnect nodes after processing
        source.disconnect();
        processor.disconnect();

        // Create WAV file from audio chunks
        const wavFile = createWavFile(audioChunks, sampleRate, channels, mediaFile.name);

        // Report completion
        onProgress(1);

        return {
            wavFile,
            duration: audioElement.duration,
            sampleRate,
            channels
        };
    } finally {
        // Clean up object URL
        URL.revokeObjectURL(fileUrl);
    }
}

/**
 * Creates a WAV file from audio data
 * 
 * @param audioChunks - Array of Float32Arrays containing audio channel data
 * @param sampleRate - Sample rate of the audio
 * @param channels - Number of audio channels
 * @param originalName - Original file name
 * @returns The created WAV file
 */
function createWavFile(
    audioChunks: Float32Array[],
    sampleRate: number,
    channels: number,
    originalName: string
): File {
    // Merge chunks into a single buffer per channel
    const channelBuffers: Float32Array[] = [];
    for (let i = 0; i < channels; i++) {
        channelBuffers[i] = new Float32Array(audioChunks.length / channels * audioChunks[0].length);
    }

    // Fill channel buffers
    let offset = 0;
    for (let i = 0; i < audioChunks.length; i += channels) {
        for (let c = 0; c < channels; c++) {
            const chunk = audioChunks[i + c];
            channelBuffers[c].set(chunk, offset);
        }
        offset += audioChunks[0].length;
    }

    // Interleave channels
    const interleaved = interleaveChannels(channelBuffers, channels);

    // Create WAV header
    const wavHeader = createWavHeader(interleaved.length * 2, sampleRate, channels);

    // Create WAV data
    const wavData = new Uint8Array(wavHeader.length + interleaved.length * 2);
    wavData.set(wavHeader);

    // Convert audio samples to 16-bit PCM
    const view = new DataView(wavData.buffer, wavHeader.length);
    for (let i = 0; i < interleaved.length; i++) {
        // Convert float to 16-bit PCM
        const s = Math.max(-1, Math.min(1, interleaved[i]));
        const pcm = s < 0 ? s * 0x8000 : s * 0x7FFF;
        view.setInt16(i * 2, pcm, true); // true for little-endian
    }

    // Create file name with .wav extension
    const fileName = originalName.replace(/\.[^/.]+$/, "") + ".wav";

    // Create WAV file
    return new File([wavData], fileName, { type: "audio/wav" });
}

/**
 * Interleaves multiple audio channels into a single buffer
 * 
 * @param channelBuffers - Array of channel buffers
 * @param channels - Number of channels
 * @returns Interleaved audio data
 */
function interleaveChannels(channelBuffers: Float32Array[], channels: number): Float32Array {
    const length = channelBuffers[0].length;
    const result = new Float32Array(length * channels);

    for (let i = 0; i < length; i++) {
        for (let c = 0; c < channels; c++) {
            result[i * channels + c] = channelBuffers[c][i];
        }
    }

    return result;
}

/**
 * Creates a WAV header for the given parameters
 * 
 * @param dataLength - Length of the audio data in bytes
 * @param sampleRate - Sample rate of the audio
 * @param channels - Number of audio channels
 * @returns WAV header as Uint8Array
 */
function createWavHeader(dataLength: number, sampleRate: number, channels: number): Uint8Array {
    const header = new ArrayBuffer(44);
    const view = new DataView(header);

    // RIFF chunk descriptor
    writeString(view, 0, "RIFF");
    view.setUint32(4, 36 + dataLength, true);
    writeString(view, 8, "WAVE");

    // fmt sub-chunk
    writeString(view, 12, "fmt ");
    view.setUint32(16, 16, true); // fmt chunk size
    view.setUint16(20, 1, true); // audio format (1 = PCM)
    view.setUint16(22, channels, true); // number of channels
    view.setUint32(24, sampleRate, true); // sample rate
    view.setUint32(28, sampleRate * channels * 2, true); // byte rate
    view.setUint16(32, channels * 2, true); // block align
    view.setUint16(34, 16, true); // bits per sample

    // data sub-chunk
    writeString(view, 36, "data");
    view.setUint32(40, dataLength, true); // data chunk size

    return new Uint8Array(header);
}

/**
 * Helper function to write a string to a DataView
 * 
 * @param view - DataView to write to
 * @param offset - Byte offset
 * @param string - String to write
 */
function writeString(view: DataView, offset: number, string: string): void {
    for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
    }
}
