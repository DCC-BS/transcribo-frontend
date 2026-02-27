export default defineNuxtPlugin(async (_) => {
    const logger = useLogger();
    const { cleanupOldTranscriptions } = useTranscription();

    try {
        const n = await cleanupOldTranscriptions();
        logger.info(`Cleaned up ${n} old transcriptions`);
    } catch (e) {
        logger.error(e, "Failed to clean up old transcriptions");
    }
});
