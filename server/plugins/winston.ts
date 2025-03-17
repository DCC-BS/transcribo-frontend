import { getWinstonLogger } from "~/services/logger/winstonLogger.server";

export default defineNitroPlugin((nitroApp) => {
    // Import the logger function from the utils folder
    const logger = getWinstonLogger();

    // Provide the logger to the application
    nitroApp.hooks.hook('error', (error) => {
        logger.error('An error occurred:', error);
    });

    // Expose the variable to the Nitro context
    nitroApp.hooks.hook('request', (event) => {
        event.context.logger = logger;
    });

    // Log a message to indicate that the logger is ready
    logger.info('Winston logger initialized');
});
