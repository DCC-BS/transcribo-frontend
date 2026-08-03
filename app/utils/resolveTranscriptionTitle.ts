/**
 * Picks the title to display for a transcription.
 *
 * @param inferredTitle - Title derived from the transcript, if any.
 * @param mediaFileName - Fallback used when no meaningful title was inferred.
 * @returns The trimmed inferred title, otherwise the media file name.
 */
export function resolveTranscriptionTitle(
    inferredTitle: string | null | undefined,
    mediaFileName: string,
): string {
    return inferredTitle?.trim() || mediaFileName;
}
