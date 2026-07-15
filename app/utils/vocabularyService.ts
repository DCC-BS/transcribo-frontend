import { db } from "~/stores/db";
import type { Keyword, KeywordType } from "~/types/transcriptionResponse";

/*
    Upper bound on stored vocabulary entries. The whole vocabulary is sent
    with every transcription result request as LLM prompt context, so it must
    stay small; when the limit is exceeded the least recently used entries
    (oldest lastUsedAt) are evicted.
*/
export const MAX_VOCABULARY_ENTRIES = 100;

export function getVocabularyService() {
    async function getVocabularyAsKeywords(): Promise<Keyword[]> {
        const entries = await db.vocabulary.toArray();
        return entries.map((entry) => ({
            term: entry.term,
            description: entry.description,
            type: entry.type,
        }));
    }

    /*
        Remembers the confirmed spelling of a term. `replaces` is the previous
        spelling the user renamed away from: its entry is removed so repeated
        edits keep only the final term, not every intermediate state.
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
            if (previous && previous !== trimmed) {
                await db.vocabulary.delete(previous);
            }
            const now = new Date();
            await db.vocabulary.put({
                term: trimmed,
                type,
                description,
                updatedAt: now,
                lastUsedAt: now,
            });
            await evictOverflow();
        });
    }

    /*
        Marks the given terms as used in a finished transcription so LRU
        eviction keeps the vocabulary that is actually still relevant.
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

    return { getVocabularyAsKeywords, rememberTerm, touchTerms };
}
