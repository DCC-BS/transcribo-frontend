import { verboseFetch } from '~/server/utils/verboseFetch';
import type { TranscriptionResponse } from '~/types/transcriptionResponse';

export default defineEventHandler(async (event) => {
    const config = useRuntimeConfig();
    const taskId = getRouterParam(event, 'task_id');

    return verboseFetch<TranscriptionResponse>(
        `${config.public.apiUrl}/task/${taskId}/result`,
        event
    );
});
