import { z } from "zod";
import { KeywordSchema } from "./transcriptionResponse";

export const SpeakerSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
});

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
    /** Speaker roster, append-only. `id` is the stable diarization key
     *  stored on segments (SPEAKER_00, …); `name` is the editable display
     *  name (AI-guessed at import, changed by rename). The array index is
     *  the speaker's fixed color slot (see useSpeakerRegistry). */
    speakers: z.array(SpeakerSchema).optional(),
});

export type StoredTranscription = z.infer<typeof StoredTranscriptionSchema>;
export type Speaker = z.infer<typeof SpeakerSchema>;
