import type { TaskStatus } from "~/types/task";
import { getClientIp } from "../../utils/getClientIp";
import { verboseFetch } from "../../utils/verboseFetch";

export default defineEventHandler(async (event) => {
    const config = useRuntimeConfig();

    const clientIP = getClientIp(event);

    const inputFormData = await readFormData(event);
    const fileContent = inputFormData.get("file") as File;
    const numSpeakersRaw = inputFormData.get("num_speakers") as string;

    if (!fileContent) {
        throw createError({
            statusCode: 400,
            statusMessage: "File not provided",
        });
    }

    const formData = new FormData();
    formData.append("audio_file", fileContent, fileContent.name);

    let apiParameter = "";
    // Handle num_speakers parameter
    if (numSpeakersRaw && numSpeakersRaw !== "null") {
        const numSpeakers = Number.parseInt(numSpeakersRaw, 10);
        if (
            !Number.isNaN(numSpeakers) &&
            numSpeakers >= 1 &&
            numSpeakers <= 6
        ) {
            apiParameter = `?num_speakers=${numSpeakers}`;
        }
        // If invalid value, don't include the parameter (auto detection)
    }

    // Attempt to make the API request
    const response = await verboseFetch<TaskStatus>(
        `${config.apiUrl}/transcribe${apiParameter}`,
        event,
        {
            method: "POST",
            body: formData,
            headers: {
                "X-Client-Id": clientIP || "",
            },
        },
    );

    return response;
});
