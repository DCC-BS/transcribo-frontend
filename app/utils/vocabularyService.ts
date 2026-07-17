import { db } from "~/stores/db";
import type { Keyword, KeywordType } from "~/types/transcriptionResponse";

export function getVocabularyService() {
    async function getVocabularyAsKeywords(): Promise<Keyword[]> {
        const entries = await db.vocabulary.toArray();
        return entries.map((entry) => ({
            term: entry.term,
            description: entry.description,
            type: entry.type,
        }));
    }

    async function rememberTerm(
        term: string,
        type: KeywordType,
        description = "",
    ): Promise<void> {
        const trimmed = term.trim();
        if (!trimmed) {
            return;
        }
        await db.vocabulary.put({
            term: trimmed,
            type,
            description,
            updatedAt: new Date(),
        });
    }

    return { getVocabularyAsKeywords, rememberTerm };
}
