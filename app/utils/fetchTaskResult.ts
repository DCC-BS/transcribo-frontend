import {
    ApiError,
    type ApiResponse,
    isApiError,
} from "@dcc-bs/communication.bs.js";
import {
    type PostProcessingProgress,
    TaskResultFrameSchema,
    type TranscriptionResponse,
} from "~/types/transcriptionResponse";
import { readJsonLines } from "~/utils/jsonLines";
import { getVocabularyService } from "~/utils/vocabularyService";

/**
 * Fetches a finished transcription task result, passing the stored vocabulary
 * along as LLM prompt context so known terms are spelled consistently.
 *
 * The result arrives as a stream: progress lines while the LLM post-processing
 * runs, then the transcription.
 *
 * @param taskId - Id of the transcription task to fetch.
 * @param onProgress - Receives each post-processing progress line.
 * @returns The validated transcription response, or an ApiError when the
 * request fails, a line is invalid or the stream ends without a result.
 */
export async function fetchTaskResultWithVocabulary(
    taskId: string,
    onProgress?: (progress: PostProcessingProgress) => void,
): Promise<ApiResponse<TranscriptionResponse>> {
    const { apiStreamFetch } = useApi();
    const { correctPlaceNames } = useTranscriptionSettings();
    const keywords = await getVocabularyService().getVocabularyAsKeywords();
    const stream = await apiStreamFetch(`/api/transcribe/${taskId}`, {
        method: "POST",
        body: { keywords, correct_place_names: correctPlaceNames.value },
    });
    if (isApiError(stream)) {
        return stream;
    }

    try {
        for await (const line of readJsonLines(stream)) {
            const frame = TaskResultFrameSchema.safeParse(line);
            if (!frame.success) {
                return new ApiError(
                    "unexpected_error",
                    500,
                    frame.error.message,
                );
            }
            if (frame.data.type === "result") {
                return frame.data.transcription;
            }
            onProgress?.(frame.data);
        }
    } catch (error) {
        // A dropped connection or a truncated line.
        return new ApiError("unexpected_error", 500, String(error));
    }
    return new ApiError(
        "unexpected_error",
        500,
        `Result stream of task ${taskId} ended without a result`,
    );
}
