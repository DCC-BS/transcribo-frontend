import type { SummaryResponse } from "~/types/summarizeResponse";
import { verboseFetch } from "../../utils/verboseFetch";
import { getClientIp } from "../../utils/getClientIp";

export default defineEventHandler(async (event) => {
    const clientIP = getClientIp(event);

    const config = useRuntimeConfig();

    const inputFormData = await readFormData(event);
    const transcriptValue = inputFormData.get("transcript");
    const transcript =
        typeof transcriptValue === "string" ? transcriptValue : null;

    if (!transcript) {
        throw createError({
            statusCode: 400,
            statusMessage: "transcript not provided",
        });
    }

    // Attempt to make the API request
    const response = await verboseFetch<SummaryResponse>(
        `${config.apiUrl}/summarize`,
        event,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-Client-Id": clientIP || "",
            },
            body: JSON.stringify({
                transcript: transcript,
            }),
        },
    );

    return response;
});
