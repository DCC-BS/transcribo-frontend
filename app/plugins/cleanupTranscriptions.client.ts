export default defineNuxtPlugin(async (_) => {
    const logger = useLogger();
    const { cleanupOldTranscriptions } = getTranscriptionService();
    const { cleanupOldTask } = useTasks();

    try {
        const nTranscriptions = await cleanupOldTranscriptions();
        const nTasks = await cleanupOldTask();

        if (nTranscriptions > 0) {
            logger.info(`Cleaned up ${nTranscriptions} old transcriptions`);
        }
        if (nTasks > 0) {
            logger.info(`Cleaned up ${nTasks} old tasks`);
        }
    } catch (e) {
        logger.error(e, "Failed to clean up old transcriptions");
    }
});
