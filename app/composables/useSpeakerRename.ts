import { RenameSpeakerCommand } from "~/types/commands";
import type { StoredSegment } from "~/types/storedSegments";

/*
    Renaming a speaker everywhere: the segment speaker fields (undoable
    command), mentions inside the transcript texts, the matching keyword
    entry and the learned vocabulary all follow the new name. Shared by the
    speaker toolbar (RenameSpeakerView) and the document viewer's speaker
    menu.
*/
export function useSpeakerRename(
    transcriptionId: MaybeRefOrGetter<string>,
    segments: MaybeRefOrGetter<StoredSegment[]>,
) {
    const { executeCommand } = useCommandBus();
    const { getTranscription, updateTranscription } = getTranscriptionService();

    async function renameSpeakerEverywhere(
        originalName: string,
        newName: string,
    ): Promise<void> {
        const trimmedName = newName.trim();
        if (originalName === trimmedName || !trimmedName) {
            return;
        }

        await executeCommand(
            new RenameSpeakerCommand(
                toValue(transcriptionId),
                originalName,
                trimmedName,
            ),
        );

        // Mentions of the speaker inside the transcript texts follow the
        // rename, same as keyword renames.
        await replaceTermInSegmentTexts(
            toValue(segments),
            originalName,
            trimmedName,
            executeCommand,
        );

        await renameKeywordEntry(originalName, trimmedName);

        // Learn the confirmed name for future transcriptions; drop the entry
        // of the name that was renamed away from.
        await getVocabularyService().rememberTerm(
            trimmedName,
            "person",
            "",
            originalName,
        );
    }

    /*
        Keep the keywords in sync with speaker renames: since the rename also
        rewrites the term inside the segment texts, an entry still holding the
        old name would no longer resolve when jumping to its occurrences.
    */
    async function renameKeywordEntry(
        originalName: string,
        newName: string,
    ): Promise<void> {
        const transcription = await getTranscription(toValue(transcriptionId));
        const keywords = transcription?.keywords;
        if (!keywords?.length) {
            return;
        }

        const target = originalName.trim().toLowerCase();
        const trimmedNew = newName.trim();
        let changed = false;
        const updated = keywords.map((entry) => {
            if (entry.term.trim().toLowerCase() === target) {
                changed = true;
                return { ...entry, term: trimmedNew };
            }
            return entry;
        });

        if (changed) {
            await updateTranscription(toValue(transcriptionId), {
                keywords: updated,
            });
        }
    }

    return { renameSpeakerEverywhere };
}
