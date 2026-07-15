import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile } from "@ffmpeg/util";

function toBlob(data: Uint8Array | string, mimeType: string): Blob {
    if (typeof data === "string") {
        throw new Error("Failed to convert audio: data is a string");
    }

    const arrBuf = data instanceof ArrayBuffer ? data : data.slice(0);
    const uint8 = new Uint8Array(arrBuf);
    return new Blob([uint8], { type: mimeType });
}

function extension(fileName: string): string {
    const lastDotIndex = fileName.lastIndexOf(".");
    return lastDotIndex > 0 ? fileName.substring(lastDotIndex + 1) : "";
}

function stripExtension(fileName: string): string {
    const lastDotIndex = fileName.lastIndexOf(".");
    return lastDotIndex > 0 ? fileName.substring(0, lastDotIndex) : fileName;
}

export const useAudioExtract = () => {
    const ffmpeg = new FFmpeg();

    onUnmounted(() => {
        ffmpeg.terminate();
    });

    // Transcode any audio/video to mono 32 kbit/s Opus (drops video, shrinks
    // upload). Opus is used instead of low-sample-rate MP3 because 16 kHz MP3
    // introduces artifacts that make the Whisper worker's VAD/diarization skip
    // whole passages; Opus at 32k keeps transcription quality on par with the
    // untouched original at a quarter of the size.
    async function extractAudio(
        mediaFile: File,
        onProgress?: (percent: number) => void,
    ): Promise<{ audioBlob: Blob; audioFileName: string }> {
        await ffmpeg.load();

        const audioFileName = `${stripExtension(mediaFile.name)}.ogg`;
        // Keep source extension so ffmpeg picks the right demuxer.
        const ext = extension(mediaFile.name) || "bin";
        const inputFileName = `input.${ext}`;

        const handleProgress = ({ progress }: { progress: number }) => {
            onProgress?.(Math.min(Math.max(progress * 100, 0), 100));
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
                "32k",
                "-ac",
                "1",
                "-application",
                "voip",
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
