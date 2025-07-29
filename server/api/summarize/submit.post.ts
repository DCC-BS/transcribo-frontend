import type { SummaryResponse } from "~/types/summarizeResponse";
import { verboseFetch } from "../../utils/verboseFetch";

export default defineEventHandler(async (event) => {
    const config = useRuntimeConfig();

    const inputFormData = await readFormData(event);
    const transcript = inputFormData.get("transcript") as string;

    if (!transcript) {
        throw createError({
            statusCode: 400,
            statusMessage: "transcript not provided",
        });
    }

    // Attempt to make the API request
    const response = await verboseFetch<SummaryResponse>(
        `${config.public.apiUrl}/summarize`,
        event,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                transcript: transcript,
            }),
        },
    );

    return response;
});
