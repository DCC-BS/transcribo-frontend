import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile } from "@ffmpeg/util";

export function useAudioConvertion() {
    const ffmpeg = new FFmpeg();

    const loadPromise = ffmpeg.load();

    async function convertWebmToMp3(
        webmBlob: Blob,
        fileName: string,
    ): Promise<Blob> {
        await loadPromise;

        const webmFileName = `${fileName}.webm`;
        const mp3FileName = `${fileName}.mp3`;

        await ffmpeg.writeFile(webmFileName, await fetchFile(webmBlob));
        await ffmpeg.exec(["-i", webmFileName, mp3FileName]);
        const data = await ffmpeg.readFile(mp3FileName);

        // Convert FileData to a compatible format for Blob
        let blobData: BlobPart;
        if (data instanceof Uint8Array) {
            // Convert to regular Array and back to Uint8Array to ensure proper ArrayBuffer type
            blobData = new Uint8Array(Array.from(data));
        } else if (typeof data === "string") {
            // Convert string to Uint8Array using TextEncoder
            blobData = new TextEncoder().encode(data);
        } else {
            // Handle other cases by converting to Uint8Array
            blobData = new Uint8Array(data as ArrayBuffer);
        }

        return new Blob([blobData], { type: "audio/mp3" });
    }

    return {
        convertWebmToMp3,
    };
}
