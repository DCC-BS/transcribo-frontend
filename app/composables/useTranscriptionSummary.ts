import { apiFetch, isApiError } from "@dcc-bs/communication.bs.js";
import type { StoredTranscription } from "~/types/storedTranscription";
import { SummaryResponseSchema } from "~/types/summarizeResponse";


export function useTranscriptionSummary() {
    const { updateTranscription } = useTranscription();
    const logger = useLogger();

    const isSummaryGenerating = ref(false);

    /**
     * Get the complete text from all segments
     */
    function getTranscriptionText(transcription: StoredTranscription): string {
        // Helper method to extract text from segments
        return transcription.segments.map((segment) => segment.text).join(" ");
    }

    /**
     * Helper function to validate and sanitize transcript text
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
     * Generate and store a summary for the current transcription
     */
    async function generateSummary(transcription: StoredTranscription): Promise<string | null> {
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

            const transcriptText = getTranscriptionText(
                transcription,
            );

            // Validate and sanitize transcript text
            const sanitizedText =
                validateAndSanitizeTranscriptText(transcriptText);

            const formData = new FormData();
            formData.append("transcript", sanitizedText);

            const summaryResponse = await apiFetch("/api/summarize/submit", {
                schema: SummaryResponseSchema,
                method: "POST",
                body: formData,
            });

            if (isApiError(summaryResponse)) {
                throw summaryResponse;
            }

            const summary = summaryResponse.summary;

            // Store the summary in the current transcription with proper reactivity
            transcription.summary = summary;

            await updateTranscription(transcription.id, { summary: transcription.summary });

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
