import { z } from "zod";

const MAX_SUMMARY_LENGTH = 10000; // 10KB max for summary

/**
 * Zod schema for SummaryResponse
 * Represents a summary
 * Corresponds to the Python SummaryResponse model
 */
export const SummaryResponseSchema = z.object({
    summary: z
        .string()
        .trim()
        .max(MAX_SUMMARY_LENGTH, {
            message: `Summary is too long. Maximum length is ${MAX_SUMMARY_LENGTH} characters.`
        }),
});

/**
 * Type representing a summary response
 * Inferred from SummaryResponseSchema
 */
export type SummaryResponse = z.infer<typeof SummaryResponseSchema>;
