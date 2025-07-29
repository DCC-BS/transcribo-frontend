import type { TaskStatus } from "~/types/task";
import { verboseFetch } from "../../utils/verboseFetch";

export default defineEventHandler(async (event) => {
    const config = useRuntimeConfig();

    const inputFormData = await readFormData(event);
    const fileContent = inputFormData.get("file") as File;
    const numSpeakersRaw = inputFormData.get("num_speakers") as string;
    console.log(numSpeakersRaw);

    if (!fileContent) {
        throw createError({
            statusCode: 400,
            statusMessage: "File not provided",
        });
    }

    const formData = new FormData();
    formData.append("audio_file", fileContent, fileContent.name);

    let api_parameter = "";
    // Handle num_speakers parameter
    if (numSpeakersRaw && numSpeakersRaw !== "null") {
        const numSpeakers = Number.parseInt(numSpeakersRaw, 10);
        if (
            !Number.isNaN(numSpeakers) &&
            numSpeakers >= 1 &&
            numSpeakers <= 6
        ) {
            api_parameter = `?num_speakers=${numSpeakers}`;
        }
        // If invalid value, don't include the parameter (auto detection)
    }

    // Attempt to make the API request
    const response = await verboseFetch<TaskStatus>(
        `${config.public.apiUrl}/transcribe${api_parameter}`,
        event,
        {
            method: "POST",
            body: formData,
        },
    );

    return response;
});
