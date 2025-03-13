import path from 'path';
import { createLogger, format, transports } from 'winston';
import * as Transport from 'winston-transport';
const { combine, timestamp, logstash, simple } = format;
const { Console, File } = transports;

export function getNewLogger() {
    const isServer = import.meta.server;

    return process.env.NODE_ENV === 'production'
        ? getProductionLogger(isServer)
        : getDevelopmentLogger(isServer);
}

export function getProductionLogger(isServer = false) {

    const transports: Transport[] = [];

    if (isServer) {

        transports.push(new Console());

        transports.push(new File({
            filename: '/var/log/combined.log',
            maxsize: 1000000, // in bytes (1MB)
            maxFiles: 5,
        }));

        transports.push(new File({
            filename: '/var/log/error.log',
            level: 'error',
            maxsize: 1000000, // in bytes (1MB)
            maxFiles: 5,
        }));
    } else {
        transports.push(new BrowserConsole());
    }

    return createLogger({
        level: 'info',
        format: combine(
            timestamp(),
            logstash()
        ),
        transports: transports,
    });
}

export function getDevelopmentLogger(isServer = false) {
    const logDir = path.resolve(process.cwd(), './logs');

    const transports: Transport[] = [];

    if (isServer) {
        transports.push(new Console());

        transports.push(new File({
            filename: path.join(logDir, 'combined.log'),
            maxsize: 1000000, // in bytes (1MB)
            maxFiles: 1,
        }));

        transports.push(new File({
            filename: path.join(logDir, 'error.log'),
            level: 'error',
            maxsize: 1000000, // in bytes (1MB)
            maxFiles: 1,
        }));
    } else {
        transports.push(new BrowserConsole());
    }

    return createLogger({
        level: 'info',
        format: combine(
            simple(),
        ),
        transports: transports,
    });
}