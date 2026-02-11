export type MediaProgress = {
    icon: string,
    message: string,

    // between 0 and 100
    progress: number | null,
}

export function getProgress(progress: MediaProgress): number {
    return !progress.progress
        ? 0
        : progress.progress;
}
