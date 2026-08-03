import { useLocalStorage } from "@vueuse/core";

/*
    Persisted rendering options of a transcript. Shared by the viewer and the
    export toolbar so an export matches what is on screen.
*/
export function useTranscriptDisplaySettings() {
    return {
        showSpeakers: useLocalStorage<boolean>("setting:show-speaker", true),
        showTimestamps: useLocalStorage<boolean>(
            "setting:show-timestamps",
            false,
        ),
        mergeSegments: useLocalStorage<boolean>("setting:merge-segments", true),
    };
}
