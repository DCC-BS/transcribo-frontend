import { z } from "zod";
import { KeywordTypeSchema } from "./transcriptionResponse";

/**
 * A user-confirmed spelling learned from renames in earlier transcriptions.
 * Sent to the backend with every new transcription so post-processing
 * proposes these spellings instead of making the user redo the work.
 */
export const StoredVocabularyEntrySchema = z.object({
    term: z.string(),
    type: KeywordTypeSchema,
    description: z.string(),
    updatedAt: z.date(),
});

export type StoredVocabularyEntry = z.infer<typeof StoredVocabularyEntrySchema>;
