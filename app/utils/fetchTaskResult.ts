import type { ApiResponse } from "@dcc-bs/communication.bs.js";
import {
    type TranscriptionResponse,
    TranscriptionResponseSchema,
} from "~/types/transcriptionResponse";
import { getVocabularyService } from "~/utils/vocabularyService";

/**
 * Fetches a finished transcription task result, passing the stored vocabulary
 * along as LLM prompt context so known terms are spelled consistently.
 *
 * @param taskId - Id of the transcription task to fetch.
 * @returns The validated transcription response.
 */
export async function fetchTaskResultWithVocabulary(
    taskId: string,
): Promise<ApiResponse<TranscriptionResponse>> {
    const { apiFetch } = useApi();
    const keywords = await getVocabularyService().getVocabularyAsKeywords();
    return await apiFetch(`/api/transcribe/${taskId}`, {
        method: "POST",
        body: { keywords },
        schema: TranscriptionResponseSchema,
    });
}
