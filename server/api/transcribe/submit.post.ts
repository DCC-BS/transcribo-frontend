import { apiFetch } from "@dcc-bs/communication.bs.js";
import { z } from "zod";
import { apiHandler } from "~~/server/utils/apiHanlder";

const transcribeSchema = z.object({
    audio_file: z.file(),
    num_speakers: z.enum(["0", "1", "2", "3", "4", "5", "6"]).optional(), // TODO - validate that it's either auto or a number from 0 to 6
    language: z.string().optional(),
});

export default apiHandler
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
    .withFetcher(async (options) => {
        const response = await apiFetch(options.url, {
            method: "POST",
            body: options.body,
        });

        const logger = getEventLogger(options.event);

        logger.info({ response: response }, "Transcription request submitted");

        return response;
    })
    .build("/transcribe");
