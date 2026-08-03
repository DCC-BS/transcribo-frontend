import { z } from "zod";

/**
 * Zod schema for Segment
 * Represents a segment in the transcription. The backend contract is
 * fragment level only: {start, end, text, speaker} — word-level data never
 * leaves the backend.
 * Corresponds to the Python Segment model
 */
export const SegmentSchema = z.object({
    start: z.number(),
    end: z.number(),
    text: z.string(),
    speaker: z.string().nullable().optional(),
});

/**
 * Type representing a segment in the transcription
 * Inferred from SegmentSchema
 */
export type Segment = z.infer<typeof SegmentSchema>;

/**
 * Zod schema for SpeakerNameAssignment
 * A diarization label (SPEAKER_00 …) resolved to a real name, or null when
 * the transcript provides no evidence
 * Corresponds to the Python SpeakerNameAssignment model
 */
export const SpeakerNameAssignmentSchema = z.object({
    speaker: z.string(),
    name: z.string().nullable(),
    role: z.string().nullable().optional(),
    confidence: z.number(),
    evidence: z.string().nullable().optional(),
});

/**
 * Type representing a resolved speaker name
 * Inferred from SpeakerNameAssignmentSchema
 */
export type SpeakerNameAssignment = z.infer<typeof SpeakerNameAssignmentSchema>;

export const KeywordTypeSchema = z.enum([
    "person",
    "location",
    "object",
    "institution",
]);

export type KeywordType = z.infer<typeof KeywordTypeSchema>;

/**
 * Zod schema for Keyword
 * A special name or term from the transcript with a short explanation
 * Corresponds to the Python Keyword model
 */
export const KeywordSchema = z.object({
    term: z.string(),
    description: z.string(),
    // Entries stored before types existed default to the catch-all "object".
    type: KeywordTypeSchema.default("object"),
});

/**
 * Type representing a keyword
 * Inferred from KeywordSchema
 */
export type Keyword = z.infer<typeof KeywordSchema>;

/**
 * Zod schema for TranscriptCorrection
 * A find/replace pair the backend post-processing applied to the segment texts
 * Corresponds to the Python TranscriptCorrection model
 */
export const TranscriptCorrectionSchema = z.object({
    original: z.string(),
    corrected: z.string(),
    reason: z.string().default(""),
    confidence: z.number(),
});

/**
 * Type representing an applied correction
 * Inferred from TranscriptCorrectionSchema
 */
export type TranscriptCorrection = z.infer<typeof TranscriptCorrectionSchema>;

/**
 * Zod schema for TranscriptionResponse
 * Represents a transcription response
 * Corresponds to the Python TranscriptionResponse model
 */
export const TranscriptionResponseSchema = z.object({
    segments: z.array(SegmentSchema),
    title: z.string().nullable().optional(),
    speaker_assignments: z
        .array(SpeakerNameAssignmentSchema)
        .nullable()
        .optional(),
    applied_corrections: z
        .array(TranscriptCorrectionSchema)
        .nullable()
        .optional(),
    keywords: z.array(KeywordSchema).nullable().optional(),
});

/**
 * Type representing a transcription response
 * Inferred from TranscriptionResponseSchema
 */
export type TranscriptionResponse = z.infer<typeof TranscriptionResponseSchema>;
