import { z } from "zod";
import { KeywordSchema } from "./transcriptionResponse";

export const StoredTranscriptionSchema = z.object({
    id: z.string(),
    name: z.string(),
    createdAt: z.coerce.date(),
    updatedAt: z.coerce.date(),
    audioFileId: z.string().optional(),
    mediaFile: z.instanceof(Blob).optional(),
    mediaFileName: z.string().optional(),
    summary: z.string().optional(),
    keywords: z.array(KeywordSchema).optional(),
});

export type StoredTranscription = z.infer<typeof StoredTranscriptionSchema>;
