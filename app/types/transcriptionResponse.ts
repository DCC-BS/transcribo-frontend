import { z } from "zod";

/**
 * Zod schema for Word
 * Represents a word in the transcription
 * Corresponds to the Python Word model
 */
export const WordSchema = z.object({
    start: z.number(),
    end: z.number(),
    word: z.string(),
    probability: z.number(),
    speaker: z.string().nullable(),
});

/**
 * Type representing a word in the transcription
 * Inferred from WordSchema
 */
export type Word = z.infer<typeof WordSchema>;

/**
 * Zod schema for Segment
 * Represents a segment in the transcription
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
 * Zod schema for TranscriptionResponse
 * Represents a transcription response
 * Corresponds to the Python TranscriptionResponse model
 */
export const TranscriptionResponseSchema = z.object({
    segments: z.array(SegmentSchema),
    speaker_assignments: z
        .array(SpeakerNameAssignmentSchema)
        .nullable()
        .optional(),
    keywords: z.array(KeywordSchema).nullable().optional(),
});

/**
 * Type representing a transcription response
 * Inferred from TranscriptionResponseSchema
 */
export type TranscriptionResponse = z.infer<typeof TranscriptionResponseSchema>;

/**
 * Zod schema for VerboseSegment
 * Represents a verbose segment in the transcription
 * Corresponds to the Python VerboseSegment model
 */
export const VerboseSegmentSchema = z.object({
    id: z.number(),
    seek: z.number(),
    start: z.number(),
    end: z.number(),
    text: z.string(),
    tokens: z.array(z.number()),
    temperature: z.number(),
    avg_logprob: z.number(),
    compression_ratio: z.number(),
    no_speech_prob: z.number(),
    words: z.array(WordSchema).nullable(),
    speaker: z.string().nullable(),
});

/**
 * Type representing a verbose segment in the transcription
 * Inferred from VerboseSegmentSchema
 */
export type VerboseSegment = z.infer<typeof VerboseSegmentSchema>;

/**
 * Zod schema for VerboseTranscriptionResponse
 * Represents a verbose transcription response
 * Corresponds to the Python VerboseTranscriptionResponse model
 */
export const VerboseTranscriptionResponseSchema = z.object({
    task: z.string(), // Default is "transcribe"
    language: z.string(),
    duration: z.number(),
    text: z.string(),
    words: z.array(WordSchema),
    segments: z.array(VerboseSegmentSchema),
});

/**
 * Type representing a verbose transcription response
 * Inferred from VerboseTranscriptionResponseSchema
 */
export type VerboseTranscriptionResponse = z.infer<
    typeof VerboseTranscriptionResponseSchema
>;
