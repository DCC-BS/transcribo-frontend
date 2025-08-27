import type { TaskStatus } from "~/types/task";
import { verboseFetch } from "../../../utils/verboseFetch";

export default defineEventHandler(async (event) => {
    const config = useRuntimeConfig();
    const taskId = getRouterParam(event, "task_id");

    try {
        return await verboseFetch<TaskStatus>(
            `${config.apiUrl}/task/${taskId}/status`,
            event,
            {
                method: "GET",
            },
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
