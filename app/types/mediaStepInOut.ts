export type MediaSelectionData = {
    media: File;
};

export type MediaConfigureData = {
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
