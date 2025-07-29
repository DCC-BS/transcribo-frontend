import { FFmpeg, type LogEvent } from "@ffmpeg/ffmpeg";
import { fetchFile } from "@ffmpeg/util";

export function useAudioConvertion() {
    const ffmpeg = new FFmpeg();

    // ffmpeg.on("log", ({ message: msg }: LogEvent) => {
    //     console.log(msg);
    // });

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

        return new Blob([data], { type: "audio/mp3" });
    }

    return {
        convertWebmToMp3,
    };
}
