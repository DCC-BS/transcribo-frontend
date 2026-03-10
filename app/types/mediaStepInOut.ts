import type { StoredTask } from "./storedTasks";

export type MediaSelectionData = {
    media: File;
    taskId?: string;
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
