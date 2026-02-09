
export type MediaSelectionData = {
    media: File
}

export type MediaConfigureData = {
    media: File,
    numSpeaker: number | undefined,
    language: string | undefined
}

export type MediaProcess = {
    originalMedia: File,
    processedMedia: File,
    numSpeaker: number | undefined,
    language: string | undefined
}
