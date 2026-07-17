import { type ApiResponse, apiFetch } from "@dcc-bs/communication.bs.js";
import {
    type TranscriptionResponse,
    TranscriptionResponseSchema,
} from "~/types/transcriptionResponse";
import { getVocabularyService } from "~/utils/vocabularyService";

export async function fetchTaskResultWithVocabulary(
    taskId: string,
): Promise<ApiResponse<TranscriptionResponse>> {
    const keywords = await getVocabularyService().getVocabularyAsKeywords();
    return await apiFetch(`/api/transcribe/${taskId}`, {
        method: "POST",
        body: { keywords },
        schema: TranscriptionResponseSchema,
    });
}
