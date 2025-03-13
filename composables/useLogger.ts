import { Logger } from 'winston'

/**
 * Composable to access the Winston logger throughout the application
 * 
 * @returns The Winston logger instance
 */
export function useLogger(): Logger {
    // Access the logger from the plugin
    const nuxtApp = useNuxtApp();

    // Check if logger exists, which should be provided by the winston.server.ts plugin
    if (!nuxtApp.$logger) {
        throw new Error('Logger not available. Make sure the winston plugin is properly initialized.')
    }

    return nuxtApp.$logger as Logger;
}
