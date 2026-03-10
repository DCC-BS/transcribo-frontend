import { z } from "zod";

/**
 * Zod schema for SegmentWithId
 */
export const StoredSegmentSchema = z.object({
    start: z.number(),
    end: z.number(),
    text: z.string(),
    speaker: z.string().nullable().optional(),
    id: z.string(),
});

/**
 * Type representing a segment with an ID
 * Inferred from SegmentWithIdSchema
 */
export type StoredSegment = z.infer<typeof StoredSegmentSchema>;
