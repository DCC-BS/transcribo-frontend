import type { TaskStatus } from "~/types/task";
import { verboseFetch } from "../../../utils/verboseFetch";

export default defineEventHandler(async (event) => {
    const config = useRuntimeConfig();
    const taskId = getRouterParam(event, "task_id");

    return verboseFetch<TaskStatus>(
        `${config.apiUrl}/task/${taskId}/status`,
        event,
        {
            method: "GET",
        },
    );
});
