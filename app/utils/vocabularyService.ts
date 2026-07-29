import { db } from "~/stores/db";
import type { Keyword, KeywordType } from "~/types/transcriptionResponse";

/*
    Upper bound on stored vocabulary entries. The whole vocabulary is sent
    with every transcription result request as LLM prompt context, so it must
    stay small; when the limit is exceeded the least recently used entries
    (oldest lastUsedAt) are evicted.
*/
const MAX_VOCABULARY_ENTRIES = 100;

/**
 * Vocabulary persistence layer on top of the IndexedDB store, keeping the
 * entry count bounded via LRU eviction.
 *
 * @returns The vocabulary service operations.
 */
export function getVocabularyService() {
    /**
     * Reads the whole vocabulary in the shape the transcription API expects.
     *
     * @returns The stored terms as keywords.
     */
    async function getVocabularyAsKeywords(): Promise<Keyword[]> {
        const entries = await db.vocabulary.toArray();
        return entries.map((entry) => ({
            term: entry.term,
            description: entry.description,
            type: entry.type,
        }));
    }

    /**
     * Remembers the confirmed spelling of a term.
     *
     * @param term - The confirmed spelling.
     * @param type - Keyword type of the term.
     * @param description - Optional description shown in the vocabulary page.
     * @param replaces - The previous spelling the user renamed away from; its
     * entry is removed so repeated edits keep only the final term, not every
     * intermediate state.
     */
    async function rememberTerm(
        term: string,
        type: KeywordType,
        description = "",
        replaces?: string,
    ): Promise<void> {
        const trimmed = term.trim();
        if (!trimmed) {
            return;
        }
        await db.transaction("rw", db.vocabulary, async () => {
            const previous = replaces?.trim();
            // an edit of a known spelling carries its confirmation count over
            let editCount = 1;
            if (previous && previous !== trimmed) {
                const replaced = await db.vocabulary.get(previous);
                editCount += replaced?.editCount ?? 0;
                await db.vocabulary.delete(previous);
            }
            const existing = await db.vocabulary.get(trimmed);
            editCount += existing?.editCount ?? 0;
            const now = new Date();
            await db.vocabulary.put({
                term: trimmed,
                type,
                description,
                updatedAt: now,
                lastUsedAt: now,
                editCount,
            });
            await evictOverflow();
        });
    }

    /**
     * Marks the given terms as used in a finished transcription so LRU
     * eviction keeps the vocabulary that is actually still relevant.
     *
     * @param terms - Terms that appeared in the transcription.
     */
    async function touchTerms(terms: string[]): Promise<void> {
        if (terms.length === 0) {
            return;
        }
        const now = new Date();
        await db.vocabulary
            .where("term")
            .anyOf(terms)
            .modify((entry) => {
                entry.lastUsedAt = now;
            });
    }

    /**
     * Drops the least recently used entries once the vocabulary exceeds
     * {@link MAX_VOCABULARY_ENTRIES}.
     */
    async function evictOverflow(): Promise<void> {
        const count = await db.vocabulary.count();
        const overflow = count - MAX_VOCABULARY_ENTRIES;
        if (overflow <= 0) {
            return;
        }
        const oldest = await db.vocabulary
            .orderBy("lastUsedAt")
            .limit(overflow)
            .primaryKeys();
        await db.vocabulary.bulkDelete(oldest);
    }

    // --- management (vocabulary settings page) --------------------------

    /**
     * Removes a term from the vocabulary.
     *
     * @param term - The term to delete.
     */
    async function deleteTerm(term: string): Promise<void> {
        await db.vocabulary.delete(term);
    }

    /**
     * Updates a vocabulary entry.
     *
     * Renaming keeps the entry's history (edit count, timestamps); changing
     * only the type updates in place. Renaming onto an already existing term
     * merges the two histories instead of overwriting the target.
     *
     * @param originalTerm - The entry to update.
     * @param updates - New term and/or type.
     */
    async function updateTerm(
        originalTerm: string,
        updates: { term?: string; type?: KeywordType },
    ): Promise<void> {
        const newTerm = updates.term?.trim();
        await db.transaction("rw", db.vocabulary, async () => {
            const entry = await db.vocabulary.get(originalTerm);
            if (!entry) {
                return;
            }
            const targetTerm = newTerm || entry.term;
            let editCount = entry.editCount ?? 1;
            if (targetTerm !== originalTerm) {
                const existing = await db.vocabulary.get(targetTerm);
                editCount += existing?.editCount ?? 0;
                await db.vocabulary.delete(originalTerm);
            }
            await db.vocabulary.put({
                ...entry,
                term: targetTerm,
                type: updates.type ?? entry.type,
                editCount,
                updatedAt: new Date(),
            });
        });
    }

    return {
        getVocabularyAsKeywords,
        rememberTerm,
        touchTerms,
        deleteTerm,
        updateTerm,
    };
}
