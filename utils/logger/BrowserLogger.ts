/**
 * Custom Logger implementation that emulates Winston's API for browser environments
 */

// Define log levels with their priorities
export const logLevels = {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    verbose: 4,
    debug: 5,
    silly: 6
};

// Define log level colors for console output
const levelColors = {
    error: 'color: #FF0000',  // Red
    warn: 'color: #FFA500',   // Orange
    info: 'color: #0000FF',   // Blue
    http: 'color: #008080',   // Teal
    verbose: 'color: #800080', // Purple
    debug: 'color: #808080',  // Gray
    silly: 'color: #008000'   // Green
};

// Types for logger functions
export type LogLevel = keyof typeof logLevels;
export type LogFunction = (message: string, context?: Record<string, unknown>) => void;
export type LogMeta = Record<string, unknown>;

/**
 * Browser-compatible logger class that supports structured logging
 * with a Winston-like API
 */
export class BrowserLogger {
    private level: LogLevel;
    private defaultContext: LogMeta;

    /**
     * Creates a new browser-compatible logger instance
     * @param options Configuration options for the logger
     */
    constructor(options?: { level?: LogLevel; defaultContext?: LogMeta }) {
        this.level = options?.level || 'info';
        this.defaultContext = options?.defaultContext || {};
    }

    /**
     * Checks if the specified log level should be logged based on the current logger level
     * @param level The log level to check
     * @returns True if the level should be logged, false otherwise
     */
    private isLevelEnabled(level: LogLevel): boolean {
        return logLevels[level] <= logLevels[this.level];
    }

    /**
     * Creates a formatted message with timestamp
     * @param level Log level
     * @param message Message content
     * @param context Additional context data
     * @returns Formatted log objects for console output
     */
    private formatLog(level: LogLevel, message: string, context?: LogMeta): [string, Record<string, unknown>] {
        const timestamp = new Date().toISOString();
        const combinedContext = { ...this.defaultContext, ...context };

        // Create the formatted message part
        const formattedMessage = `[${timestamp}] [${level.toUpperCase()}]: ${message}`;

        return [formattedMessage, combinedContext];
    }

    /**
     * Log a message with the specified level
     * @param level Log level
     * @param message Message content
     * @param context Additional context data
     */
    public log(level: LogLevel, message: string, context?: LogMeta): void {
        if (!this.isLevelEnabled(level)) {
            return;
        }

        const [formattedMessage, combinedContext] = this.formatLog(level, message, context);

        // Empty context should not be logged
        const hasContext = Object.keys(combinedContext).length > 0;

        switch (level) {
            case 'error':
                hasContext ? console.error(
                    `%c${formattedMessage}`,
                    levelColors.error,
                    combinedContext
                ) : console.error(`%c${formattedMessage}`, levelColors.error);
                break;
            case 'warn':
                hasContext ? console.warn(
                    `%c${formattedMessage}`,
                    levelColors.warn,
                    combinedContext
                ) : console.warn(`%c${formattedMessage}`, levelColors.warn);
                break;
            default:
                hasContext ? console.log(
                    `%c${formattedMessage}`,
                    levelColors[level],
                    combinedContext
                ) : console.log(`%c${formattedMessage}`, levelColors[level]);
        }
    }

    // Convenience methods for different log levels
    public error(message: string, context?: LogMeta): void {
        this.log('error', message, context);
    }

    public warn(message: string, context?: LogMeta): void {
        this.log('warn', message, context);
    }

    public info(message: string, context?: LogMeta): void {
        this.log('info', message, context);
    }

    public http(message: string, context?: LogMeta): void {
        this.log('http', message, context);
    }

    public verbose(message: string, context?: LogMeta): void {
        this.log('verbose', message, context);
    }

    public debug(message: string, context?: LogMeta): void {
        this.log('debug', message, context);
    }

    public silly(message: string, context?: LogMeta): void {
        this.log('silly', message, context);
    }

    /**
     * Set the logging level for this logger instance
     * @param level New log level
     */
    public setLevel(level: LogLevel): void {
        this.level = level;
    }

    /**
     * Add persistent context data to all logs from this logger
     * @param context Context object to merge with all logs
     * @returns The logger instance for chaining
     */
    public addContext(context: LogMeta): BrowserLogger {
        this.defaultContext = { ...this.defaultContext, ...context };
        return this;
    }

    /**
     * Create a child logger with additional default context
     * @param childContext Additional context for the child logger
     * @returns A new logger instance with combined context
     */
    public child(childContext: LogMeta): BrowserLogger {
        return new BrowserLogger({
            level: this.level,
            defaultContext: { ...this.defaultContext, ...childContext }
        });
    }
}
