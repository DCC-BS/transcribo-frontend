export default defineEventHandler(async (event) => {
    const config = useRuntimeConfig();
    const taskId = getRouterParam(event, 'task_id');

    return $fetch(`${config.public.apiUrl}/task/${taskId}/result`);
});