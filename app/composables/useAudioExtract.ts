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

    // Transcode any audio/video to mono 16 kHz MP3 (drops video, shrinks upload).
    async function extractAudio(
        mediaFile: File,
    ): Promise<{ audioBlob: Blob; audioFileName: string }> {
        await ffmpeg.load();

        const audioFileName = `${stripExtension(mediaFile.name)}.mp3`;
        // Keep source extension so ffmpeg picks the right demuxer.
        const ext = extension(mediaFile.name) || "bin";
        const inputFileName = `input.${ext}`;

        try {
            await ffmpeg.writeFile(inputFileName, await fetchFile(mediaFile));
            await ffmpeg.exec([
                "-i",
                inputFileName,
                "-vn",
                "-acodec",
                "libmp3lame",
                "-ar",
                "16000",
                "-ac",
                "1",
                "-b:a",
                "64k",
                audioFileName,
            ]);
            const data = await ffmpeg.readFile(audioFileName);
            return {
                audioBlob: toBlob(data, "audio/mp3"),
                audioFileName,
            };
        } catch (error) {
            throw new Error(
                `Failed to extract audio: ${error instanceof Error ? error.message : "Unknown error"}`,
            );
        } finally {
            await ffmpeg.deleteFile(inputFileName);
            await ffmpeg.deleteFile(audioFileName);
        }
    }

    return {
        extractAudio,
    };
};
