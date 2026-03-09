import type { StoredTask } from "./task";

export type MediaSelectionData = {
    media: File;
};

export type MediaConfigureData = {
    task: StoredTask;
    media: File;
    numSpeaker: string;
    language: string;
};

export type MediaProcessData = {
    originalMedia: File;
    processedMedia: File;
    numSpeaker: number | undefined;
    language: string | undefined;
};
