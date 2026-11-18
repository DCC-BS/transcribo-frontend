import {
    type AudioSession,
    type AudioSessionOptions,
    useAudioSessions,
} from "@dcc-bs/audio-recorder.bs.js/prelude";

// IndexedDB and ffmpeg.wasm exist only in the browser; on the server this
// hands out an inert state.

/**
 * `useAudioSessions`, client-side only.
 *
 * @param options - Cleanup and logging options of `useAudioSessions`.
 */
export function useStoredRecordings(options: AudioSessionOptions) {
    if (import.meta.server) {
        const unavailable = async (): Promise<never> => {
            throw new Error("Stored recordings exist only in the browser");
        };
        return {
            isReady: ref(false),
            loadFailed: ref(false),
            abandonedRecording: ref<AudioSession[] | undefined>(),
            pausedRecording: computed<AudioSession | undefined>(
                () => undefined,
            ),
            refresh: async () => {},
            exportSession: unavailable,
            markAsStopped: unavailable,
        };
    }

    const {
        isReady,
        loadFailed,
        abandonedRecording,
        pausedRecording,
        refresh,
        exportSession,
        markAsStopped,
    } = useAudioSessions(options);
    return {
        isReady,
        loadFailed,
        abandonedRecording,
        pausedRecording,
        refresh,
        exportSession,
        markAsStopped,
    };
}
