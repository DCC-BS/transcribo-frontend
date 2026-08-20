import { isApiError } from "@dcc-bs/communication.bs.js";
import { db } from "~/stores/db";
import type { StoredTranscription } from "~/types/storedTranscription";
import { SummaryResponseSchema } from "~/types/summarizeResponse";
import type { SummarizeRequest, SummaryType } from "~~/shared/types/summary";

/**
 * Generates and stores LLM summaries for a transcription.
 *
 * @returns The generation function and a reactive in-progress flag.
 */
export function useTranscriptionSummary() {
    const { apiFetch } = useApi();
    const { updateTranscription } = getTranscriptionService();
    const logger = useLogger();

    const isSummaryGenerating = ref(false);

    /**
     * Joins the text of all segments of a transcription, in playback order.
     *
     * @param transcriptionId - Transcription to read.
     * @returns The full transcript text.
     */
    async function getTranscriptionText(
        transcriptionId: string,
    ): Promise<string> {
        const segments = await db.segments
            .where("transcriptionId")
            .equals(transcriptionId)
            .sortBy("start");
        return segments.map((segment) => segment.text).join(" ");
    }

    /**
     * Trims the transcript text and rejects input the summarizer cannot use.
     *
     * @param text - Raw transcript text.
     * @returns The trimmed text.
     * @throws When the text is empty, too short or too large.
     */
    function validateAndSanitizeTranscriptText(text: string): string {
        if (!text || typeof text !== "string") {
            throw new Error(
                "Transcript text is required and must be a string.",
            );
        }

        // Trim whitespace
        const trimmedText = text.trim();

        if (trimmedText.length === 0) {
            throw new Error("Transcript text cannot be empty.");
        }

        // Check minimum length (at least 10 characters for meaningful content)
        const MIN_LENGTH = 10;
        if (trimmedText.length < MIN_LENGTH) {
            throw new Error(
                `Transcript text must be at least ${MIN_LENGTH} characters long.`,
            );
        }

        // Check maximum length to prevent oversized requests
        const MAX_LENGTH = 32000 * 4;
        if (trimmedText.length > MAX_LENGTH) {
            throw new Error(
                `Transcript text is too large. Maximum allowed length is ${MAX_LENGTH} characters.`,
            );
        }

        return trimmedText;
    }

    /**
     * Generates a summary and stores it on the transcription.
     *
     * @param transcription - The transcription to summarize; its `summary` is
     * updated in place.
     * @param type - Which kind of summary to request.
     * @param language - Optional target language for the summary.
     * @returns The generated summary.
     * @throws When a generation is already running, the transcript is
     * unusable, or the API call fails.
     */
    async function generateSummary(
        transcription: StoredTranscription,
        type: SummaryType,
        language?: string,
    ): Promise<string | null> {
        // Prevent concurrent calls
        if (isSummaryGenerating.value) {
            throw new Error(
                "Summary generation is already in progress for this transcription.",
            );
        }

        const isRegeneration = !!transcription.summary;

        try {
            isSummaryGenerating.value = true;

            // If regenerating, clear the existing summary immediately
            if (isRegeneration) {
                transcription.summary = undefined;
            }

            const transcriptText = await getTranscriptionText(transcription.id);

            // Validate and sanitize transcript text
            const sanitizedText =
                validateAndSanitizeTranscriptText(transcriptText);

            const requestBody: SummarizeRequest = {
                text: sanitizedText,
                summary_type: type,
            };

            // Add language if specified
            if (language) {
                requestBody.language = language;
            }

            const summaryResponse = await apiFetch("/api/summarize/submit", {
                schema: SummaryResponseSchema,
                method: "POST",
                body: requestBody,
            });

            if (isApiError(summaryResponse)) {
                throw summaryResponse;
            }

            const summary = summaryResponse.summary;

            // Store the summary in the current transcription with proper reactivity
            transcription.summary = summary;

            await updateTranscription(transcription.id, {
                summary: transcription.summary,
            });

            return summary;
        } catch (error) {
            logger.error(error, "Failed to generate summary:");
            throw error;
        } finally {
            isSummaryGenerating.value = false;
        }
    }

    return { isSummaryGenerating, generateSummary };
}
