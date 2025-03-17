import { H3Event } from 'h3';
import { Logger } from 'winston';
import { getWinstonLogger } from '~/services/logger/winstonLogger.server';

/**
 * Retrieves the logger from the event context or returns a new logger instance
 * 
 * @param event - The H3 event object containing the context
 * @returns A Winston Logger instance
 */
export function getEventLogger(event: H3Event): Logger {
    return event.context.logger as Logger || getWinstonLogger();
}
