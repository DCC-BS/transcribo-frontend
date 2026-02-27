import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile } from "@ffmpeg/util";

export function useAudioConversion() {
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

        return new Blob([data as BlobPart], { type: "audio/mp3" });
    }

    return {
        convertWebmToMp3,
    };
}
