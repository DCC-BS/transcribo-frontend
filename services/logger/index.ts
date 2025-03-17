import { BrowserLogger } from './BrowserLogger';
import type { LogLevel } from './BrowserLogger';
import type { ILogger } from './ILogger';

// Store loggers by name for reuse
const loggers: Record<string, BrowserLogger> = {};

/**
 * Get or create a logger with the specified name
 * @param name Logger name/category
 * @param options Optional configuration for new loggers
 * @returns A logger instance
 */
export function getBrowserLogger(name?: string, options?: { level?: LogLevel; meta: any[] }): ILogger {
    const loggername = name ?? 'default';
    if (!loggers[loggername]) {
        // Create a new logger with the specified name in the context
        loggers[loggername] = new BrowserLogger({
            level: options?.level ?? 'info',
            defaultContext: options?.meta || [],
        });
    }

    return loggers[loggername];
}

/**
 * Create a logger for a specific component
 * @param componentName Name of the component
 * @returns A logger configured for the component
 */
export function useComponentLogger(componentName: string): ILogger {
    return getBrowserLogger('component', {
        meta: [{ component: componentName }]
    });
}

/**
 * Create a logger for API interactions
 * @param serviceName Name of the API/service
 * @returns A logger configured for API logging
 */
export function useApiLogger(serviceName: string): ILogger {
    return getBrowserLogger('api', {
        meta: [{ service: serviceName }],
        level: 'debug'
    });
}

// Create and export a default application logger
export const logger = getBrowserLogger('app');

// Re-export the BrowserLogger class and types
export { type LogLevel, type ILogger };
