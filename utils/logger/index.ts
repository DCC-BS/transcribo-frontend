import { BrowserLogger, LogLevel, LogMeta } from './BrowserLogger';

// Store loggers by name for reuse
const loggers: Record<string, BrowserLogger> = {};

/**
 * Get or create a logger with the specified name
 * @param name Logger name/category
 * @param options Optional configuration for new loggers
 * @returns A logger instance
 */
export function getLogger(name: string, options?: { level?: LogLevel; context?: LogMeta }): BrowserLogger {
    if (!loggers[name]) {
        // Create a new logger with the specified name in the context
        loggers[name] = new BrowserLogger({
            level: options?.level || 'info',
            defaultContext: {
                logger: name,
                ...options?.context
            }
        });
    }

    return loggers[name];
}

/**
 * Create a logger for a specific component
 * @param componentName Name of the component
 * @returns A logger configured for the component
 */
export function useComponentLogger(componentName: string): BrowserLogger {
    return getLogger('component', {
        context: { component: componentName }
    });
}

/**
 * Create a logger for API interactions
 * @param serviceName Name of the API/service
 * @returns A logger configured for API logging
 */
export function useApiLogger(serviceName: string): BrowserLogger {
    return getLogger('api', {
        context: { service: serviceName },
        level: 'debug'
    });
}

// Create and export a default application logger
export const logger = getLogger('app');

// Re-export the BrowserLogger class and types
export { BrowserLogger, LogLevel, LogMeta };
