import { createGlobalState, useLocalStorage } from "@vueuse/core";

/* Persisted options for how a transcription is processed (not how it is rendered). */
export const useTranscriptionSettings = createGlobalState(() => ({
    correctPlaceNames: useLocalStorage<boolean>(
        "setting:correct-place-names",
        true,
    ),
}));
