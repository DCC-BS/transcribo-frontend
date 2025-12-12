import { z } from "zod";
import { SegmentWithIdSchema } from "~/types/transcriptionResponse";

export const StoredTranscriptionSchema = z.object({
    id: z.string(),
    segments: SegmentWithIdSchema.array(),
    name: z.string(),
    createdAt: z.coerce.date(),
    updatedAt: z.coerce.date(),
    audioFileId: z.string().optional(),
    mediaFile: z.instanceof(Blob).optional(),
    mediaFileName: z.string().optional(),
    summary: z.string().optional(),
});

export type StoredTranscription = z.infer<typeof StoredTranscriptionSchema>;
