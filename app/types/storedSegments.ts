import { z } from "zod";
import { SegmentSchema } from "./transcriptionResponse";

/**
 * Zod schema for SegmentWithId
 */
export const StoredSegmentSchema = SegmentSchema.extend({
    id: z.string(),
    transcriptionId: z.string(),
});

/**
 * Type representing a segment with an ID
 * Inferred from SegmentWithIdSchema
 */
export type StoredSegment = z.infer<typeof StoredSegmentSchema>;
