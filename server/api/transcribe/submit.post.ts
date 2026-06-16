import { z } from "zod";
import { apiHandler } from "~~/server/utils/apiHanlder";
import {
    createDummyTaskStatus,
    generateDummyTaskId,
} from "~~/server/utils/dummyData";

const transcribeSchema = z.object({
    audio_file: z.file(),
    num_speakers: z.enum(["0", "1", "2", "3", "4", "5", "6"]).optional(),
    language: z.string().optional(),
});

const transcribeHandler = apiHandler
    .withMethod("POST")
    .withBodyProvider(async (event) => {
        const inputFromData = await readFormData(event);

        const result = transcribeSchema.safeParse(
            Object.fromEntries(inputFromData.entries()),
        );

        if (!result.success) {
            throw createError({
                statusCode: 400,
                data: {
                    errorId: "invalid_transcribe_input",
                    status: 400,
                    debugMessage: result.error.message,
                },
            });
        }

        return inputFromData;
    })
    .withDummyFetcher(createDummyTaskStatus(generateDummyTaskId(), "completed"))
    .build("/transcribe");

// Cap concurrent uploads: each buffers a full audio file in memory.
let activeTranscriptions = 0;

export default defineEventHandler(async (event) => {
    const maxConcurrent = useRuntimeConfig()
        .maxConcurrentTranscriptions as number;

    if (activeTranscriptions >= maxConcurrent) {
        setResponseStatus(event, 429);
        return {
            errorId: "rate_limit_exceeded",
            debugMessage:
                "Maximum number of concurrent transcription uploads reached.",
        };
    }

    activeTranscriptions++;
    try {
        return await transcribeHandler(event);
    } finally {
        activeTranscriptions--;
    }
});
