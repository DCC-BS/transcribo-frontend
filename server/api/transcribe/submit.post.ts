import { verboseFetch } from "~/server/utils/verboseFetch";
import type { TaskStatus } from "~/types/task";

export default defineEventHandler(async (event) => {
    const config = useRuntimeConfig();

    const inputFormData = await readFormData(event);
    const fileContent = inputFormData.get("file") as File;

    if (!fileContent) {
        throw createError({
            statusCode: 400,
            statusMessage: "File not provided",
        });
    }

    const formData = new FormData();
    formData.append("audio_file", fileContent, fileContent.name);

    // Attempt to make the API request
    const response = await verboseFetch<TaskStatus>(
        `${config.public.apiUrl}/transcribe`,
        event,
        {
            method: "POST",
            body: formData,
        },
    );

    return response;
});
