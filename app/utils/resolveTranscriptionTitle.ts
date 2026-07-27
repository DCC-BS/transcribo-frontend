export function resolveTranscriptionTitle(
    inferredTitle: string | null | undefined,
    mediaFileName: string,
): string {
    return inferredTitle?.trim() || mediaFileName;
}
