import { z } from "zod";
import { apiHandler } from "~~/server/utils/apiHanlder";

const transcribeSchema = z.object({
    file: z.file(),
    num_speakers: z.number().min(1).max(6).optional(),
    audio_language: z.string().optional()
});

apiHandler
    .withMethod("POST")
    .withBodyProvider(async (event) => {
        const inputFromData = await readFormData(event);

        const result = transcribeSchema.safeParse(Object.fromEntries(inputFromData.entries()));

        if (!result.success) {
            throw createError({
                statusCode: 400,
                data: {
                    errorId: "invalid_transcribe_input",
                    status: 400,
                    debugMessage: result.error.message
                }
            })
        }

        return inputFromData;
    })
    .build("/transcribe");
