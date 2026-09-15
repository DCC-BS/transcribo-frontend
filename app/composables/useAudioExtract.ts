import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile } from "@ffmpeg/util";
import { clamp } from "~/utils/math";

/**
 * Wraps ffmpeg output in a blob.
 *
 * @param data - Raw ffmpeg file data.
 * @param mimeType - Mime type of the resulting blob.
 * @returns The blob.
 * @throws When ffmpeg returned text instead of binary data.
 */
function toBlob(data: Uint8Array | string, mimeType: string): Blob {
    if (typeof data === "string") {
        throw new Error("Failed to convert audio: data is a string");
    }

    const arrBuf = data instanceof ArrayBuffer ? data : data.slice(0);
    const uint8 = new Uint8Array(arrBuf);
    return new Blob([uint8], { type: mimeType });
}

/**
 * Extracts a file name's extension.
 *
 * @param fileName - The file name.
 * @returns The extension without the dot, or an empty string when there is none.
 */
function extension(fileName: string): string {
    const lastDotIndex = fileName.lastIndexOf(".");
    return lastDotIndex > 0 ? fileName.substring(lastDotIndex + 1) : "";
}

/**
 * Removes a file name's extension.
 *
 * @param fileName - The file name.
 * @returns The file name without its extension.
 */
function stripExtension(fileName: string): string {
    const lastDotIndex = fileName.lastIndexOf(".");
    return lastDotIndex > 0 ? fileName.substring(0, lastDotIndex) : fileName;
}

// Forwarded untouched by the backend (see audio_converter.py); re-encoding adds a lossy generation.
const PASSTHROUGH_EXTENSIONS = ["mp3", "ogg", "oga", "opus"];

/**
 * ffmpeg-backed audio extraction for uploads, terminating the worker when the
 * owning component unmounts.
 *
 * @returns The extraction function.
 */
export const useAudioExtract = () => {
    const ffmpeg = new FFmpeg();

    onUnmounted(() => {
        ffmpeg.terminate();
    });

    /**
     * Uploads mp3/ogg audio as is; transcodes everything else to mono 48 kbit/s Opus.
     *
     * @param mediaFile - The source audio or video file.
     * @param onProgress - Optional callback receiving progress in percent.
     * @returns The extracted audio blob and its file name.
     * @throws When ffmpeg fails to transcode the file.
     */
    async function extractAudio(
        mediaFile: File,
        onProgress?: (percent: number) => void,
    ): Promise<{ audioBlob: Blob; audioFileName: string }> {
        // Untyped files go through ffmpeg: the backend rejects uploads without a content type.
        if (
            mediaFile.type.startsWith("audio/") &&
            PASSTHROUGH_EXTENSIONS.includes(
                extension(mediaFile.name).toLowerCase(),
            )
        ) {
            onProgress?.(100);
            return { audioBlob: mediaFile, audioFileName: mediaFile.name };
        }

        await ffmpeg.load();

        const audioFileName = `${stripExtension(mediaFile.name)}.ogg`;
        // Keep source extension so ffmpeg picks the right demuxer.
        const ext = extension(mediaFile.name) || "bin";
        const inputFileName = `input.${ext}`;

        const handleProgress = ({ progress }: { progress: number }) => {
            onProgress?.(clamp(progress * 100, 0, 100));
        };
        if (onProgress) {
            ffmpeg.on("progress", handleProgress);
        }

        try {
            await ffmpeg.writeFile(inputFileName, await fetchFile(mediaFile));
            await ffmpeg.exec([
                "-i",
                inputFileName,
                "-vn",
                "-c:a",
                "libopus",
                "-b:a",
                "48k",
                "-ac",
                "1",
                audioFileName,
            ]);
            const data = await ffmpeg.readFile(audioFileName);
            return {
                audioBlob: toBlob(data, "audio/ogg"),
                audioFileName,
            };
        } catch (error) {
            throw new Error(
                `Failed to extract audio: ${error instanceof Error ? error.message : "Unknown error"}`,
            );
        } finally {
            if (onProgress) {
                ffmpeg.off("progress", handleProgress);
            }
            await ffmpeg.deleteFile(inputFileName);
            await ffmpeg.deleteFile(audioFileName);
        }
    }

    return {
        extractAudio,
    };
};
