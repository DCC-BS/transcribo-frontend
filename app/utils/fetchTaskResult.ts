import { apiFetch } from "@dcc-bs/communication.bs.js";
import { TranscriptionResponseSchema } from "~/types/transcriptionResponse";
import { getVocabularyService } from "~/utils/vocabularyService";

export async function fetchTaskResultWithVocabulary(taskId: string) {
    const keywords = await getVocabularyService().getVocabularyAsKeywords();
    return await apiFetch(`/api/transcribe/${taskId}`, {
        method: "POST",
        body: { keywords },
        schema: TranscriptionResponseSchema,
    });
}
