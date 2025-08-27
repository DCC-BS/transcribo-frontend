import type { TranscriptionResponse } from "~/types/transcriptionResponse";
import { verboseFetch } from "../../../utils/verboseFetch";

export default defineEventHandler(async (event) => {
    const config = useRuntimeConfig();
    const taskId = getRouterParam(event, "task_id");

    try {
        return await verboseFetch<TranscriptionResponse>(
            `${config.apiUrl}/task/${taskId}/result`,
            event,
        );
    } catch (error: unknown) {
        // Handle 404 errors gracefully - task not found on backend
        if (
            error &&
            typeof error === "object" &&
            "statusCode" in error &&
            error.statusCode === 404
        ) {
            throw createError({
                statusCode: 404,
                statusMessage:
                    "Task not found - may have been removed after backend restart",
            });
        }
        // Re-throw other errors
        throw error;
    }
});
