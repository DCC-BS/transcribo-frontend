import { RenameSpeakerCommand } from "~/types/commands";
import type { StoredSegment } from "~/types/storedSegments";
import type { StoredTranscription } from "~/types/storedTranscription";
import type { Keyword } from "~/types/transcriptionResponse";

/** Case- and whitespace-insensitive term identity, shared by every lookup
 *  that has to match a keyword against a name typed by the user. */
export function normalizeTerm(term: string): string {
    return term.trim().toLocaleLowerCase();
}

/*
    Renaming a keyword: rewrite the term inside the transcript texts, then
    let everything that referenced the old term follow — a speaker whose
    display name it was, the keyword entry itself and the learned
    vocabulary. Mirror image of useSpeakerRename, which starts from the
    speaker instead.
*/
export function useKeywordRename(
    transcription: MaybeRefOrGetter<StoredTranscription>,
) {
    const { executeCommand } = useCommandBus();
    const { updateTranscription } = getTranscriptionService();
    const { speakerIds, displayName } = useSpeakerRegistry();

    function findKeyword(term: string | undefined): Keyword | undefined {
        if (!term) {
            return undefined;
        }
        const normalizedTerm = normalizeTerm(term);
        return toValue(transcription).keywords?.find(
            (keyword) => normalizeTerm(keyword.term) === normalizedTerm,
        );
    }

    /**
     * @param sourceSegments segment texts as they were *before* the edit, so
     * the term is still found in the segment the user just typed in.
     */
    async function renameKeyword(
        keyword: Keyword,
        newTerm: string,
        sourceSegments: StoredSegment[],
    ): Promise<void> {
        const transcriptionId = toValue(transcription).id;

        await replaceTermInSegmentTexts(
            sourceSegments,
            keyword.term,
            newTerm,
            executeCommand,
        );

        // The term may double as a speaker's display name — keep the roster
        // in step so the transcript and the lanes agree.
        const matchingSpeakerId = speakerIds.value.find(
            (speakerId) =>
                normalizeTerm(displayName(speakerId)) ===
                normalizeTerm(keyword.term),
        );
        if (matchingSpeakerId) {
            await executeCommand(
                new RenameSpeakerCommand(
                    transcriptionId,
                    matchingSpeakerId,
                    displayName(matchingSpeakerId),
                    newTerm,
                ),
            );
        }

        // Read the keywords only now: the commands above await, and writing a
        // snapshot taken before them would drop anything they changed.
        await updateTranscription(transcriptionId, {
            keywords: (toValue(transcription).keywords ?? []).map((entry) =>
                normalizeTerm(entry.term) === normalizeTerm(keyword.term)
                    ? { ...entry, term: newTerm }
                    : entry,
            ),
        });

        await getVocabularyService().rememberTerm(
            newTerm,
            keyword.type,
            keyword.description,
            keyword.term,
        );
    }

    return { findKeyword, renameKeyword };
}
