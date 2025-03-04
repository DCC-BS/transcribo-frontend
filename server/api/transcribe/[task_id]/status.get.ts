import { verboseFetch } from '~/server/utils/verboseFetch';
import type { TaskStatus } from '~/types/task';

export default defineEventHandler(async (event) => {
    const config = useRuntimeConfig();
    const taskId = getRouterParam(event, 'task_id');

    return verboseFetch<TaskStatus>(
        `${config.public.apiUrl}/task/${taskId}/status`,
        {
            method: 'GET',
        },
    );
});
