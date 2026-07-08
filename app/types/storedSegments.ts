import { z } from "zod";
import { SegmentSchema } from "./transcriptionResponse";

export const LowConfidenceRangeSchema = z.object({
    start: z.number(),
    end: z.number(),
    probability: z.number(),
});

export type LowConfidenceRange = z.infer<typeof LowConfidenceRangeSchema>;

/**
 * Zod schema for SegmentWithId
 */
export const StoredSegmentSchema = SegmentSchema.omit({ words: true }).extend({
    id: z.string(),
    transcriptionId: z.string(),
    lowConfidenceRanges: z.array(LowConfidenceRangeSchema).optional(),
});

/**
 * Type representing a segment with an ID
 * Inferred from SegmentWithIdSchema
 */
export type StoredSegment = z.infer<typeof StoredSegmentSchema>;
