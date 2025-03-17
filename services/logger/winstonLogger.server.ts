import { createLogger, format, transports } from 'winston';
import * as Transport from 'winston-transport';
import { type ILogger } from './ILogger';
const { combine, timestamp, logstash, simple } = format;
const { Console, File } = transports;
import path from 'path';

export function getWinstonLogger(): ILogger {
    return process.env.NODE_ENV === 'production'
        ? getProductionLogger()
        : getDevelopmentLogger();
}

export function getProductionLogger(): ILogger {
    // This function is only called on the server side
    const transports: Transport[] = [
        new Console(),
        new File({
            filename: '/var/log/combined.log',
            maxsize: 1000000, // in bytes (1MB)
            maxFiles: 5,
        }),
        new File({
            filename: '/var/log/error.log',
            level: 'error',
            maxsize: 1000000, // in bytes (1MB)
            maxFiles: 5,
        }),
    ];

    return createLogger({
        level: 'info',
        format: combine(
            timestamp(),
            logstash()
        ),
        transports: transports,
    }) as unknown as ILogger;
}

export function getDevelopmentLogger(): ILogger {
    // This should only run on the server side
    if (!path || !import.meta.server) {
        throw new Error('Path module is not available on client side');
    }

    const logDir = path.resolve(process.cwd(), './logs');

    const transports: Transport[] = [
        new Console(),
        new File({
            filename: path.join(logDir, 'combined.log'),
            maxsize: 1000000, // in bytes (1MB)
            maxFiles: 1,
        }),
        new File({
            filename: path.join(logDir, 'error.log'),
            level: 'error',
            maxsize: 1000000, // in bytes (1MB)
            maxFiles: 1,
        }),
    ];

    return createLogger({
        level: 'info',
        format: combine(
            simple(),
        ),
        transports: transports,
    }) as unknown as ILogger;
}