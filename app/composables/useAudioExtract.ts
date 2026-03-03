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

export const useAudioExtract = () => {
    const ffmpeg = new FFmpeg();

    onUnmounted(() => {
        ffmpeg.terminate();
    });

    async function extractAudioFromVideo(
        videoFile: File,
    ): Promise<{ audioBlob: Blob; audioFileName: string }> {
        await ffmpeg.load();
        const originalName = videoFile.name;
        const lastDotIndex = originalName.lastIndexOf(".");
        const audioFileName =
            lastDotIndex > 0
                ? `${originalName.substring(0, lastDotIndex)}.wav`
                : `${originalName}.wav`;
        const videoFileName = "input_video.mp4";
        try {
            await ffmpeg.writeFile(videoFileName, await fetchFile(videoFile));
            await ffmpeg.exec([
                "-i",
                videoFileName,
                "-vn",
                "-acodec",
                "pcm_s16le",
                "-ar",
                "16000",
                audioFileName,
            ]);
            const data = await ffmpeg.readFile(audioFileName);
            return {
                audioBlob: toBlob(data, "audio/wav"),
                audioFileName,
            };
        } catch (error) {
            throw new Error(
                `Failed to extract audio from video: ${error instanceof Error ? error.message : "Unknown error"}`,
            );
        } finally {
            await ffmpeg.deleteFile(videoFileName);
            await ffmpeg.deleteFile(audioFileName);
        }
    }
    return {
        extractAudioFromVideo,
    };
};
