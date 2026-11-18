import {
    type AudioSession,
    type AudioSessionOptions,
    useAudioSessions,
} from "@dcc-bs/audio-recorder.bs.js/prelude";

/*
    The recordings stored in the browser (paused, interrupted, or ended but
    kept as a backup). They live in IndexedDB and are read with ffmpeg.wasm
    at hand, neither of which exists during server-side rendering, so on the
    server this hands out an empty, inert state that the client replaces.
*/

/**
 * Lists the stored recordings and the one waiting paused, client-side only.
 *
 * @param options - Cleanup and logging options of `useAudioSessions`.
 * @returns The stored recordings, the paused one, and ways to refresh,
 *   join (`getMp3Blob`) or end (`markAsStopped`) them.
 */
export function useStoredRecordings(options: AudioSessionOptions) {
    if (import.meta.server) {
        const unavailable = async (): Promise<never> => {
            throw new Error("Stored recordings exist only in the browser");
        };
        return {
            abandonedRecording: ref<AudioSession[] | undefined>(),
            pausedRecording: computed<AudioSession | undefined>(
                () => undefined,
            ),
            refresh: async () => {},
            getMp3Blob: unavailable,
            markAsStopped: unavailable,
        };
    }

    const {
        abandonedRecording,
        pausedRecording,
        refresh,
        getMp3Blob,
        markAsStopped,
    } = useAudioSessions(options);
    return {
        abandonedRecording,
        pausedRecording,
        refresh,
        getMp3Blob,
        markAsStopped,
    };
}
