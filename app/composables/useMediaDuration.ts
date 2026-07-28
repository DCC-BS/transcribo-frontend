import type { StoredTranscription } from "~/types/storedTranscription";

/*
    Media duration of a transcription's stored file, read from the audio
    metadata off-DOM. Re-reads when the transcription (file) changes.
*/
export function useMediaDuration(
    transcription: MaybeRefOrGetter<StoredTranscription | undefined>,
) {
    const duration = ref(0);

    // edits re-emit the record with a fresh Blob for the same media — only
    // probe the duration again when the media actually changed
    let probedMediaKey = "";

    function read(): void {
        const stored = toValue(transcription);
        if (!stored?.mediaFile) {
            duration.value = 0;
            probedMediaKey = "";
            return;
        }
        const key = `${stored.mediaFile.size}:${stored.mediaFile.type}`;
        if (key === probedMediaKey) {
            return;
        }
        probedMediaKey = key;

        const audioSrc = URL.createObjectURL(stored.mediaFile);
        const audio = new Audio();
        audio.src = audioSrc;

        audio.onloadedmetadata = () => {
            duration.value = audio.duration;
            URL.revokeObjectURL(audioSrc);
            audio.onloadedmetadata = null;
        };
        audio.onerror = () => {
            // Clear the key so a later attempt probes again instead of
            // leaving the duration pinned at 0 for this media forever.
            probedMediaKey = "";
            URL.revokeObjectURL(audioSrc);
        };
    }

    onMounted(read);
    watch(() => toValue(transcription)?.mediaFile, read);

    return { duration };
}
