import type { StoredSegment } from "~/types/storedSegments";
import type { StoredTranscription } from "~/types/storedTranscription";
import type { Keyword, KeywordType } from "~/types/transcriptionResponse";

/*
    Shared keyword operations used by the keyword toolbar (HotWordsView) and
    the script-style document editor: renaming a term everywhere and adding a
    new term. Both persist the transcription's keyword list, teach the
    vocabulary the confirmed spelling, and (for renames) rewrite the segment
    texts through undoable commands.
*/
export function useKeywordActions(
    transcription: MaybeRefOrGetter<StoredTranscription>,
    segments: MaybeRefOrGetter<StoredSegment[]>,
) {
    const { t } = useI18n();
    const { executeCommand } = useCommandBus();
    const { updateTranscription } = getTranscriptionService();
    const { showToast } = useUserFeedback();

    const keywords = computed<Keyword[]>(
        () => toValue(transcription).keywords ?? [],
    );

    function findKeyword(term: string): Keyword | undefined {
        const needle = term.trim().toLowerCase();
        return keywords.value.find(
            (entry) => entry.term.trim().toLowerCase() === needle,
        );
    }

    function isKeyword(term: string): boolean {
        return findKeyword(term) !== undefined;
    }

    /*
        A rename is just a spelling change: replace all occurrences in the
        segment texts directly (undoable per segment) — no LLM run needed.
        Persist the rename BEFORE editing segments so the liveQuery
        re-emission triggered by the segment updates already carries the new
        term.
    */
    async function renameTerm(oldTerm: string, newName: string): Promise<void> {
        const stored: Keyword[] = structuredClone(
            toRaw(toValue(transcription).keywords) ?? [],
        );
        const needle = oldTerm.trim().toLowerCase();
        const entry = stored.find(
            (candidate) => candidate.term.trim().toLowerCase() === needle,
        );
        const trimmed = newName.trim();
        if (!entry || !trimmed || trimmed === entry.term) {
            return;
        }

        const previousTerm = entry.term;
        entry.term = trimmed;
        await updateTranscription(toValue(transcription).id, {
            keywords: stored,
        });

        // Learn the confirmed spelling for future transcriptions; drop the
        // entry of the spelling that was renamed away from.
        await getVocabularyService().rememberTerm(
            trimmed,
            entry.type ?? "object",
            entry.description,
            previousTerm,
        );

        const count = await replaceTermInSegmentTexts(
            toValue(segments),
            previousTerm,
            trimmed,
            executeCommand,
        );
        showToast(
            t("hotWords.renameSuccess", { term: trimmed, count }),
            "success",
        );
    }

    /*
        Adds a word the post-processing missed to the keyword list so it can
        be jumped to and renamed like every proposed keyword, and remembers
        it as confirmed vocabulary for future transcriptions.
    */
    async function addTerm(
        term: string,
        type: KeywordType = "object",
    ): Promise<void> {
        const trimmed = term.trim();
        if (!trimmed || isKeyword(trimmed)) {
            return;
        }

        const stored: Keyword[] = structuredClone(
            toRaw(toValue(transcription).keywords) ?? [],
        );
        stored.push({ term: trimmed, description: "", type });
        await updateTranscription(toValue(transcription).id, {
            keywords: stored,
        });
        await getVocabularyService().rememberTerm(trimmed, type);
        showToast(t("hotWords.addSuccess", { term: trimmed }), "success");
    }

    return { keywords, isKeyword, findKeyword, renameTerm, addTerm };
}
