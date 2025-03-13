import { H3Event } from 'h3';
import { getEventLogger } from '~/server/utils/eventLogger';

const logAllRequest = false;

/**
 * Server middleware that logs information about incoming requests
 * Logs all requests in development mode, but only failed requests in production
 * 
 * @param event - The H3 event object containing request information
 */
export default defineEventHandler(async (event: H3Event): Promise<void> => {
    // Get the runtime config to check environment
    const config = useRuntimeConfig();
    const isDev = config.public.environment === 'development' || process.dev;

    // Extract useful information from the request
    const method = event.node.req.method;
    const url = event.node.req.url;
    const remoteAddress = event.node.req.socket.remoteAddress;
    const userAgent = getRequestHeader(event, 'user-agent');

    // Get logger instance using the utility function
    const logger = getEventLogger(event);

    // Create request info object
    const requestInfo = {
        method,
        url,
        remoteAddress,
        userAgent,
        timestamp: new Date().toISOString(),
    };

    // In development mode, log all requests immediately
    if (isDev && logAllRequest) {
        logger.info('Incoming request', requestInfo);
        return;
    }

    // In production, only log failed requests
    // Add hook to log after the response is processed
    event.node.res.on('finish', () => {
        const statusCode = event.node.res.statusCode;

        // Log only 4xx and 5xx responses
        if (statusCode >= 400) {
            logger.error(`Failed request (${statusCode})`, {
                ...requestInfo,
                statusCode,
            });
        }
    });
});
