// Forwarded untouched by the backend (see audio_converter.py).
const PASSTHROUGH_EXTENSIONS = ["mp3", "ogg", "oga", "opus"];

// Above this the file is big enough that a 48 kbit/s Opus copy is worth the
// extra generation; below it, re-encoding would only cost quality.
export const MAX_PASSTHROUGH_BITRATE = 96_000;

/**
 * Decides whether an upload can go to the backend as is.
 *
 * @param file - The selected media file.
 * @param durationSeconds - Its playback length, or `undefined` when unknown.
 * @returns `true` for compact audio the backend accepts directly.
 */
export function canUploadAsIs(
    file: File,
    durationSeconds: number | undefined,
): boolean {
    const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
    // Untyped files go through ffmpeg: the backend rejects uploads without a content type.
    if (
        !file.type.startsWith("audio/") ||
        !PASSTHROUGH_EXTENSIONS.includes(extension)
    ) {
        return false;
    }
    if (!durationSeconds || !Number.isFinite(durationSeconds)) {
        return false;
    }
    return (file.size * 8) / durationSeconds <= MAX_PASSTHROUGH_BITRATE;
}

/**
 * Reads a media file's duration from its metadata, without decoding it.
 *
 * @param file - The media file.
 * @returns The duration in seconds, or `undefined` when the browser cannot tell.
 */
export function readMediaDuration(file: File): Promise<number | undefined> {
    return new Promise((resolve) => {
        const audio = new Audio();
        const url = URL.createObjectURL(file);
        const settle = (duration: number | undefined) => {
            URL.revokeObjectURL(url);
            audio.removeAttribute("src");
            resolve(duration);
        };
        audio.preload = "metadata";
        audio.onloadedmetadata = () => settle(audio.duration);
        audio.onerror = () => settle(undefined);
        audio.src = url;
    });
}
